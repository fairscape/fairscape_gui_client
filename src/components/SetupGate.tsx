import { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Download,
  RefreshCw,
  Terminal,
  ArrowRight,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InstallContext, PythonEnvStatus, SetupLogLine } from '@/shared/types';

/**
 * First-run Setup Gate. Replaces the LLM-driven preflight-check / env-setup flow with a
 * deterministic screen: it shows exactly what the wizard needs, installs it on one click
 * with streamed progress, and only lets the user through once the environment is green.
 * Setup is a scriptable operation, so none of this goes through the agent.
 */
export function SetupGate({ onReady }: { onReady: () => void }) {
  const [status, setStatus] = useState<PythonEnvStatus | null>(null);
  const [ctx, setCtx] = useState<InstallContext | null>(null);
  const [claudeLogin, setClaudeLogin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [editable, setEditable] = useState(false);
  const [log, setLog] = useState<SetupLogLine[]>([]);
  const logRef = useRef<HTMLDivElement | null>(null);

  const recheck = async () => {
    setChecking(true);
    const [s, c, login] = await Promise.all([
      window.fairscape.checkPythonEnv(),
      window.fairscape.detectInstallContext(),
      window.fairscape.checkClaudeLogin(),
    ]);
    setStatus(s);
    setCtx(c);
    setClaudeLogin(login);
    setChecking(false);
  };

  useEffect(() => {
    void recheck();
  }, []);

  // Stream install output into the log panel and keep it pinned to the bottom.
  useEffect(() => window.fairscape.onSetupLog((line) => setLog((l) => [...l, line].slice(-500))), []);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [log]);

  const hasSiblings = !!ctx && Object.keys(ctx.siblingRepos).length > 0;
  const canInstall = !!ctx?.hasSystemPython;

  async function install() {
    setInstalling(true);
    setLog([]);
    const mode = editable && hasSiblings ? 'editable' : 'pypi';
    const s = await window.fairscape.installPythonEnv(mode);
    setStatus(s);
    setInstalling(false);
    // Refresh the install context (uv/siblings don't change, but keep it honest).
    void window.fairscape.detectInstallContext().then(setCtx);
  }

  const pythonReady = !!status?.ok;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="border-b border-border bg-gradient-to-br from-[#10182b] to-[#0b0e14] px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Setting up Fairscape Studio</h1>
            <p className="text-xs text-muted-foreground">
              A one-time check of what the wizard needs. I install the rest — nothing for you to type.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-8 py-8">
        {/* Requirement checklist */}
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">Here&apos;s what the wizard needs</p>
            <button
              onClick={recheck}
              disabled={checking || installing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent disabled:opacity-40"
            >
              <RefreshCw className={cn('size-3.5', checking && 'animate-spin')} /> Re-check
            </button>
          </div>

          <ul className="divide-y divide-border">
            {/* Claude login — informational; the wizard needs it for the Claude engine. */}
            <Row
              ok={claudeLogin}
              busy={claudeLogin === null && checking}
              name="Claude Code logged in"
              detail={
                claudeLogin === false
                  ? 'Not detected — run `claude` in a terminal and /login (only for the Claude engine).'
                  : 'subscription auth'
              }
              warnOnly
            />
            {/* Python environment checks */}
            {(status?.checks ?? placeholderChecks).map((c) => (
              <Row
                key={c.name}
                ok={installing && !c.ok ? null : c.ok}
                busy={(checking && !status) || (installing && !c.ok)}
                name={c.name}
                detail={c.detail}
              />
            ))}
          </ul>

          {/* Action area */}
          <div className="mt-5 border-t border-border pt-5">
            {pythonReady ? (
              <div className="flex items-center justify-between gap-3">
                <p className="inline-flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 className="size-4" /> Environment ready.
                </p>
                <button
                  onClick={onReady}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                >
                  Continue <ArrowRight className="size-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  {canInstall ? (
                    <>
                      I&apos;ll install the missing Python packages into an isolated environment
                      {ctx?.hasUv ? ' using uv (fast)' : ''}. This can take a minute the first time.
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-warning">
                      <AlertTriangle className="size-3.5" /> No Python 3.10+ found. Install Python,
                      then Re-check.
                    </span>
                  )}
                </div>
                <button
                  onClick={install}
                  disabled={!canInstall || installing}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
                >
                  {installing ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                  {installing ? 'Installing…' : 'Install everything'}
                </button>
              </div>
            )}

            {/* Developer affordance — only when sibling repos are on disk. */}
            {hasSiblings && !pythonReady && (
              <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={editable}
                  onChange={(e) => setEditable(e.target.checked)}
                  disabled={installing}
                  className="size-3.5 accent-[var(--color-primary,#6366f1)]"
                />
                <Wrench className="size-3.5" />
                Developer: install editable from local repos (
                {Object.keys(ctx?.siblingRepos ?? {}).join(', ')})
              </label>
            )}
          </div>
        </section>

        {/* Streamed install log */}
        {(installing || log.length > 0) && (
          <section className="mt-5 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-xs text-muted-foreground">
              <Terminal className="size-3.5" /> Install log
            </div>
            <div
              ref={logRef}
              className="max-h-64 overflow-y-auto px-4 py-3 font-mono text-[11px] leading-relaxed"
            >
              {log.map((line, i) => (
                <div
                  key={i}
                  className={cn(
                    'whitespace-pre-wrap break-words',
                    line.stream === 'err' && 'text-destructive',
                    line.stream === 'info' && 'text-primary',
                    line.stream === 'out' && 'text-muted-foreground',
                  )}
                >
                  {line.text}
                </div>
              ))}
              {installing && <div className="text-muted-foreground">…</div>}
            </div>
          </section>
        )}

        {/* Escape hatch — the agent's own preflight/env-setup still exists as a fallback. */}
        {!pythonReady && (
          <button
            onClick={onReady}
            className="mt-5 text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Skip — I&apos;ll set up Python myself
          </button>
        )}
      </main>
    </div>
  );
}

/** Placeholder rows shown before the first check returns, so the layout doesn't jump. */
const placeholderChecks = [
  { name: 'Python 3.10+', ok: false, detail: 'checking…', blocker: true },
  { name: 'fairscape-cli on PATH', ok: false, detail: 'checking…', blocker: true },
  { name: 'fairscape_models', ok: false, detail: 'checking…', blocker: true },
  { name: 'fairscape_cli', ok: false, detail: 'checking…', blocker: true },
  { name: 'fairscape_wizard', ok: false, detail: 'checking…', blocker: true },
];

function Row({
  ok,
  busy,
  name,
  detail,
  warnOnly,
}: {
  /** true = pass, false = fail, null = in-progress. */
  ok: boolean | null;
  busy?: boolean;
  name: string;
  detail: string;
  /** Render a failing row as a warning rather than an error (non-blocking). */
  warnOnly?: boolean;
}) {
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 shrink-0">
        {busy || ok === null ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : ok ? (
          <CheckCircle2 className="size-4 text-success" />
        ) : warnOnly ? (
          <AlertTriangle className="size-4 text-warning" />
        ) : (
          <XCircle className="size-4 text-destructive" />
        )}
      </span>
      <span className="min-w-0">
        <span className="block text-sm">{name}</span>
        <span className="block truncate text-xs text-muted-foreground" title={detail}>
          {detail}
        </span>
      </span>
    </li>
  );
}
