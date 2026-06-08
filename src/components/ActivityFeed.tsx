import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Terminal,
  Wrench,
  Sparkles,
  AlertTriangle,
  CircleCheck,
  User,
  Zap,
} from 'lucide-react';
import { Markdown } from '@/components/Markdown';
import type { FeedItem } from '@/hooks/useWizard';

function ToolLine({ name, skill }: { name: string; skill?: string }) {
  const label = skill ? `skill: ${skill}` : name;
  const Icon = skill ? Sparkles : name === 'Bash' ? Terminal : Wrench;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
      <Icon className="size-3" />
      {label}
    </span>
  );
}

/** An auto-approved grading write (a sub-agent landed a score) — show which rubric. */
function GradingWriteLine({ gradingPath }: { gradingPath: string }) {
  const parts = gradingPath.split(/[\\/]/);
  const parent = parts[parts.length - 2] ?? '';
  const label = /^\d/.test(parent) ? parent : parts[parts.length - 1];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-success/10 px-2 py-0.5 font-mono text-[11px] text-success">
      <CircleCheck className="size-3" />
      score written · {label}
    </span>
  );
}

export function ActivityFeed({ feed }: { feed: FeedItem[] }) {
  const [open, setOpen] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: 'end' });
  }, [feed, open]);

  return (
    <section className="flex max-h-72 flex-col border-t border-border bg-card/30">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        Live activity
        <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px]">{feed.length}</span>
      </button>
      {open && (
        <div className="overflow-y-auto px-4 pb-3 text-[13px] leading-relaxed">
          {feed.map(({ id, event }) => {
            switch (event.kind) {
              case 'text':
                return (
                  <div key={id} className="py-0.5 text-foreground/90">
                    <Markdown>{event.text}</Markdown>
                  </div>
                );
              case 'tool':
                return (
                  <div key={id} className="py-0.5">
                    {event.gradingPath ? (
                      <GradingWriteLine gradingPath={event.gradingPath} />
                    ) : (
                      <ToolLine name={event.name} skill={event.skill} />
                    )}
                  </div>
                );
              case 'user':
                return (
                  <div key={id} className="my-1 flex items-start gap-2 rounded-lg bg-primary/10 px-2.5 py-1.5">
                    {event.interrupt ? (
                      <Zap className="mt-0.5 size-3.5 shrink-0 text-warning" />
                    ) : (
                      <User className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    )}
                    <span className="text-foreground/90">{event.text}</span>
                  </div>
                );
              case 'result':
                return <div key={id} className="my-1.5 border-t border-dashed border-border/60" />;
              case 'system':
                return (
                  <p key={id} className="py-0.5 font-mono text-[11px] text-muted-foreground">
                    engine ready · {event.model}
                  </p>
                );
              case 'error':
                return (
                  <p key={id} className="flex items-center gap-1.5 py-0.5 text-destructive">
                    <AlertTriangle className="size-3.5" /> {event.message}
                  </p>
                );
              default:
                return null;
            }
          })}
          <div ref={endRef} />
        </div>
      )}
    </section>
  );
}
