import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PHASES, stepStatus } from '@/shared/phases';
import type { Phase } from '@/shared/types';

export function PhaseStepper({ phase, busy }: { phase: Phase | undefined; busy: boolean }) {
  return (
    <nav className="flex w-72 shrink-0 flex-col gap-1 border-r border-border bg-card/40 p-4">
      <h2 className="px-2 pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Phases
      </h2>
      <ol className="flex flex-col gap-1">
        {PHASES.map((p, i) => {
          const status = stepStatus(phase, i);
          return (
            <li
              key={p.id}
              className={cn(
                'flex gap-3 rounded-lg p-3 transition',
                status === 'active' && 'bg-primary/10 ring-1 ring-primary/30',
                status === 'done' && 'opacity-90',
                status === 'todo' && 'opacity-55',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold',
                  status === 'done' && 'bg-success/20 text-success',
                  status === 'active' && 'bg-primary/20 text-primary',
                  status === 'todo' && 'bg-muted text-muted-foreground',
                )}
              >
                {status === 'done' ? (
                  <Check className="size-3.5" />
                ) : status === 'active' && busy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  i + 1
                )}
              </span>
              <div className="min-w-0">
                <p className={cn('text-sm font-medium', status === 'active' && 'text-primary')}>
                  {p.label}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{p.blurb}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
