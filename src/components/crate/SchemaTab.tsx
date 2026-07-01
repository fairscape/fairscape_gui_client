import { useMemo, useState } from 'react';
import { Loader2, AlertTriangle, Table2, CheckCircle2 } from 'lucide-react';
import type { Crate, CrateEntity } from '@/shared/types';
import { Field, TextInput, TextArea } from './FormControls';
import { displayType, asIdList, entityName, byId } from './entityUtils';

/** Strip a `file://` scheme from a stored contentUrl to a filesystem path the CLI can read. */
function toFilePath(entity: CrateEntity): string {
  const url = (entity.contentUrl ?? entity.filepath) as string | undefined;
  if (!url) return '';
  return url.replace(/^file:\/\//, '');
}

/** The schema (evi:Schema) currently linked to a dataset, if any. */
function linkedSchemaId(entity: CrateEntity): string | null {
  const ids = asIdList(entity['evi:Schema'] ?? entity.schema);
  return ids[0] ?? null;
}

/**
 * Build-mode tab: infer a tabular schema (column names + types) for a Dataset via
 * `fairscape-cli schema infer` and back-link it to the dataset with evi:Schema —
 * the human-input counterpart of the remote-schema-infer skill.
 */
export function SchemaTab({
  dir,
  crate,
  onReload,
}: {
  dir: string;
  crate: Crate;
  onReload: () => void;
}) {
  const index = useMemo(() => byId(crate), [crate]);
  const datasets = useMemo(
    () =>
      crate['@graph'].filter(
        (e) => displayType(e['@type']) === 'Dataset' && String(e['@id']) !== crate.rootId,
      ),
    [crate],
  );
  const schemas = useMemo(
    () => crate['@graph'].filter((e) => displayType(e['@type']) === 'Schema'),
    [crate],
  );

  const [datasetId, setDatasetId] = useState('');
  const [file, setFile] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function selectDataset(id: string) {
    setDatasetId(id);
    const ds = index.get(id);
    if (ds) {
      setFile(toFilePath(ds));
      const dsName = ds.name?.toString() || 'dataset';
      setName(`${dsName} schema`);
      setDescription(`Inferred column schema for ${dsName}.`);
    }
  }

  const ready = datasetId && file.trim() && name.trim() && description.trim();

  async function infer() {
    setBusy(true);
    setError(null);
    const res = await window.fairscape.inferSchema(dir, {
      file: file.trim(),
      name: name.trim(),
      description: description.trim(),
    });
    if (!res.ok) {
      setBusy(false);
      setError(res.stderr || res.stdout || 'The CLI failed to infer the schema.');
      return;
    }
    // The CLI appended the Schema entity; find it by name and back-link it to the dataset.
    const fresh = await window.fairscape.readCrate(dir);
    const added = fresh?.['@graph'].find(
      (e) => displayType(e['@type']) === 'Schema' && e.name?.toString() === name.trim(),
    );
    if (added) {
      await window.fairscape.setEntityProps(dir, datasetId, {
        'evi:Schema': { '@id': String(added['@id']) },
      });
    }
    await window.fairscape.writeBuildState(dir, {
      phase: 'schemas_done',
      history: { skill: 'manual-schema', summary: `Inferred schema "${name.trim()}"` },
    });
    setBusy(false);
    setDatasetId('');
    setFile('');
    setName('');
    setDescription('');
    onReload();
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl px-8 py-6">
        <h2 className="text-base font-semibold">Schemas</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Infer the columns and types of a tabular dataset (CSV/TSV/Parquet/HDF5) and attach the
          schema to it. Schemas are part of what makes a crate AI-Ready.
        </p>

        {datasets.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Register a Dataset with a file path in the Edit / Add tab first.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            <Field label="Dataset" required>
              <select
                value={datasetId}
                onChange={(e) => selectDataset(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Choose a dataset…</option>
                {datasets.map((d) => (
                  <option key={String(d['@id'])} value={String(d['@id'])}>
                    {d.name?.toString() || String(d['@id'])}
                    {linkedSchemaId(d) ? ' · has schema' : ''}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="File path" required hint="Relative to the crate root, or an absolute path.">
              <TextInput value={file} onChange={setFile} placeholder="data/results.csv" />
            </Field>
            <Field label="Schema name" required>
              <TextInput value={name} onChange={setName} />
            </Field>
            <Field label="Description" required>
              <TextArea value={description} onChange={setDescription} />
            </Field>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <pre className="min-w-0 flex-1 whitespace-pre-wrap font-mono">{error}</pre>
              </div>
            )}

            <div className="border-t border-border pt-4">
              <button
                onClick={() => void infer()}
                disabled={busy || !ready}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Table2 className="size-4" />}
                Infer &amp; attach schema
              </button>
            </div>
          </div>
        )}

        {schemas.length > 0 && (
          <div className="mt-8">
            <p className="mb-2 text-sm font-medium">Schemas in this crate</p>
            <ul className="space-y-2">
              {schemas.map((s) => {
                const linkedTo = datasets
                  .filter((d) => linkedSchemaId(d) === String(s['@id']))
                  .map((d) => entityName(index, String(d['@id'])));
                return (
                  <li
                    key={String(s['@id'])}
                    className="flex items-start gap-2 rounded-lg border border-border bg-card p-3 text-sm"
                  >
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                    <div className="min-w-0">
                      <p className="font-medium">{s.name?.toString() || String(s['@id'])}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {linkedTo.length ? `Linked to ${linkedTo.join(', ')}` : 'Not linked to a dataset yet'}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
