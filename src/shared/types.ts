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

/** Which agent engine drives the wizard. */
export type EngineId = 'claude' | 'opencode';

/** Selectable engines, surfaced in the settings page. */
export const ENGINES = [
  { id: 'claude', label: 'Claude (Agent SDK)' },
  { id: 'opencode', label: 'OpenCode' },
] as const;
export const DEFAULT_ENGINE: EngineId = 'claude';

/** What the user chose on the start screen — drives Phase 1 of the wizard. */
export interface WizardStart {
  /** 'local' = crate a folder on disk; 'remote' = import a published dataset. */
  mode: 'local' | 'remote';
  /** Working directory: the local project folder (local) or the crate output folder (remote). */
  dir: string;
  /** DOI or URL of the published dataset (remote only). */
  sourceRef?: string;
  /** Which engine runs the wizard. */
  engine: EngineId;
  /**
   * Model to run on. For Claude this is an alias (opus/sonnet/haiku); for OpenCode it is
   * "providerID/modelID" (e.g. "anthropic/claude-sonnet-4-5"). The OpenCode engine splits on '/'.
   */
  model: string;
}

/** Claude model aliases (passed to the Agent SDK's options.model). */
export const MODELS = [
  { id: 'opus', label: 'Opus 4.8' },
  { id: 'sonnet', label: 'Sonnet 4.6' },
  { id: 'haiku', label: 'Haiku 4.5' },
] as const;
export const DEFAULT_MODEL = 'opus';

/** Persisted app settings (userData/config.json). API keys live encrypted, separately. */
export interface StudioConfig {
  engine: EngineId;
  claude: { model: string };
  opencode: {
    /** OpenCode provider id, e.g. "anthropic", "openai", "google". */
    providerID: string;
    /** OpenCode model id within the provider, e.g. "claude-sonnet-4-5". */
    modelID: string;
    /** Port to run the embedded `opencode serve` on. */
    port?: number;
    /** Provider ids that currently have a saved (encrypted) API key — for UI hints only. */
    savedKeys?: string[];
  };
}

export const DEFAULT_OPENCODE_PORT = 4096;

export const DEFAULT_STUDIO_CONFIG: StudioConfig = {
  engine: DEFAULT_ENGINE,
  claude: { model: DEFAULT_MODEL },
  opencode: { providerID: 'anthropic', modelID: '', port: DEFAULT_OPENCODE_PORT, savedKeys: [] },
};

/** The model string to run on, derived from the active engine in StudioConfig. */
export function studioRunModel(config: StudioConfig): string {
  return config.engine === 'opencode'
    ? `${config.opencode.providerID}/${config.opencode.modelID}`
    : config.claude.model;
}

/** A provider + its models, as reported by OpenCode's `/provider` endpoint. */
export interface OpencodeProviderInfo {
  id: string;
  name: string;
  /** Env var names that satisfy this provider's auth (shown as a hint). */
  env: string[];
  models: { id: string; name: string }[];
}
export interface OpencodeProviders {
  providers: OpencodeProviderInfo[];
  /** providerID -> default modelID. */
  defaults: Record<string, string>;
  /** providerIDs the running server already has credentials for. */
  connected: string[];
}

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
  /** Read persisted settings (engine, models, saved-key hints). */
  getConfig(): Promise<StudioConfig>;
  /** Persist settings (does not include API keys — use saveOpencodeKey). */
  saveConfig(config: StudioConfig): Promise<void>;
  /** Store/clear an OpenCode provider API key (encrypted on disk). Empty string clears it. */
  saveOpencodeKey(providerID: string, key: string): Promise<void>;
  /** Whether the user is logged into Claude Code (subscription auth). */
  checkClaudeLogin(): Promise<boolean>;
  /** Start a short-lived `opencode serve`, push saved keys, and list providers/models. */
  listOpencodeModels(opts?: { port?: number }): Promise<OpencodeProviders>;
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
  getConfig: 'config:get',
  saveConfig: 'config:save',
  saveOpencodeKey: 'config:saveOpencodeKey',
  checkClaudeLogin: 'auth:checkClaude',
  listOpencodeModels: 'opencode:listModels',
  // main -> renderer events
  agentEvent: 'agent:event',
  stateChange: 'state:change',
  question: 'wizard:question',
  permission: 'wizard:permissionRequest',
  gradingProgress: 'grading:progress',
} as const;
