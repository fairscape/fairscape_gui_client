import { useState } from 'react';
import { ArrowLeft, FilePlus2, Loader2, AlertTriangle } from 'lucide-react';
import type { CreateCrateMeta } from '@/shared/types';
import { Field, TextInput, TextArea } from './crate/FormControls';

const DEFAULT_LICENSE = 'https://creativecommons.org/licenses/by/4.0/';

/**
 * Manual-build start screen: capture root crate metadata and initialize the crate via
 * `fairscape-cli rocrate create`, then seed .fairscape-state.json and open the workspace
 * in build mode. The first step of the human-input local build.
 */
export function ManualInit({
  dir,
  onCreated,
  onBack,
}: {
  dir: string;
  onCreated: (dir: string) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [author, setAuthor] = useState('');
  const [license, setLicense] = useState(DEFAULT_LICENSE);
  const [version, setVersion] = useState('1.0');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready =
    name.trim() &&
    organizationName.trim() &&
    projectName.trim() &&
    description.trim() &&
    keywords.trim();

  async function submit() {
    setBusy(true);
    setError(null);
    const meta: CreateCrateMeta = {
      name: name.trim(),
      organizationName: organizationName.trim(),
      projectName: projectName.trim(),
      description: description.trim(),
      keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
      author: author.trim() || undefined,
      license: license.trim() || undefined,
      version: version.trim() || undefined,
    };
    const res = await window.fairscape.createCrate(dir, meta);
    if (!res.ok) {
      setBusy(false);
      setError(res.stderr || res.stdout || 'The CLI failed to create the crate.');
      return;
    }
    await window.fairscape.writeBuildState(dir, {
      phase: 'metadata_captured',
      history: { skill: 'manual-init', summary: `Created RO-Crate "${meta.name}"` },
    });
    setBusy(false);
    onCreated(dir);
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="border-b border-border bg-gradient-to-br from-[#10182b] to-[#0b0e14] px-8 py-6">
        <button
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent"
        >
          <ArrowLeft className="size-3.5" /> Back
        </button>
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
            <FilePlus2 className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">Create the RO-Crate</h1>
            <p className="truncate text-xs text-muted-foreground" title={dir}>
              {dir}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-8 py-8">
        <p className="mb-5 text-sm text-muted-foreground">
          Describe the crate, then register your files, schemas, and AI-Ready terms by hand.
          You can hand it off to the AI for AI-Ready enrichment and grading at any time.
        </p>

        <div className="space-y-4">
          <Field label="Name" required>
            <TextInput value={name} onChange={setName} placeholder="My dataset release" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Organization" required>
              <TextInput value={organizationName} onChange={setOrganizationName} />
            </Field>
            <Field label="Project" required>
              <TextInput value={projectName} onChange={setProjectName} />
            </Field>
          </div>
          <Field label="Description" required>
            <TextArea value={description} onChange={setDescription} />
          </Field>
          <Field label="Keywords" required hint="Comma-separated.">
            <TextInput value={keywords} onChange={setKeywords} placeholder="ecg, hrv" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Author">
              <TextInput value={author} onChange={setAuthor} placeholder="Unknown" />
            </Field>
            <Field label="Version">
              <TextInput value={version} onChange={setVersion} />
            </Field>
          </div>
          <Field label="License" hint="URL of the license.">
            <TextInput value={license} onChange={setLicense} />
          </Field>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <pre className="min-w-0 flex-1 whitespace-pre-wrap font-mono">{error}</pre>
          </div>
        )}

        <div className="mt-6 border-t border-border pt-5">
          <button
            onClick={() => void submit()}
            disabled={busy || !ready}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <FilePlus2 className="size-4" />}
            Create crate &amp; continue
          </button>
        </div>
      </main>
    </div>
  );
}
