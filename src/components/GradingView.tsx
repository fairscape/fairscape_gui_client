import { useState } from 'react';
import { ArrowLeft, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AggregatedScore, CriterionScore, RubricScore } from '@/shared/types';

const TIER = {
  2: { label: 'Substantive', text: 'text-success', bg: 'bg-success/15', ring: 'ring-success/30', dot: 'bg-success' },
  1: { label: 'Partial', text: 'text-warning', bg: 'bg-warning/15', ring: 'ring-warning/30', dot: 'bg-warning' },
  0: { label: 'Absent', text: 'text-destructive', bg: 'bg-destructive/15', ring: 'ring-destructive/30', dot: 'bg-destructive' },
} as const;

function tier(score: number | null) {
  return TIER[(score ?? 0) as 0 | 1 | 2] ?? TIER[0];
}

function titleCase(slug?: string) {
  if (!slug) return '';
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function GradingView({
  score,
  onBack,
  onOpenDatasheet,
}: {
  score: AggregatedScore;
  onBack: () => void;
  onOpenDatasheet: () => void;
}) {
  return (
    <div className="h-full overflow-y-auto">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1f2a44] to-[#2c3e50] px-8 py-7 text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium hover:bg-white/20"
          >
            <ArrowLeft className="size-4" /> Back to wizard
          </button>
          <button
            onClick={onOpenDatasheet}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium hover:bg-white/20"
          >
            <FileText className="size-4" /> Open datasheet
          </button>
        </div>
        <div className="mx-auto mt-5 max-w-4xl">
          <h1 className="text-lg font-semibold">AI-Ready Rubric Score</h1>
          <div className="mt-4 flex flex-wrap items-end gap-8">
            <div>
              <div className="text-5xl font-bold leading-none">
                {score.total_score}
                <span className="text-2xl font-medium text-white/60"> / {score.max_score}</span>
              </div>
              <div className="mt-1.5 text-sm text-white/70">{score.percentage}% of ceiling</div>
            </div>
            <div className="min-w-64 flex-1">
              <div className="h-2.5 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-300 to-emerald-400"
                  style={{ width: `${score.percentage}%` }} />
              </div>
              <div className="mt-2.5 flex gap-4 text-xs text-white/70">
                <Legend dot="bg-emerald-400" label="Substantive" n={score.counts.substantive} />
                <Legend dot="bg-amber-300" label="Partial" n={score.counts.partial} />
                <Legend dot="bg-red-400" label="Absent" n={score.counts.absent} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-8 py-7">
        {/* Criterion overview cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {score.criteria.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-medium">{c.name}</p>
              <p className="mt-1 text-2xl font-semibold">
                {c.score}
                <span className="text-sm font-normal text-muted-foreground"> / {c.max}</span>
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(c.score / c.max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Detailed criterion sections */}
        <div className="mt-8 space-y-7">
          {score.criteria.map((c) => (
            <CriterionSection key={c.id} criterion={c} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Legend({ dot, label, n }: { dot: string; label: string; n: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('size-2 rounded-full', dot)} />
      <b className="font-semibold text-white">{n}</b> {label}
    </span>
  );
}

function CriterionSection({ criterion }: { criterion: CriterionScore }) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-base font-semibold">{criterion.name}</h2>
        <span className="text-sm text-muted-foreground">
          {criterion.score} / {criterion.max}
        </span>
      </div>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {criterion.rubrics.map((r) => (
          <RubricRow key={r.id} rubric={r} />
        ))}
      </div>
    </section>
  );
}

function RubricRow({ rubric }: { rubric: RubricScore }) {
  const [open, setOpen] = useState(false);
  const t = tier(rubric.score);
  const hasDetail = (rubric.evidence?.length ?? 0) > 0 || (rubric.gaps?.length ?? 0) > 0;

  return (
    <div className="bg-card">
      <button
        onClick={() => hasDetail && setOpen((o) => !o)}
        className={cn('flex w-full items-start gap-3 p-4 text-left', hasDetail && 'hover:bg-accent/40')}
      >
        <span className={cn('mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg text-sm font-bold ring-1', t.bg, t.text, t.ring)}>
          {rubric.score ?? '–'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{rubric.id}</span>
            <span className="text-sm font-medium">{titleCase(rubric.slug)}</span>
            <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', t.bg, t.text)}>{t.label}</span>
          </div>
          {rubric.rationale && (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{rubric.rationale}</p>
          )}
        </div>
        {hasDetail && (
          <span className="mt-1 text-muted-foreground">
            {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </span>
        )}
      </button>
      {open && (
        <div className="space-y-3 border-t border-border bg-muted/30 px-4 py-3 pl-14">
          {!!rubric.evidence?.length && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Evidence</p>
              <ul className="mt-1.5 space-y-1">
                {rubric.evidence.map((e, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground/90">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground" />
                    <span className="font-mono text-[12px] leading-relaxed">{e}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!!rubric.gaps?.length && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-destructive">Gaps to raise the score</p>
              <ul className="mt-1.5 space-y-1">
                {rubric.gaps.map((g, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground/90">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-destructive" />
                    <span className="leading-relaxed">{g}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
