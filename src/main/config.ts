import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Absolute path to the bundled fairscape_grader skills (`.../.claude/skills`).
 * Override with FAIRSCAPE_SKILLS_DIR. Packaged builds ship them under resources/.
 */
export function skillsSourceDir(): string {
  if (process.env.FAIRSCAPE_SKILLS_DIR) return process.env.FAIRSCAPE_SKILLS_DIR;
  if (app.isPackaged) return path.join(process.resourcesPath, 'skills');
  const candidates = [
    path.resolve(app.getAppPath(), '..', 'fairscape_grader', '.claude', 'skills'),
    '/home/oj/fairscape/fairscape_grader/.claude/skills',
  ];
  return candidates.find((c) => fs.existsSync(c)) ?? candidates[candidates.length - 1];
}
