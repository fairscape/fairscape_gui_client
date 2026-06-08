import path from 'node:path';
import type { OpencodeClient, Config, Event, Part, Permission } from '@opencode-ai/sdk';
import type { AgentEvent, PermissionDecision, WizardStart } from '../../shared/types';
import { DEFAULT_OPENCODE_PORT } from '../../shared/types';
import { ensureProjectSkills } from '../skills';
import { getConfig, loadOpencodeKeys } from '../settings';
import type { AgentEngine, PostFn } from './types';
import { gradingWritePath, initialPrompt } from './shared';

// ESM-only SDK loaded lazily so the CJS-built main process can use it.
type OcModule = typeof import('@opencode-ai/sdk');
let ocPromise: Promise<OcModule> | null = null;
const loadOc = (): Promise<OcModule> => (ocPromise ??= import('@opencode-ai/sdk'));

const msg = (err: unknown): string => (err instanceof Error ? err.message : String(err));

type Reply = 'once' | 'always' | 'reject';

/**
 * Drives one run of /fairscape-rocrate-wizard via OpenCode's SDK. OpenCode runs the same
 * Claude skills (loaded from <dir>/.claude/skills) and writes the same .fairscape-state.json
 * and grading/score.json files, so the rest of Studio (phase stepper, grading view, watchers)
 * is unchanged. This engine spawns an embedded `opencode serve`, subscribes to its event
 * stream, and maps its events onto the same AgentEvent / PermissionRequest contract the
 * renderer already consumes (see ../../shared/types).
 */
export class OpencodeEngine implements AgentEngine {
  private client: OpencodeClient | null = null;
  private server: { close(): void } | null = null;
  private sessionID: string | null = null;
  private readonly providerID: string;
  private readonly modelID: string;
  private readonly directory: string;
  private closed = false;
  private autoApprove = false;
  // Text parts stream incrementally; emit each once it's complete. Tools/permissions can
  // re-fire as their state changes — dedupe so the feed gets one entry per action.
  private readonly emittedText = new Set<string>();
  private readonly seenParts = new Set<string>();
  private readonly handledPermissions = new Set<string>();
  private readonly pendingPermissions = new Map<string, { sessionID: string; resolve: (d: PermissionDecision) => void }>();

  constructor(
    private readonly config: WizardStart,
    private readonly post: PostFn,
    private readonly onGradingWrite?: (path: string) => void,
  ) {
    // OpenCode models are "providerID/modelID" (e.g. "anthropic/claude-sonnet-4-5").
    const slash = config.model.indexOf('/');
    this.providerID = slash >= 0 ? config.model.slice(0, slash) : 'anthropic';
    this.modelID = slash >= 0 ? config.model.slice(slash + 1) : config.model;
    this.directory = config.dir;
  }

