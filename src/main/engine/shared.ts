import path from 'node:path';
import type { WizardStart } from '../../shared/types';

/**
 * Read-only tools the GUI auto-approves; everything else (Bash/Write/Edit/...) prompts.
 * Used by the Claude engine's canUseTool gate. (OpenCode only emits permission events for
 * actions it already deems permission-worthy, so it doesn't consult this set.)
 */
export const SAFE_TOOLS = new Set([
  'Read', 'Glob', 'Grep', 'TodoWrite', 'Skill', 'WebFetch', 'WebSearch', 'NotebookRead', 'BashOutput',
]);

let idCounter = 0;
export const nextId = (): string => `r${++idCounter}`;

/** Seed Phase 1 with the user's start-screen choice so the wizard doesn't re-ask source kind. */
export function initialPrompt(config: WizardStart): string {
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
 * Returns the resolved target path when `filePath` is a Write/Edit inside <dir>/grading/, else null.
 * Grading writes (the parallel score.json files) are auto-allowed by both engines: we know exactly
 * where they land, and prompting for them in parallel used to stall grading.
 */
export function gradingWritePath(dir: string, filePath: unknown): string | null {
  if (typeof filePath !== 'string') return null;
  const gradingRoot = path.resolve(dir, 'grading');
  const resolved = path.resolve(dir, filePath);
  const rel = path.relative(gradingRoot, resolved);
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return resolved;
}
