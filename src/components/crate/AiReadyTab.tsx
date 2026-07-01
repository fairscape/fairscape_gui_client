import { useState } from 'react';
import { Loader2, AlertTriangle, Save, Sparkles, CheckCircle2 } from 'lucide-react';
import type { Crate } from '@/shared/types';
import { Field, TextInput, TextArea } from './FormControls';

/** AI-Ready (MLCommons RAI) root fields, mirroring the remote-ai-ready-enrich skill. */
const FIELDS: { key: string; label: string; hint?: string; area?: boolean }[] = [
  { key: 'license', label: 'License', hint: 'URL of the license.' },
  { key: 'conditionsOfAccess', label: 'Conditions of access' },
  { key: 'copyrightNotice', label: 'Copyright notice' },
  { key: 'associatedPublication', label: 'Associated publication', hint: 'DOI or citation.' },
  { key: 'rai:dataCollection', label: 'Data collection', hint: 'How the data was collected.', area: true },
  { key: 'rai:dataUseCases', label: 'Recommended use cases', area: true },
  { key: 'rai:dataLimitations', label: 'Known limitations', area: true },
  { key: 'rai:dataBiases', label: 'Potential biases', area: true },
  { key: 'rai:personalSensitiveInformation', label: 'Personal / sensitive information', area: true },
  { key: 'rai:dataReleaseMaintenancePlan', label: 'Maintenance plan', area: true },
];

/** Render a root value (string, array, or {@id}) as editable text. */
function toText(v: unknown): string {
  if (v == null) return '';
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(', ');
  if (typeof v === 'object') {
    const id = (v as { '@id'?: unknown })['@id'];
    return id ? String(id) : JSON.stringify(v);
  }
  return String(v);
}

/**
 * Build-mode tab: fill the AI-Ready (MLCommons RAI) terms on the crate's root entity by
 * hand, or hand the crate off to the agent to extract them. Saving merges only the fields
 * you filled — existing values are preserved.
 */
export function AiReadyTab({
  dir,
  crate,
  onReload,
  onHandoff,
}: {
  dir: string;
  crate: Crate;
  onReload: () => void;
  onHandoff: () => void;
}) {
  const root = crate['@graph'].find((e) => String(e['@id']) === crate.rootId);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of FIELDS) init[f.key] = toText(root?.[f.key]);
    return init;
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: string, v: string) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setSaved(false);
  };

  async function save() {
    if (!crate.rootId) {
      setError('This crate has no resolvable root entity to write AI-Ready terms onto.');
      return;
    }
    setBusy(true);
    setError(null);
    const props: Record<string, unknown> = {};
    for (const f of FIELDS) {
      const v = values[f.key]?.trim();
      if (v) props[f.key] = v;
    }
    const res = await window.fairscape.setEntityProps(dir, crate.rootId, props);
    if (!res) {
      setBusy(false);
      setError('Failed to write AI-Ready terms to the crate.');
      return;
    }
    await window.fairscape.writeBuildState(dir, {
      phase: 'rai_done',
      history: { skill: 'manual-ai-ready', summary: `Set ${Object.keys(props).length} AI-Ready terms` },
    });
    setBusy(false);
    setSaved(true);
    onReload();
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl px-8 py-6">
        <h2 className="text-base font-semibold">AI-Ready terms</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Responsible-AI (MLCommons RAI) and licensing fields that the AI-Ready grader looks for.
          Fill what you know, or let the AI extract them from the paper.
        </p>

        <button
          onClick={onHandoff}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3.5 py-2 text-sm font-medium text-primary transition hover:bg-primary/10"
        >
          <Sparkles className="size-4" /> Let the AI fill these in
        </button>

        <div className="mt-6 space-y-4">
          {FIELDS.map((f) => (
            <Field key={f.key} label={f.label} hint={f.hint}>
              {f.area ? (
                <TextArea value={values[f.key] ?? ''} onChange={(v) => set(f.key, v)} />
              ) : (
                <TextInput value={values[f.key] ?? ''} onChange={(v) => set(f.key, v)} />
              )}
            </Field>
          ))}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 flex-1">{error}</span>
          </div>
        )}

        <div className="mt-6 flex items-center gap-3 border-t border-border pt-5">
          <button
            onClick={() => void save()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save AI-Ready terms
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-xs text-success">
              <CheckCircle2 className="size-3.5" /> Saved
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
