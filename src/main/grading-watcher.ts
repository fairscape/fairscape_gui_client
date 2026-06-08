import fs from 'node:fs';
import path from 'node:path';
import type { GradingProgress } from '../shared/types';

/**
 * Polls <dir>/grading/ during Phase 5. extract-evidence creates one
 * <id>-<slug>/ folder per rubric; agentic-rescore drops a score.json into each
 * as it finishes. We surface that as a live checklist (done / total).
 */
export class GradingWatcher {
  private timer: ReturnType<typeof setInterval> | null = null;
  private pokeTimer: ReturnType<typeof setTimeout> | null = null;
  private last = '';

  constructor(
    private readonly dir: string,
    private readonly onChange: (progress: GradingProgress) => void,
  ) {}

  start(): void {
    this.tick();
    this.timer = setInterval(() => this.tick(), 1500);
  }

  /** Re-scan soon (debounced) — called when the bridge approves a grading write. */
  poke(): void {
    if (this.pokeTimer) return;
    this.pokeTimer = setTimeout(() => {
      this.pokeTimer = null;
      this.tick();
    }, 150);
  }

  private tick(): void {
    const gradingDir = path.join(this.dir, 'grading');
    let dirents: fs.Dirent[];
    try {
      dirents = fs.readdirSync(gradingDir, { withFileTypes: true });
    } catch {
      return; // grading dir not created yet
    }

    const items = dirents
      .filter((d) => d.isDirectory() && /^\d/.test(d.name)) // rubric dirs like "0.a-findable"
      .map((d) => {
        const dash = d.name.indexOf('-');
        const id = dash === -1 ? d.name : d.name.slice(0, dash);
        const slug = dash === -1 ? '' : d.name.slice(dash + 1);
        let score: number | null = null;
        try {
          const s = JSON.parse(fs.readFileSync(path.join(gradingDir, d.name, 'score.json'), 'utf8'));
          score = typeof s.score === 'number' ? s.score : null;
        } catch {
          /* score.json not written yet */
        }
        return { id, slug, score };
      })
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

    if (!items.length) return;
    const progress: GradingProgress = {
      items,
      total: items.length,
      done: items.filter((i) => i.score !== null).length,
    };
    const sig = JSON.stringify(progress);
    if (sig !== this.last) {
      this.last = sig;
      this.onChange(progress);
    }
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.pokeTimer) clearTimeout(this.pokeTimer);
    this.pokeTimer = null;
  }
}
