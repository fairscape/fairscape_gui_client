import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Absolute path to the wizard skills directory, or null if none is found.
 *
 * The skills are vendored into this repo under `skills/` (synced from
 * fairscape_grader/.claude/skills) so that a fresh clone *or* a packaged build
 * always ships them — no sibling repo required. In dev they resolve relative to
 * the app root; packaged builds get them from resources/ (see forge.config.ts
 * `extraResource`). Override the location with FAIRSCAPE_SKILLS_DIR.
 */
export function skillsSourceDir(): string | null {
  if (process.env.FAIRSCAPE_SKILLS_DIR) return process.env.FAIRSCAPE_SKILLS_DIR;
  const dir = app.isPackaged
    ? path.join(process.resourcesPath, 'skills')
    : path.join(app.getAppPath(), 'skills');
  return fs.existsSync(dir) ? dir : null;
}
