import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WizardQuestion } from '@/shared/types';

/**
 * Renders an AskUserQuestion as option cards (the validated contract:
 * answers maps each question's text -> chosen label, or [labels] when multiSelect).
 */
export function QuestionCard({
  question,
  onAnswer,
}: {
  question: WizardQuestion;
  onAnswer: (id: string, answers: Record<string, string | string[]>) => void;
}) {
  const [picked, setPicked] = useState<Record<number, string[]>>({});

  function toggle(qi: number, label: string, multi: boolean) {
    setPicked((prev) => {
      const cur = prev[qi] ?? [];
      if (multi) {
        return { ...prev, [qi]: cur.includes(label) ? cur.filter((l) => l !== label) : [...cur, label] };
      }
      return { ...prev, [qi]: [label] };
    });
  }

  const ready = question.questions.every((_, qi) => (picked[qi]?.length ?? 0) > 0);

  function submit() {
    const answers: Record<string, string | string[]> = {};
    question.questions.forEach((q, qi) => {
      const sel = picked[qi] ?? [];
      answers[q.question] = q.multiSelect ? sel : sel[0];
    });
    onAnswer(question.id, answers);
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-5 shadow-sm">
      {question.questions.map((q, qi) => (
        <div key={qi} className={cn(qi > 0 && 'mt-6 border-t border-border pt-5')}>
          {q.header && (
            <span className="inline-block rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              {q.header}
            </span>
          )}
          <p className="mt-2 text-base font-medium">{q.question}</p>
          {q.multiSelect && (
            <p className="mt-0.5 text-xs text-muted-foreground">Select all that apply.</p>
          )}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {q.options.map((opt) => {
              const selected = (picked[qi] ?? []).includes(opt.label);
              return (
                <button
                  key={opt.label}
                  onClick={() => toggle(qi, opt.label, !!q.multiSelect)}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-3 text-left transition',
                    selected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
                      : 'border-border hover:border-primary/40 hover:bg-accent/40',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border',
                      selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
                    )}
                  >
                    {selected && <Check className="size-3" />}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{opt.label}</span>
                    {opt.description && (
                      <span className="mt-0.5 block text-xs text-muted-foreground">{opt.description}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="mt-5 flex justify-end">
        <button
          onClick={submit}
          disabled={!ready}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
