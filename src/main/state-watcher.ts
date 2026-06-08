import fs from 'node:fs';
import path from 'node:path';
import type { FairscapeState } from '../shared/types';

const STATE_FILE = '.fairscape-state.json';

/**
 * Watches <dir>/.fairscape-state.json — the wizard's authoritative phase signal —
 * and emits the parsed state on every change (debounced past mid-write reads).
 */
export class StateWatcher {
  private watcher: fs.FSWatcher | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly dir: string,
    private readonly onChange: (state: FairscapeState) => void,
  ) {}

  start(): void {
    this.emitIfPresent();
    try {
      this.watcher = fs.watch(this.dir, (_event, filename) => {
        if (filename === STATE_FILE) this.debouncedEmit();
      });
    } catch {
      /* directory may not exist yet; startWizard creates it */
    }
  }

  private debouncedEmit(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.emitIfPresent(), 120);
  }

  private emitIfPresent(): void {
    try {
      const raw = fs.readFileSync(path.join(this.dir, STATE_FILE), 'utf8');
      this.onChange(JSON.parse(raw) as FairscapeState);
    } catch {
      /* missing or mid-write — ignore */
    }
  }

  stop(): void {
    this.watcher?.close();
    this.watcher = null;
    if (this.timer) clearTimeout(this.timer);
  }
}