  async start(): Promise<void> {
    ensureProjectSkills(this.directory);
    const port = getConfig().opencode.port ?? DEFAULT_OPENCODE_PORT;
    const keys = loadOpencodeKeys();

    let createOpencode: OcModule['createOpencode'];
    try {
      ({ createOpencode } = await loadOc());
    } catch (err) {
      return this.send({ kind: 'error', message: `Failed to load the OpenCode SDK: ${msg(err)}` });
    }

    // The SDK starts the server by spawning the `opencode` CLI (opencode serve).
    const serverConfig: Config = {
      permission: { edit: 'ask', bash: 'ask', webfetch: 'allow' },
    } as Config;
    let started: { client: OpencodeClient; server: { url: string; close(): void } };
    try {
      started = await createOpencode({ hostname: '127.0.0.1', port, timeout: 20000, config: serverConfig });
    } catch (err) {
      return this.send({
        kind: 'error',
        message:
          `Could not start the OpenCode server. Is the \`opencode\` CLI installed and on your PATH? ` +
          `(${msg(err)})`,
      });
    }
    this.client = started.client;
    this.server = started.server;
    if (this.closed) return this.shutdown();

    // Push saved provider API keys so the server can reach the model. Non-fatal if it
    // fails — the user may already be authed via `opencode auth login`.
    for (const [providerID, key] of Object.entries(keys)) {
      if (!key) continue;
      try {
        await this.client.auth.set({ path: { id: providerID }, body: { type: 'api', key } });
      } catch {
        /* fall back to the server's existing auth */
      }
    }

    // Establish the event subscription *before* creating/prompting the session so no early
    // streaming events are missed.
    let stream: AsyncIterable<Event>;
    try {
      const sub = await this.client.event.subscribe();
      stream = sub.stream as AsyncIterable<Event>;
    } catch (err) {
      return this.send({ kind: 'error', message: `Could not open the OpenCode event stream: ${msg(err)}` });
    }
    void this.pump(stream);

    const created = await this.client.session.create({
      body: { title: 'fairscape-wizard' },
      query: { directory: this.directory },
    });
    if (created.error || !created.data) {
      return this.send({ kind: 'error', message: `Could not create an OpenCode session: ${JSON.stringify(created.error)}` });
    }
    this.sessionID = created.data.id;

    this.send({
      kind: 'system',
      model: `${this.providerID}/${this.modelID}`,
      apiKeySource: 'opencode',
      sessionId: this.sessionID,
    });

    void this.sendPrompt(initialPrompt(this.config));
  }

  private async pump(stream: AsyncIterable<Event>): Promise<void> {
    try {
      for await (const event of stream) {
        if (this.closed) break;
        this.translate(event);
      }
    } catch (err) {
      if (!this.closed) this.send({ kind: 'error', message: msg(err) });
    }
  }

  private translate(event: Event): void {
    switch (event.type) {
      case 'message.part.updated':
        this.onPart(event.properties.part);
        break;
      case 'permission.updated':
        this.onPermission(event.properties);
        break;
      case 'session.idle':
        // Turn boundary for the main session → the wizard is awaiting our next message.
        // Ignore sub-agent sessions so their idles don't flash "your turn".
        if (event.properties.sessionID === this.sessionID) {
          this.send({ kind: 'result', subtype: 'success', text: '' });
        }
        break;
      case 'session.error': {
        const sid = event.properties.sessionID;
        if (sid && sid !== this.sessionID) break;
        const err = event.properties.error as { name?: string; data?: { message?: string } } | undefined;
        this.send({ kind: 'error', message: err?.data?.message ?? err?.name ?? 'OpenCode session error' });
        break;
      }
      default:
        break;
    }
  }

  private onPart(part: Part): void {
    if (part.type === 'text') {
      if (part.synthetic || part.ignored || !part.time?.end) return; // wait for the block to finish
      if (this.emittedText.has(part.id)) return;
      const text = (part.text ?? '').trim();
      if (!text) return;
      this.emittedText.add(part.id);
      this.send({ kind: 'text', text });
      return;
    }
    if (part.type === 'tool') {
      if (part.state.status === 'pending' || this.seenParts.has(part.id)) return;
      this.seenParts.add(part.id);
      const input = part.state.input as Record<string, unknown> | undefined;
      const skill =
        part.tool === 'skill' || part.tool === 'Skill'
          ? (input?.name as string | undefined) ?? (input?.skill as string | undefined)
          : undefined;
      this.send({ kind: 'tool', name: part.tool, skill, input });
      return;
    }
    if (part.type === 'subtask') {
      if (this.seenParts.has(part.id)) return;
      this.seenParts.add(part.id);
      this.send({ kind: 'tool', name: 'Task', skill: part.agent, input: { description: part.description } });
    }
  }

