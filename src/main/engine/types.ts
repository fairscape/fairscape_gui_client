import type { PermissionDecision } from '../../shared/types';

/** How an engine streams activity / questions / permission prompts to the renderer. */
export type PostFn = (kind: 'agent' | 'question' | 'permission', payload: unknown) => void;

/**
 * One run of the RO-Crate wizard, driven by a pluggable agent engine (Claude Agent SDK
 * or OpenCode). The IPC layer (ipc.ts) talks only to this interface, so engines are
 * interchangeable. Both implementations bridge their native streams onto the same
 * AgentEvent / WizardQuestion / PermissionRequest contract in ../../shared/types.
 */
export interface AgentEngine {
  start(): Promise<void>;
  answerQuestion(id: string, answers: Record<string, string | string[]>): void;
  respondPermission(id: string, decision: PermissionDecision): void;
  answerText(text: string): void;
  interrupt(text: string): Promise<void>;
  setAutoApprove(on: boolean): void;
  stop(): void;
}
