import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  FolderOpen,
  Sparkles,
  Loader2,
  FileText,
  BarChart3,
  HardDrive,
  Globe,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import { useWizard } from '@/hooks/useWizard';
import { PhaseStepper } from '@/components/PhaseStepper';
import { ActivityFeed } from '@/components/ActivityFeed';
import { Composer } from '@/components/Composer';
import { QuestionCard } from '@/components/QuestionCard';
import { PermissionDialog } from '@/components/PermissionDialog';
import { GradingView } from '@/components/GradingView';
import { GradingChecklist } from '@/components/GradingChecklist';
import { Markdown } from '@/components/Markdown';
import { cn } from '@/lib/utils';
import { MODELS, DEFAULT_MODEL } from '@/shared/types';
import type { WizardStart } from '@/shared/types';
import { PHASES } from '@/shared/phases';

export function App() {
  const w = useWizard();
  const [view, setView] = useState<'wizard' | 'score'>('wizard');
  const revealed = useRef(false);

  useEffect(() => {
    if (w.score && !revealed.current) {
      revealed.current = true;
      setView('score');
    }
  }, [w.score]);

  if (!w.started) return <Landing pickFolder={w.pickFolder} onStart={w.start} />;

  if (view === 'score' && w.score) {
    return (
      <GradingView
        score={w.score}
        onBack={() => setView('wizard')}
        onOpenDatasheet={() => w.folder && window.fairscape.openDatasheet(w.folder)}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Header
        folder={w.folder}
        model={w.model}
        onModelChange={w.setModel}
        autoApprove={w.autoApprove}
        onToggleAutoApprove={() => w.setAutoApprove(!w.autoApprove)}
        summary={w.state?.grading?.summary}
        onViewScore={w.score ? () => setView('score') : undefined}
        onOpenDatasheet={() => w.folder && window.fairscape.openDatasheet(w.folder)}
      />
      <div className="flex min-h-0 flex-1">
        <PhaseStepper phase={w.phase} busy={w.busy} />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
            <div className="mx-auto max-w-3xl">
              <CenterPane w={w} />
            </div>
          </main>
          <ActivityFeed feed={w.feed} />
          <Composer
            awaitingText={w.awaitingText}
            busy={w.busy}
            disabled={!!(w.permission || w.question || w.error)}
            onSend={w.answerText}
            onInterrupt={w.interrupt}
          />
        </div>
      </div>
    </div>
  );
}

function CenterPane({ w }: { w: ReturnType<typeof useWizard> }) {
  if (w.error) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5 text-sm">
        <p className="font-medium text-destructive">Something went wrong</p>
        <p className="mt-1 text-muted-foreground">{w.error}</p>
      </div>
    );
  }
  if (w.permission)
    return (
      <PermissionDialog
        permission={w.permission}
        pendingCount={w.permissionCount}
        context={w.lastText}
        onRespond={w.respondPermission}
        onAutoApprove={() => w.setAutoApprove(true)}
      />
    );
  if (w.question) return <QuestionCard question={w.question} onAnswer={w.answerQuestion} />;
  const g = w.gradingProgress;
  if (g && g.total > 0 && g.done < g.total) return <GradingChecklist progress={g} />;
  if (w.awaitingText) return <AwaitingReply prompt={w.lastText} />;
  return <Working text={w.lastText} />;
}

function Working({ text }: { text: string | null }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
        <Loader2 className="size-4 animate-spin" />
        Working…
      </div>
      {text && (
        <div className="text-foreground/90">
          <Markdown>{text}</Markdown>
        </div>
      )}
    </div>
  );
}

/** The wizard is waiting for a plain-text reply — the composer below the feed is the input. */
function AwaitingReply({ prompt }: { prompt: string | null }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      {prompt && (
        <div className="mb-3 text-foreground/90">
          <Markdown>{prompt}</Markdown>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Reply in the box below ↓</p>
    </div>
  );
}

function ModelSelect({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title="Model the wizard runs on"
      className="rounded-lg border border-border bg-card px-2 py-1 text-xs text-foreground outline-none hover:bg-accent focus:ring-1 focus:ring-ring"
    >
      {MODELS.map((m) => (
        <option key={m.id} value={m.id}>
          {m.label}
        </option>
      ))}
    </select>
  );
}

function Header({
  folder,
  model,
  onModelChange,
  autoApprove,
  onToggleAutoApprove,
  summary,
  onViewScore,
  onOpenDatasheet,
}: {
  folder: string | null;
  model: string;
  onModelChange: (m: string) => void;
  autoApprove: boolean;
  onToggleAutoApprove: () => void;
  summary?: { total: number; max: number; percentage: number };
  onViewScore?: () => void;
  onOpenDatasheet: () => void;
}) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-gradient-to-r from-[#10182b] to-[#0b0e14] px-6 py-3">
      <div className="flex items-center gap-3 truncate">
        <div className="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary">
          <Sparkles className="size-4" />
        </div>
        <div className="truncate">
          <p className="text-sm font-semibold leading-tight">Fairscape Packager</p>
          <p className="truncate text-xs text-muted-foreground" title={folder ?? ''}>
            {folder}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleAutoApprove}
          title="Auto-approve all writes & commands for this run"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition',
            autoApprove
              ? 'border-success/40 bg-success/15 text-success'
              : 'border-border text-muted-foreground hover:bg-accent',
          )}
        >
          {autoApprove ? <ShieldCheck className="size-3.5" /> : <Shield className="size-3.5" />}
          Auto-approve {autoApprove ? 'on' : 'off'}
        </button>
        {summary && (
          <button
            onClick={onViewScore}
            disabled={!onViewScore}
            className="rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success enabled:hover:bg-success/25"
          >
            Score {summary.total}/{summary.max} ({summary.percentage}%)
          </button>
        )}
        {onViewScore && (
          <button
            onClick={onViewScore}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs hover:bg-accent"
          >
            <BarChart3 className="size-3.5" /> Score
          </button>
        )}
        {summary && (
          <button
            onClick={onOpenDatasheet}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs hover:bg-accent"
          >
            <FileText className="size-3.5" /> Datasheet
          </button>
        )}
        <ModelSelect value={model} onChange={onModelChange} />
      </div>
    </header>
  );
}