  private onPermission(perm: Permission): void {
    if (this.closed || this.handledPermissions.has(perm.id)) return; // permission.updated can repeat
    this.handledPermissions.add(perm.id);

    // Grading writes (the parallel score.json files) are auto-allowed — same rationale as the
    // Claude engine: we know where they land and parallel prompts used to stall grading.
    const gradingPath = this.gradingPermissionPath(perm);
    if (gradingPath) {
      this.onGradingWrite?.(gradingPath);
      this.send({ kind: 'tool', name: perm.type, input: perm.metadata, gradingPath });
      void this.reply(perm.sessionID, perm.id, 'once');
      return;
    }

    if (this.autoApprove) {
      void this.reply(perm.sessionID, perm.id, 'once');
      return;
    }

    this.post('permission', {
      id: perm.id,
      toolName: perm.type,
      title: perm.title,
      input: { ...perm.metadata, pattern: perm.pattern },
    });
    this.pendingPermissions.set(perm.id, {
      sessionID: perm.sessionID,
      resolve: (d) =>
        void this.reply(perm.sessionID, perm.id, d.allow ? (d.always ? 'always' : 'once') : 'reject'),
    });
  }

  /** Best-effort: does this permission target a path inside <dir>/grading/? */
  private gradingPermissionPath(perm: Permission): string | null {
    const root = path.resolve(this.directory, 'grading');
    const candidates: unknown[] = [perm.pattern, perm.title, ...Object.values(perm.metadata ?? {})];
    for (const c of candidates) {
      if (typeof c !== 'string') continue;
      const direct = gradingWritePath(this.directory, c);
      if (direct) return direct;
      if (c.includes(root)) return root;
    }
    return null;
  }

  private async reply(sessionID: string, permissionID: string, response: Reply): Promise<void> {
    this.pendingPermissions.delete(permissionID);
    if (!this.client) return;
    try {
      await this.client.postSessionIdPermissionsPermissionId({
        path: { id: sessionID, permissionID },
        query: { directory: this.directory },
        body: { response },
      });
    } catch {
      /* permission may have expired or its session was aborted */
    }
  }

  private async sendPrompt(text: string): Promise<void> {
    if (!this.client || !this.sessionID) return;
    try {
      await this.client.session.prompt({
        path: { id: this.sessionID },
        query: { directory: this.directory },
        body: {
          model: { providerID: this.providerID, modelID: this.modelID },
          parts: [{ type: 'text', text }],
        },
      });
    } catch (err) {
      if (!this.closed) this.send({ kind: 'error', message: msg(err) });
    }
  }

  private send(event: AgentEvent): void {
    this.post('agent', event);
  }

  answerQuestion(): void {
    // OpenCode surfaces wizard questions as plain assistant text (the proven CLI path), so the
    // renderer never posts a structured question for this engine — nothing to resolve.
  }

  respondPermission(id: string, decision: PermissionDecision): void {
    this.pendingPermissions.get(id)?.resolve(decision);
  }

  answerText(text: string): void {
    this.send({ kind: 'user', text });
    void this.sendPrompt(text);
  }

  async interrupt(text: string): Promise<void> {
    for (const p of this.pendingPermissions.values()) p.resolve({ allow: false });
    this.pendingPermissions.clear();
    if (this.client && this.sessionID) {
      try {
        await this.client.session.abort({ path: { id: this.sessionID }, query: { directory: this.directory } });
      } catch {
        /* nothing was running */
      }
    }
    this.send({ kind: 'user', text, interrupt: true });
    void this.sendPrompt(text);
  }

  setAutoApprove(on: boolean): void {
    this.autoApprove = on;
  }

  stop(): void {
    this.closed = true;
    this.shutdown();
  }

  private shutdown(): void {
    for (const p of this.pendingPermissions.values()) p.resolve({ allow: false });
    this.pendingPermissions.clear();
    if (this.client && this.sessionID) {
      void this.client.session
        .abort({ path: { id: this.sessionID }, query: { directory: this.directory } })
        .catch(() => undefined);
    }
    try {
      this.server?.close();
    } catch {
      /* already stopped */
    }
    this.client = null;
    this.server = null;
  }
}
