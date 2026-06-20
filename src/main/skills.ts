import path from 'node:path';
import fs from 'node:fs';
import { skillsSourceDir } from './config';

/**
 * Make the wizard skills discoverable as PROJECT skills inside `dir`
 * (validated approach: <dir>/.claude/skills + settingSources:['project']).
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
  // existsSync follows symlinks: true means a real dir or a link that resolves to
  // skills — leave it (non-destructive). False can still mean a *dangling* symlink
  // is occupying the path (an older build whose skills source went missing); clear
  // it so we don't EEXIST, then (re)create a working link. rmSync(force) is a no-op
  // when nothing is there.
  if (fs.existsSync(link)) return;
  fs.rmSync(link, { recursive: true, force: true });
  fs.mkdirSync(claudeDir, { recursive: true });
  try {
    fs.symlinkSync(src, link, 'junction');
  } catch {
    // Fallback for platforms/filesystems without symlink permission.
    fs.cpSync(src, link, { recursive: true });
  }
}
