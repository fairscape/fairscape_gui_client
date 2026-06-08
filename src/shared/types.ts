// Shared IPC contract between the Electron main process (Agent SDK bridge) and
// the React renderer. No runtime electron/node imports here so both sides can use it.

/** The wizard's state-machine phase, written to .fairscape-state.json. */
export type Phase =
  | 'init'
  | 'metadata_captured'
  | 'manifest_built'
  | 'imported'
  | 'schemas_done'
  | 'rai_done'
  | 'provenance_tracked'
  | 'graded'
  | 'improved';

export interface FairscapeState {
  schema_version?: number;
  phase?: Phase;
  crate_dir?: string;
  crate_path?: string;
  source?: { kind?: string; url_or_doi?: string; project_root?: string };
  grading?: {
    summary?: { total: number; max: number; percentage: number };
    aggregated_score_path?: string;
  };
  history?: { ts: string; skill: string; summary: string }[];
  [k: string]: unknown;
}

/** Live agent activity, streamed to the renderer's activity feed. */
export type AgentEvent =
  | { kind: 'system'; model: string; apiKeySource: string; sessionId: string }
  | { kind: 'text'; text: string }
  | { kind: 'tool'; name: string; skill?: string; input: unknown; gradingPath?: string }
  | { kind: 'result'; subtype: string; text: string; numTurns?: number }
  | { kind: 'status'; status: string }
  | { kind: 'user'; text: string; interrupt?: boolean }
  | { kind: 'error'; message: string; recoverable?: boolean };

/** An AskUserQuestion call the GUI renders as option cards. */
export interface WizardQuestion {
  id: string;
  questions: {
    question: string;
    header: string;
    multiSelect?: boolean;
    options: { label: string; description?: string }[];
  }[];
}

/** A tool-permission prompt (writes / bash) the GUI must approve or deny. */
export interface PermissionRequest {
  id: string;
  toolName: string;
  title?: string;
  input: unknown;
  /** Set when the request comes from a sub-agent (SDK agentID). */
  agentID?: string;
  /** SDK's short noun-phrase label for the action (e.g. "Write file"). */
  displayName?: string;
}

export type PermissionDecision = { allow: boolean; always?: boolean };

/** Live grading progress, derived from grading/<id>-<slug>/score.json files appearing. */
export interface GradingRubricProgress {
  id: string;
  slug: string;
  score: number | null;
}
export interface GradingProgress {
  items: GradingRubricProgress[];
  total: number;
  done: number;
}

/** What the user chose on the start screen — drives Phase 1 of the wizard. */
export interface WizardStart {
  /** 'local' = crate a folder on disk; 'remote' = import a published dataset. */
  mode: 'local' | 'remote';
  /** Working directory: the local project folder (local) or the crate output folder (remote). */
  dir: string;
  /** DOI or URL of the published dataset (remote only). */
  sourceRef?: string;
  /** Claude model alias to run the wizard on. */
  model: string;
}

/** Models the user can run the wizard on (passed to the SDK's options.model). */
export const MODELS = [
  { id: 'opus', label: 'Opus 4.8' },
  { id: 'sonnet', label: 'Sonnet 4.6' },
  { id: 'haiku', label: 'Haiku 4.5' },
] as const;
export const DEFAULT_MODEL = 'opus';

/** Shape of grading/aggregated_score.json (fairscape_wizard rubric_eval._aggregate). */
export interface RubricScore {
  id: string;
  slug?: string;
  score: number | null;
  rationale?: string;
  evidence?: string[];
  gaps?: string[];
  error?: string | null;
}
export interface CriterionScore {
  id: string;
  name: string;
  score: number;
  max: number;
  rubrics: RubricScore[];
}
export interface AggregatedScore {
  model?: string;
  total_score: number;
  max_score: number;
  percentage: number;
  counts: { substantive: number; partial: number; absent: number; error: number };
  criteria: CriterionScore[];
}

/** The API exposed to the renderer via contextBridge as `window.fairscape`. */
export interface FairscapeApi {
  pickFolder(): Promise<string | null>;
  startWizard(config: WizardStart): Promise<void>;
  /** Answer an AskUserQuestion: map of question text -> chosen label(s). */
  answerQuestion(id: string, answers: Record<string, string | string[]>): Promise<void>;
  /** Answer a plain-text question (a new user turn). */
  answerText(text: string): Promise<void>;
  /** Interrupt the running turn and inject `text` as the next user turn. */
  interrupt(text: string): Promise<void>;
  respondPermission(id: string, decision: PermissionDecision): Promise<void>;
  /** Auto-approve all writes/commands for the rest of the run (skip per-tool prompts). */
  setAutoApprove(on: boolean): Promise<void>;
  getScore(dir: string): Promise<AggregatedScore | null>;
  openDatasheet(dir: string): Promise<void>;
  onAgentEvent(cb: (e: AgentEvent) => void): () => void;
  onStateChange(cb: (s: FairscapeState) => void): () => void;
  onQuestion(cb: (q: WizardQuestion) => void): () => void;
  onPermission(cb: (p: PermissionRequest) => void): () => void;
  onGradingProgress(cb: (p: GradingProgress) => void): () => void;
}

/** IPC channel names — single source of truth for both processes. */
export const CH = {
  pickFolder: 'dialog:pickFolder',
  startWizard: 'wizard:start',
  answerQuestion: 'wizard:answerQuestion',
  answerText: 'wizard:answerText',
  interrupt: 'wizard:interrupt',
  respondPermission: 'wizard:permission',
  setAutoApprove: 'wizard:autoApprove',
  getScore: 'score:get',
  openDatasheet: 'datasheet:open',
  // main -> renderer events
  agentEvent: 'agent:event',
  stateChange: 'state:change',
  question: 'wizard:question',
  permission: 'wizard:permissionRequest',
  gradingProgress: 'grading:progress',
} as const;
