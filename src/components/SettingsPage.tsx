import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2,
  KeyRound,
  PlugZap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  MODELS,
  ENGINES,
  DEFAULT_OPENCODE_PORT,
  type EngineId,
  type StudioConfig,
  type OpencodeProviderInfo,
} from '@/shared/types';

export function SettingsPage({
  config,
  onClose,
  onSaved,
}: {
  config: StudioConfig;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [engine, setEngine] = useState<EngineId>(config.engine);
  const [claudeModel, setClaudeModel] = useState(config.claude.model);
  const [providerID, setProviderID] = useState(config.opencode.providerID);
  const [modelID, setModelID] = useState(config.opencode.modelID);
  const [port, setPort] = useState(config.opencode.port ?? DEFAULT_OPENCODE_PORT);

  const [claudeLogin, setClaudeLogin] = useState<boolean | null>(null);
  const [providers, setProviders] = useState<OpencodeProviderInfo[] | null>(null);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  const [savedKeys, setSavedKeys] = useState<string[]>(config.opencode.savedKeys ?? []);
  const [keyInput, setKeyInput] = useState('');
  const [savingKey, setSavingKey] = useState(false);

  useEffect(() => {
    void window.fairscape.checkClaudeLogin().then(setClaudeLogin);
  }, []);

  async function testConnection() {
    setTesting(true);
    setTestError(null);
    try {
      const res = await window.fairscape.listOpencodeModels({ port });
      setProviders(res.providers);
      // Default the selection to whatever the server reports if nothing valid is chosen yet.
      if (!providerID && res.providers[0]) setProviderID(res.providers[0].id);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : String(err));
    } finally {
      setTesting(false);
    }
  }

  async function saveKey() {
    if (!providerID) return;
    setSavingKey(true);
    try {
      await window.fairscape.saveOpencodeKey(providerID, keyInput);
      setSavedKeys((k) => {
        const has = k.includes(providerID);
        if (keyInput && !has) return [...k, providerID];
        if (!keyInput && has) return k.filter((p) => p !== providerID);
        return k;
      });
      setKeyInput('');
    } finally {
      setSavingKey(false);
    }
  }

  async function save() {
    const next: StudioConfig = {
      engine,
      claude: { model: claudeModel },
      opencode: { providerID, modelID, port, savedKeys },
    };
    await window.fairscape.saveConfig(next);
    onSaved();
  }

  const selectedProvider = providers?.find((p) => p.id === providerID);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-[#10182b] to-[#0b0e14] px-6 py-4">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent"
        >
          <ArrowLeft className="size-3.5" /> Back
        </button>
        <h1 className="text-sm font-semibold">Settings</h1>
      </header>

      <main className="mx-auto w-full max-w-3xl px-8 py-8">
        {/* Engine */}
        <section>
          <h2 className="text-sm font-semibold">Agent engine</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Which agent runs the RO-Crate wizard. Both run the same skills.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {ENGINES.map((e) => (
              <button
                key={e.id}
                onClick={() => setEngine(e.id)}
                className={cn(
                  'flex items-start gap-3 rounded-xl border p-4 text-left transition',
                  engine === e.id
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
                    : 'border-border hover:border-primary/40 hover:bg-accent/40',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg',
                    engine === e.id ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                  )}
                >
                  <Sparkles className="size-5" />
                </span>
                <span>
                  <span className="block text-sm font-medium">{e.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {e.id === 'claude'
                      ? 'Claude Agent SDK — runs on your Claude subscription login.'
                      : 'OpenCode — any provider/model via your installed `opencode` CLI.'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Claude */}
        {engine === 'claude' && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold">Claude</h2>
            <div className="mt-2 flex items-center gap-2 text-xs">
              {claudeLogin === null ? (
                <span className="text-muted-foreground">Checking login…</span>
              ) : claudeLogin ? (
                <span className="inline-flex items-center gap-1.5 text-success">
                  <CheckCircle2 className="size-4" /> Logged in to Claude Code (subscription auth — no API key needed)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-warning">
                  <XCircle className="size-4" /> Not logged in — run <code className="mx-1">claude</code> once to sign in.
                </span>
              )}
            </div>
            <label className="mt-4 block text-sm font-medium">Model</label>
            <select
              value={claudeModel}
              onChange={(e) => setClaudeModel(e.target.value)}
              className="mt-1 rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </section>
        )}

        {/* OpenCode */}
        {engine === 'opencode' && (
          <section className="mt-8 space-y-4">
            <h2 className="text-sm font-semibold">OpenCode</h2>
            <p className="text-xs text-muted-foreground">
              Studio starts a local <code>opencode serve</code> for you — the <code>opencode</code> CLI must be
              installed and on your PATH. Enter a provider API key (or rely on your existing{' '}
              <code>opencode auth login</code>), then load the model list.
            </p>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground">Server port</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value) || DEFAULT_OPENCODE_PORT)}
                  className="mt-1 w-28 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                onClick={testConnection}
                disabled={testing}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
              >
                {testing ? <Loader2 className="size-4 animate-spin" /> : <PlugZap className="size-4" />}
                {testing ? 'Connecting…' : 'Test connection / load models'}
              </button>
            </div>
            {testError && (
              <p className="inline-flex items-center gap-1.5 text-xs text-destructive">
                <XCircle className="size-4" /> {testError}
              </p>
            )}

            {/* Provider + model */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium">Provider</label>
                {providers ? (
                  <select
                    value={providerID}
                    onChange={(e) => {
                      setProviderID(e.target.value);
                      setModelID('');
                    }}
                    className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select a provider…</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {savedKeys.includes(p.id) ? ' ✓' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={providerID}
                    onChange={(e) => setProviderID(e.target.value)}
                    placeholder="anthropic"
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium">Model</label>
                {selectedProvider ? (
                  <select
                    value={modelID}
                    onChange={(e) => setModelID(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select a model…</option>
                    {selectedProvider.models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={modelID}
                    onChange={(e) => setModelID(e.target.value)}
                    placeholder="claude-sonnet-4-5"
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                )}
              </div>
            </div>

            {/* API key */}
            <div>
              <label className="block text-sm font-medium">
                API key for <code>{providerID || 'provider'}</code>
                {providerID && savedKeys.includes(providerID) && (
                  <span className="ml-2 text-xs text-success">saved</span>
                )}
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder={
                    providerID && savedKeys.includes(providerID)
                      ? 'A key is saved — type to replace, or clear to remove'
                      : 'Paste the provider API key (stored encrypted)'
                  }
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={saveKey}
                  disabled={savingKey || !providerID}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
                >
                  {savingKey ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                  {keyInput ? 'Save key' : 'Clear key'}
                </button>
              </div>
              {selectedProvider?.env?.length ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Or set one of: {selectedProvider.env.map((v) => <code key={v} className="mr-1">{v}</code>)}
                </p>
              ) : null}
            </div>
          </section>
        )}

        {/* Save */}
        <div className="mt-8 flex justify-end gap-2 border-t border-border pt-5">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Save settings
          </button>
        </div>
      </main>
    </div>
  );
}
