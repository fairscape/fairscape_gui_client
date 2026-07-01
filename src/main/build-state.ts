// Manual-build state: the human-input flow writes the same .fairscape-state.json the AI
// wizard uses, so a manually built crate can be handed off to the agent (which reads this
// file to know what's done). Only the manual flow's renderer drives these writes — there's
// no StateWatcher running during a manual build.
import fs from 'node:fs';
import path from 'node:path';
import type { BuildStateUpdate, FairscapeState } from '../shared/types';

const STATE_FILE = '.fairscape-state.json';
const METADATA = 'ro-crate-metadata.json';

/** Merge a manual-build progress update into <dir>/.fairscape-state.json (creates it if absent). */
export function writeBuildState(dir: string, update: BuildStateUpdate): void {
  const file = path.join(dir, STATE_FILE);
  let state: FairscapeState = {};
  try {
    state = JSON.parse(fs.readFileSync(file, 'utf8')) as FairscapeState;
  } catch {
    /* fresh state */
  }
  state.schema_version ??= 1;
  state.crate_dir = dir;
  state.crate_path = path.join(dir, METADATA);
  state.source = { ...(state.source ?? {}), kind: 'local', project_root: dir };
  if (update.phase) state.phase = update.phase;
  if (update.history) {
    const history = Array.isArray(state.history) ? state.history : [];
    history.push({
      ts: new Date().toISOString(),
      skill: update.history.skill,
      summary: update.history.summary,
    });
    state.history = history;
  }
  try {
    fs.writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`);
  } catch (e) {
    console.error('[build-state] failed to write state:', e);
  }
}
