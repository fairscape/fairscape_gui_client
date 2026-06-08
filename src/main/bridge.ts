import path from 'node:path';
import type {
  CanUseTool,
  PermissionResult,
  SDKMessage,
  SDKUserMessage,
  Options,
} from '@anthropic-ai/claude-agent-sdk';
import type { AgentEvent, PermissionDecision, WizardStart } from '../shared/types';
import { ensureProjectSkills } from './skills';
import { stripApiKeys, classifyError } from './auth';

// ESM-only SDK loaded lazily so the CJS-built main process can use it.
type SdkModule = typeof import('@anthropic-ai/claude-agent-sdk');
let sdkPromise: Promise<SdkModule> | null = null;
const loadSdk = (): Promise<SdkModule> =>
  (sdkPromise ??= import('@anthropic-ai/claude-agent-sdk'));

// Read-only tools the GUI auto-approves; everything else (Bash/Write/Edit/...) prompts.
const SAFE_TOOLS = new Set([
  'Read', 'Glob', 'Grep', 'TodoWrite', 'Skill', 'WebFetch', 'WebSearch', 'NotebookRead', 'BashOutput',
]);

export type PostFn = (kind: 'agent' | 'question' | 'permission', payload: unknown) => void;

type IterableQuery = AsyncIterable<SDKMessage> & {
  close?: () => void;
  /** Aborts the current turn; only valid in streaming-input mode (which we use). */
  interrupt?: () => Promise<void>;
};

let idCounter = 0;
const nextId = () => `r${++idCounter}`;

/** Seed Phase 1 with the user's start-screen choice so the wizard doesn't re-ask source kind. */
function initialPrompt(config: WizardStart): string {
  if (config.mode === 'remote') {
    return (
      `/fairscape-rocrate-wizard\n\n` +
      `Context for Phase 1 (Import): the source is a PUBLISHED ONLINE dataset at:\n  ${config.sourceRef}\n` +
      `Write the RO-Crate into this output folder: ${config.dir}. ` +
      `You don't need to ask whether the source is local or remote — it's published online. ` +
      `Proceed with importing that link/DOI.`
    );
  }
  return (
    `/fairscape-rocrate-wizard\n\n` +
    `Context for Phase 1 (Import): the source is a LOCAL project folder on disk at:\n  ${config.dir}\n` +
    `Use that folder as both the data source and the crate output location. ` +
    `You don't need to ask whether the source is local or remote — it's local. ` +
    `Proceed with the local-folder import branch.`
  );
}

/**
 * Drives one run of /fairscape-rocrate-wizard via the Agent SDK and bridges its
 * I/O to the renderer: streams activity, routes AskUserQuestion to option-card
 * UI, gates tool permissions, and feeds plain-text answers back as new turns.
 */
export class WizardSession {
  private queue = new TurnQueue();
  private query: IterableQuery | null = null;
  private readonly pendingQuestions = new Map<string, (answers: Record<string, string | string[]>) => void>();
  private readonly pendingPermissions = new Map<string, (decision: PermissionDecision) => void>();
  private closed = false;
  private autoApprove = false;
  /** Resolved <dir>/grading — writes inside it (the 28 score.json files) are auto-allowed. */
  private readonly gradingRoot: string;

  constructor(
    private readonly config: WizardStart,
    private readonly post: PostFn,
    private readonly onGradingWrite?: (path: string) => void,
  ) {
    this.gradingRoot = path.resolve(config.dir, 'grading');
  }

  async start(): Promise<void> {
    stripApiKeys();
    ensureProjectSkills(this.config.dir);
    const { query } = await loadSdk();

    this.queue.push(initialPrompt(this.config));

    const options: Options = {
      cwd: this.config.dir,
      model: this.config.model,
      settingSources: ['project', 'user'],
      canUseTool: this.canUseTool,
      permissionMode: 'default',
    };

    this.query = query({ prompt: this.queue.iterable(), options }) as unknown as IterableQuery;
    void this.consume();
  }

  private readonly canUseTool: CanUseTool = async (toolName, input, opts) => {
    if (this.closed) return { behavior: 'deny', message: 'session closed' };

    if (toolName === 'AskUserQuestion') {
      const id = nextId();
      const questions = (input as { questions?: unknown[] }).questions ?? [];
      this.post('question', { id, questions });
      return new Promise<PermissionResult>((resolve) => {
        this.pendingQuestions.set(id, (answers) =>
          resolve({ behavior: 'allow', updatedInput: { questions, answers } }));
      });
    }

    if (SAFE_TOOLS.has(toolName)) return { behavior: 'allow', updatedInput: input };

    // Grading writes (score.json from the 28 parallel sub-agents) are auto-allowed:
    // we know exactly where they land, and prompting for them in parallel used to
    // stall grading. The feed + GradingChecklist track them live instead.
    const gradingPath = this.isGradingWrite(toolName, input);
    if (gradingPath) {
      this.onGradingWrite?.(gradingPath);
      this.send({ kind: 'tool', name: toolName, input, gradingPath });
      return { behavior: 'allow', updatedInput: input };
    }

    // "Auto-approve for this run" — skip per-write/command prompts.
    if (this.autoApprove) return { behavior: 'allow', updatedInput: input };

    const id = nextId();
    this.post('permission', {
      id,
      toolName,
      title: opts.title,
      input,
      agentID: opts.agentID,
      displayName: opts.displayName,
    });
    return new Promise<PermissionResult>((resolve) => {
      this.pendingPermissions.set(id, (decision) => {
        if (!decision.allow) return resolve({ behavior: 'deny', message: 'Denied by user' });
        resolve({
          behavior: 'allow',
          updatedInput: input,
          // "Always allow" applies the SDK's suggested rules so we stop asking.
          ...(decision.always && opts.suggestions ? { updatedPermissions: opts.suggestions } : {}),
        });
      });
    });
  };