function Landing({
  pickFolder,
  onStart,
}: {
  pickFolder: () => Promise<string | null>;
  onStart: (config: WizardStart) => void;
}) {
  const [mode, setMode] = useState<'local' | 'remote'>('local');
  const [dir, setDir] = useState<string | null>(null);
  const [sourceRef, setSourceRef] = useState('');
  const [model, setModel] = useState<string>(DEFAULT_MODEL);

  const ready = mode === 'local' ? !!dir : !!dir && sourceRef.trim().length > 0;

  async function choose() {
    const d = await pickFolder();
    if (d) setDir(d);
  }

  function go() {
    if (!ready || !dir) return;
    onStart({
      mode,
      dir,
      sourceRef: mode === 'remote' ? sourceRef.trim() : undefined,
      model,
    });
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="border-b border-border bg-gradient-to-br from-[#10182b] to-[#0b0e14] px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Fairscape Packager</h1>
            <p className="text-xs text-muted-foreground">
              Build &amp; grade AI-Ready RO-Crates — guided, one phase at a time.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-8 py-8">
        <h2 className="text-xl font-semibold">Start a new RO-Crate</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          An RO-Crate is a structured catalog of a dataset — its files, schemas, provenance, and
          AI-readiness metadata. Tell me where the data is and I'll build and grade it with you.
        </p>

        {/* Step 1: source kind */}
        <div className="mt-6">
          <p className="mb-2 text-sm font-medium">1 · Where is the data?</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <ModeCard
              active={mode === 'local'}
              onClick={() => setMode('local')}
              icon={<HardDrive className="size-5" />}
              title="A local folder"
              desc="A project folder on this machine that you want to turn into an RO-Crate."
            />
            <ModeCard
              active={mode === 'remote'}
              onClick={() => setMode('remote')}
              icon={<Globe className="size-5" />}
              title="A published dataset"
              desc="Already online (Dataverse, PhysioNet, Figshare, or any public DOI/link)."
            />
          </div>
        </div>

        {/* Step 2: details */}
        <div className="mt-6">
          {mode === 'remote' && (
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium">2 · DOI or link to the dataset</label>
              <input
                value={sourceRef}
                onChange={(e) => setSourceRef(e.target.value)}
                placeholder="e.g. doi:10.7910/DVN/XYZ  or  https://physionet.org/content/…"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          <label className="mb-1 block text-sm font-medium">
            {mode === 'local' ? '2 · Folder to turn into an RO-Crate' : '3 · Output folder for the RO-Crate'}
          </label>
          <p className="mb-2 text-xs text-muted-foreground">
            {mode === 'local'
              ? 'I catalog the files in this folder and write the crate (ro-crate-metadata.json) into it.'
              : 'An empty folder where I write the crate built from the link above (the data stays at the source).'}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={choose}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-sm font-medium transition hover:bg-accent"
            >
              <FolderOpen className="size-4" />
              {dir ? 'Change folder' : 'Choose folder'}
            </button>
            {dir && (
              <span className="truncate text-xs text-muted-foreground" title={dir}>
                {dir}
              </span>
            )}
          </div>
        </div>

        {/* Model + start */}
        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Run with
            <ModelSelect value={model} onChange={setModel} />
          </label>
          <button
            onClick={go}
            disabled={!ready}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
          >
            <Sparkles className="size-4" />
            Start the wizard
          </button>
        </div>

        {/* What happens next */}
        <div className="mt-8 rounded-xl border border-border bg-card/50 p-5">
          <p className="text-sm font-medium">What happens next</p>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            {PHASES.map((p, i) => (
              <li key={p.id} className="flex gap-2.5 text-sm">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                  {i + 1}
                </span>
                <span>
                  <span className="font-medium">{p.label}.</span>{' '}
                  <span className="text-muted-foreground">{p.blurb}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">
            You answer questions as you go, and approve anything that gets written or run. Phases
            3–6 are optional — you can stop after import.
          </p>
        </div>
      </main>
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4 text-left transition',
        active ? 'border-primary bg-primary/5 ring-1 ring-primary/40' : 'border-border hover:border-primary/40 hover:bg-accent/40',
      )}
    >
      <span className={cn('mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg', active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
        {icon}
      </span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{desc}</span>
      </span>
    </button>
  );
}
