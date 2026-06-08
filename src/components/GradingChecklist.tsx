import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GradingProgress } from '@/shared/types';

const TIER_TEXT: Record<number, string> = {
  2: 'text-success',
  1: 'text-warning',
  0: 'text-destructive',
};

function titleCase(slug: string) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Live "watch it check off" view during Phase 5 grading. */
export function GradingChecklist({ progress }: { progress: GradingProgress }) {
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Loader2 className="size-4 animate-spin text-primary" />
        <h3 className="text-sm font-semibold">Scoring rubrics</h3>
        <span className="ml-auto text-sm text-muted-foreground">
          {progress.done} / {progress.total}
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
        {progress.items.map((it) => {
          const done = it.score !== null;
          return (
            <li
              key={it.id}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                done ? 'bg-accent/40' : 'opacity-60',
              )}
            >
              <span
                className={cn(
                  'grid size-5 shrink-0 place-items-center rounded-full',
                  done ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground',
                )}
              >
                {done ? <Check className="size-3.5" /> : <span className="size-1.5 rounded-full bg-muted-foreground" />}
              </span>
              <span className="font-mono text-xs text-muted-foreground">{it.id}</span>
              <span className="truncate">{titleCase(it.slug)}</span>
              {done && (
                <span className={cn('ml-auto text-xs font-semibold', TIER_TEXT[it.score!])}>{it.score}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
