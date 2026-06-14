import path from 'node:path';
import fs from 'node:fs';
import { skillsSourceDir } from './config';

/** True if anything (incl. a *dangling* symlink) exists at `p`. */
function pathExists(p: string): boolean {
  try {
    // lstatSync doesn't follow symlinks, so a dangling link counts as present
    // (existsSync follows the link and would report false, then crash the copy below).
    fs.lstatSync(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Make the wizard skills discoverable as PROJECT skills inside `dir`
 * (validated approach: <dir>/.claude/skills + settingSources:['project']).
 * Non-destructive: if the project already has a .claude/skills, leave it.
 * No-op (with a warning) when no skills source can be found, so a misconfigured
 * checkout degrades to "wizard without project skills" instead of crashing.
 */
export function ensureProjectSkills(dir: string): void {
  const src = skillsSourceDir();
  if (!src) {
    console.warn('[skills] no skills source found; wizard will run without project skills');
    return;
  }
  const claudeDir = path.join(dir, '.claude');
  const link = path.join(claudeDir, 'skills');
  if (pathExists(link)) return;
  fs.mkdirSync(claudeDir, { recursive: true });
  try {
    fs.symlinkSync(src, link, 'junction');
  } catch {
    // Fallback for platforms/filesystems without symlink permission.
    fs.cpSync(src, link, { recursive: true });
  }
}
