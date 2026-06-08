import path from 'node:path';
import fs from 'node:fs';
import { skillsSourceDir } from './config';

/**
 * Make the wizard skills discoverable as PROJECT skills inside `dir`
 * (validated approach: <dir>/.claude/skills + settingSources:['project']).
 * Non-destructive: if the project already has a .claude/skills, leave it.
 */
export function ensureProjectSkills(dir: string): void {
  const src = skillsSourceDir();
  const claudeDir = path.join(dir, '.claude');
  const link = path.join(claudeDir, 'skills');
  if (fs.existsSync(link)) return;
  fs.mkdirSync(claudeDir, { recursive: true });
  try {
    fs.symlinkSync(src, link, 'junction');
  } catch {
    // Fallback for platforms/filesystems without symlink permission.
    fs.cpSync(src, link, { recursive: true });
  }
}
