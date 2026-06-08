import { useEffect, useRef, useState } from 'react';
import { SendHorizontal, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Always-available input docked under the activity feed. Send queues the
 * message into the running session (Claude reads it at the next pause);
 * Interrupt & send stops the current turn so Claude addresses it immediately.
 * When the wizard explicitly awaits a text answer, this is the (highlighted)
 * input that answers it — there is no second textbox in the center pane.
 */
export function Composer({
  awaitingText,
  busy,
  disabled,
  onSend,
  onInterrupt,
}: {
  awaitingText: boolean;
  busy: boolean;
  disabled: boolean;
  onSend: (t: string) => void;
  onInterrupt: (t: string) => void;
}) {
  const [value, setValue] = useState('');
  const [queued, setQueued] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (awaitingText) ref.current?.focus();
  }, [awaitingText]);

  // The queued message gets picked up when the running turn settles.
  useEffect(() => {
    if (!busy) setQueued(false);
  }, [busy]);

  function send(interrupt: boolean) {
    const t = value.trim();
    if (!t || disabled) return;
    if (interrupt) {
      onInterrupt(t);
    } else {
      if (busy && !awaitingText) setQueued(true);
      onSend(t);
    }
    setValue('');
  }

  return (
    <div className="border-t border-border bg-card/50 px-4 py-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(e.shiftKey);
          }}
          rows={awaitingText ? 2 : 1}
          disabled={disabled}
          placeholder={
            awaitingText
              ? 'Type your answer…  (⌘/Ctrl + Enter to send)'
              : 'Ask a question or guide Claude — read at the next pause…'
          }
          className={cn(
            'min-h-9 flex-1 resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50',
            awaitingText && 'ring-2 ring-ring',
          )}
        />
        <button
          onClick={() => send(false)}
          disabled={disabled || !value.trim()}
          title="Send — Claude reads it at the next pause (⌘/Ctrl+Enter)"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
        >
          <SendHorizontal className="size-4" />
          Send
        </button>
        {busy && !awaitingText && (
          <button
            onClick={() => send(true)}
            disabled={disabled || !value.trim()}
            title="Interrupt the current work and send now (⌘/Ctrl+Shift+Enter)"
            className="inline-flex items-center gap-1.5 rounded-lg border border-warning/40 px-3 py-2 text-sm font-medium text-warning transition hover:bg-warning/10 disabled:opacity-40"
          >
            <Zap className="size-4" />
            Interrupt
          </button>
        )}
      </div>
      {queued && busy && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Queued — Claude will read this at the next pause.
        </p>
      )}
    </div>
  );
}