  /** Returns the resolved target path when this is a Write/Edit inside <dir>/grading/, else null. */
  private isGradingWrite(toolName: string, input: unknown): string | null {
    if (toolName !== 'Write' && toolName !== 'Edit') return null;
    const fp = (input as { file_path?: unknown } | undefined)?.file_path;
    if (typeof fp !== 'string') return null;
    const resolved = path.resolve(this.config.dir, fp);
    const rel = path.relative(this.gradingRoot, resolved);
    if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) return null;
    return resolved;
  }

  private async consume(): Promise<void> {
    if (!this.query) return;
    try {
      for await (const message of this.query) this.translate(message);
    } catch (err) {
      this.send({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }

  private translate(m: SDKMessage): void {
    switch (m.type) {
      case 'system': {
        const sys = m as { subtype?: string; model?: string; apiKeySource?: string; session_id?: string };
        if (sys.subtype === 'init') {
          this.send({
            kind: 'system',
            model: sys.model ?? '',
            apiKeySource: sys.apiKeySource ?? '',
            sessionId: sys.session_id ?? '',
          });
        }
        break;
      }
      case 'assistant': {
        const am = m as unknown as { message?: { content?: Array<Record<string, unknown>> }; error?: string };
        for (const block of am.message?.content ?? []) {
          if (block.type === 'text' && typeof block.text === 'string' && block.text.trim()) {
            this.send({ kind: 'text', text: block.text });
          } else if (block.type === 'tool_use') {
            const skill =
              block.name === 'Skill'
                ? (block.input as { skill?: string } | undefined)?.skill
                : undefined;
            this.send({ kind: 'tool', name: String(block.name), skill, input: block.input });
          }
        }
        if (am.error) {
          const category = classifyError(am.error);
          this.send({ kind: 'error', message: am.error, recoverable: category === 'rate' });
        }
        break;
      }
      case 'result': {
        const r = m as { subtype?: string; result?: string; num_turns?: number };
        this.send({ kind: 'result', subtype: r.subtype ?? '', text: r.result ?? '', numTurns: r.num_turns });
        break;
      }
      default:
        break;
    }
  }

  private send(event: AgentEvent): void {
    this.post('agent', event);
  }

  answerQuestion(id: string, answers: Record<string, string | string[]>): void {
    this.pendingQuestions.get(id)?.(answers);
    this.pendingQuestions.delete(id);
  }

  respondPermission(id: string, decision: PermissionDecision): void {
    this.pendingPermissions.get(id)?.(decision);
    this.pendingPermissions.delete(id);
  }

  answerText(text: string): void {
    this.send({ kind: 'user', text });
    this.queue.push(text);
  }

  /**
   * Interrupt the running turn and inject `text` as the next user turn. Any
   * pending permission/question prompts are settled (denied) first so their
   * promises don't hang; the session itself stays alive, so the wizard picks
   * the new instruction up with full context and resumes the flow.
   */
  async interrupt(text: string): Promise<void> {
    for (const resolve of this.pendingPermissions.values()) resolve({ allow: false });
    this.pendingPermissions.clear();
    for (const resolve of this.pendingQuestions.values()) resolve({});
    this.pendingQuestions.clear();
    try {
      await this.query?.interrupt?.();
    } catch {
      /* turn already settled — text still goes out as the next turn */
    }
    this.send({ kind: 'user', text, interrupt: true });
    this.queue.push(text);
  }

  setAutoApprove(on: boolean): void {
    this.autoApprove = on;
  }

  stop(): void {
    this.closed = true;
    this.queue.end();
    try {
      this.query?.close?.();
    } catch {
      /* already closed */
    }
  }
}

/** An async queue of user turns: the wizard-start message plus later plain-text answers. */
class TurnQueue {
  private readonly items: SDKUserMessage[] = [];
  private waiting: ((result: IteratorResult<SDKUserMessage>) => void) | null = null;
  private done = false;

  push(content: string): void {
    const msg = {
      type: 'user',
      message: { role: 'user', content },
      parent_tool_use_id: null,
    } as SDKUserMessage;
    if (this.waiting) {
      this.waiting({ value: msg, done: false });
      this.waiting = null;
    } else {
      this.items.push(msg);
    }
  }

  end(): void {
    this.done = true;
    if (this.waiting) {
      this.waiting({ value: undefined as unknown as SDKUserMessage, done: true });
      this.waiting = null;
    }
  }

  iterable(): AsyncIterable<SDKUserMessage> {
    const self = this;
    return {
      [Symbol.asyncIterator]() {
        return {
          next(): Promise<IteratorResult<SDKUserMessage>> {
            if (self.items.length) return Promise.resolve({ value: self.items.shift()!, done: false });
            if (self.done) return Promise.resolve({ value: undefined as unknown as SDKUserMessage, done: true });
            return new Promise((resolve) => {
              self.waiting = resolve;
            });
          },
        };
      },
    };
  }
}
