import { useMemo, useState } from 'react';
import { Plus, Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Crate, NewEntity } from '@/shared/types';
import { Field, TextInput, TextArea, LinkMultiSelect, type LinkOption } from './FormControls';
import { displayType } from './entityUtils';

type Kind = NewEntity['kind'];
const KINDS: { id: Kind; label: string }[] = [
  { id: 'dataset', label: 'Dataset' },
  { id: 'software', label: 'Software' },
  { id: 'computation', label: 'Computation' },
];

const today = () => new Date().toISOString().slice(0, 10);

/** Initial values to seed the form with (Files tab prefills these from a scanned file). */
export interface AddEntityPrefill {
  kind?: Kind;
  name?: string;
  dataFormat?: string;
  fileFormat?: string;
  filepath?: string;
}

/** Register a new Dataset/Software/Computation into the crate via the CLI. */
export function AddEntityForm({
  dir,
  crate,
  onAdded,
  prefill,
  onCancel,
}: {
  dir: string;
  crate: Crate;
  onAdded: () => void;
  /** Seed values from a scanned file (Files tab). Applied as initial state only. */
  prefill?: AddEntityPrefill;
  /** When set, show a "Back to files" affordance (Files-tab single-file flow). */
  onCancel?: () => void;
}) {
  const [kind, setKind] = useState<Kind>(prefill?.kind ?? 'dataset');
  const [name, setName] = useState(prefill?.name ?? '');
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [author, setAuthor] = useState('');
  const [version, setVersion] = useState('1.0');
  const [dataFormat, setDataFormat] = useState(prefill?.dataFormat ?? '');
  const [fileFormat, setFileFormat] = useState(prefill?.fileFormat ?? '');
  const [filepath, setFilepath] = useState(prefill?.filepath ?? '');
  const [contentUrl, setContentUrl] = useState('');
  const [runBy, setRunBy] = useState('');
  const [command, setCommand] = useState('');
  const [usedDataset, setUsedDataset] = useState<string[]>([]);
  const [usedSoftware, setUsedSoftware] = useState<string[]>([]);
  const [generated, setGenerated] = useState<string[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(() => {
    const all: LinkOption[] = crate['@graph']
      .filter((e) => !String(e['@id']).endsWith('ro-crate-metadata.json'))
      .map((e) => ({ id: String(e['@id']), name: e.name?.toString() || String(e['@id']), type: displayType(e['@type']) }));
    return {
      datasets: all.filter((o) => o.type === 'Dataset'),
      software: all.filter((o) => o.type === 'Software'),
      outputs: all.filter((o) => o.type === 'Dataset' || o.type === 'Software'),
    };
  }, [crate]);

  const ready =
    name.trim() &&
    description.trim() &&
    keywords.trim() &&
    (kind === 'computation' ? runBy.trim() : author.trim());

  async function submit() {
    setBusy(true);
    setError(null);
    const entity: NewEntity = { kind, name, description, keywords };
    if (kind === 'dataset') {
      entity.author = author;
      entity.version = version;
      entity.dataFormat = dataFormat || 'application/octet-stream';
      entity.datePublished = today();
      if (filepath.trim()) entity.filepath = filepath.trim();
      else if (contentUrl.trim()) entity.contentUrl = contentUrl.trim();
    } else if (kind === 'software') {
      entity.author = author;
      entity.version = version;
      entity.fileFormat = fileFormat || 'application/octet-stream';
      if (filepath.trim()) entity.filepath = filepath.trim();
      else if (contentUrl.trim()) entity.contentUrl = contentUrl.trim();
    } else {
      entity.runBy = runBy;
      entity.dateCreated = today();
      if (command.trim()) entity.command = command;
      entity.usedDataset = usedDataset;
      entity.usedSoftware = usedSoftware;
      entity.generated = generated;
    }
    const res = await window.fairscape.addEntity(dir, entity);
    setBusy(false);
    if (res.ok) {
      // reset the volatile fields, keep the kind
      setName('');
      setDescription('');
      setKeywords('');
      setCommand('');
      setFilepath('');
      setContentUrl('');
      setUsedDataset([]);
      setUsedSoftware([]);
      setGenerated([]);
      onAdded();
    } else {
      setError(res.stderr || res.stdout || 'The CLI failed to register the entity.');
    }
  }

  return (
    <div className="space-y-4">
      {onCancel && (
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to files
        </button>
      )}

      {/* Kind selector */}
      <div className="inline-flex rounded-lg border border-border p-0.5">
        {KINDS.map((k) => (
          <button
            key={k.id}
            onClick={() => setKind(k.id)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm transition',
              kind === k.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {k.label}
          </button>
        ))}
      </div>

      <Field label="Name" required>
        <TextInput value={name} onChange={setName} />
      </Field>
      <Field label="Description" required>
        <TextArea value={description} onChange={setDescription} />
      </Field>
      <Field label="Keywords" required hint="Comma-separated.">
        <TextInput value={keywords} onChange={setKeywords} placeholder="ecg, hrv" />
      </Field>

      {kind !== 'computation' && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Author" required>
            <TextInput value={author} onChange={setAuthor} />
          </Field>
          <Field label="Version">
            <TextInput value={version} onChange={setVersion} />
          </Field>
        </div>
      )}

      {kind === 'dataset' && (
        <Field label="Data format" hint="MIME type or extension, e.g. text/csv.">
          <TextInput value={dataFormat} onChange={setDataFormat} placeholder="text/csv" />
        </Field>
      )}
      {kind === 'software' && (
        <Field label="File format" hint="e.g. text/x-python.">
          <TextInput value={fileFormat} onChange={setFileFormat} placeholder="text/x-python" />
        </Field>
      )}
      {kind !== 'computation' && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="File path" hint="Relative to the crate root.">
            <TextInput value={filepath} onChange={setFilepath} placeholder="data/results.csv" />
          </Field>
          <Field label="or Content URL" hint="If hosted externally. Leave both blank for a metadata-only record.">
            <TextInput value={contentUrl} onChange={setContentUrl} placeholder="https://…" />
          </Field>
        </div>
      )}
      {kind === 'computation' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Run by" required>
              <TextInput value={runBy} onChange={setRunBy} placeholder="Person or system" />
            </Field>
            <Field label="Command">
              <TextInput value={command} onChange={setCommand} placeholder="python src/train.py" />
            </Field>
          </div>
          <LinkMultiSelect label="Used datasets" options={options.datasets} value={usedDataset} onChange={setUsedDataset} />
          <LinkMultiSelect label="Used software" options={options.software} value={usedSoftware} onChange={setUsedSoftware} />
          <LinkMultiSelect label="Generated" options={options.outputs} value={generated} onChange={setGenerated} />
        </>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <pre className="min-w-0 flex-1 whitespace-pre-wrap font-mono">{error}</pre>
        </div>
      )}

      <div className="border-t border-border pt-4">
        <button
          onClick={() => void submit()}
          disabled={busy || !ready}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Register {KINDS.find((k) => k.id === kind)?.label}
        </button>
      </div>
    </div>
  );
}
