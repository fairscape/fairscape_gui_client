import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Check, Plus, FileText, Layers, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Crate, NewEntity, ScannedFile } from '@/shared/types';
import { Field, TextInput, TextArea } from './FormControls';
import { AddEntityForm } from './AddEntityForm';
import { registeredPaths, fileNameToTitle } from './entityUtils';

/** Bytes → a short human string (e.g. "2.1 MB"). */
function humanSize(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

/**
 * Manual-build "Files" tab. Scans the crate folder, shows every file with a
 * registered ✓ / pending state (matched against the crate's contentUrls), and lets the
 * user register a pending file via a prefilled form — or bulk-register a group of like
 * files with shared metadata. Registration runs through the same `fairscape-cli rocrate
 * register` path as the Add form, so the CLI still derives md5/contentUrl/@id.
 */
export function FilesTab({
  dir,
  crate,
  onReload,
}: {
  dir: string;
  crate: Crate;
  onReload: () => void;
}) {
  const [files, setFiles] = useState<ScannedFile[] | null>(null);
  const [scanning, setScanning] = useState(true);
  const [active, setActive] = useState<ScannedFile | null>(null); // single-file prefilled form

  // Bulk-register state.
  const [bulk, setBulk] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkKind, setBulkKind] = useState<'dataset' | 'software'>('dataset');
  const [bulkKeywords, setBulkKeywords] = useState('');
  const [bulkAuthor, setBulkAuthor] = useState('');
  const [bulkDescription, setBulkDescription] = useState('');
  const [bulkFormat, setBulkFormat] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const rescan = useCallback(async () => {
    setScanning(true);
    const f = await window.fairscape.scanFiles(dir);
    setFiles(f);
    setScanning(false);
  }, [dir]);

  useEffect(() => {
    void rescan();
  }, [rescan]);

  const registered = useMemo(() => registeredPaths(crate), [crate]);
  const registeredCount = useMemo(
    () => (files ?? []).filter((f) => registered.has(f.path)).length,
    [files, registered],
  );

  const exitBulk = () => {
    setBulk(false);
    setSelected(new Set());
    setBulkError(null);
  };

  const toggleSelect = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  async function registerBulk() {
    if (!files) return;
    setBulkBusy(true);
    setBulkError(null);
    const targets = files.filter((f) => selected.has(f.path));
    const failures: string[] = [];
    // Sequential: every register mutates the same ro-crate-metadata.json.
    for (const f of targets) {
      const name = fileNameToTitle(f.path) || f.path;
      const entity: NewEntity = {
        kind: bulkKind,
        name,
        description: bulkDescription.trim(),
        keywords: bulkKeywords,
        author: bulkAuthor,
        version: '1.0',
        filepath: f.path,
      };
      if (bulkKind === 'dataset') entity.dataFormat = bulkFormat.trim() || f.mime;
      else entity.fileFormat = bulkFormat.trim() || f.mime;
      const res = await window.fairscape.addEntity(dir, entity);
      if (!res.ok) failures.push(`${f.path}: ${res.stderr || res.stdout || 'CLI failed'}`);
    }
    setBulkBusy(false);
    onReload();
    await rescan();
    if (failures.length) setBulkError(failures.join('\n'));
    else exitBulk();
  }

  // --- Single-file prefilled form -------------------------------------------------
  if (active) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-8 py-6">
          <AddEntityForm
            key={active.path}
            dir={dir}
            crate={crate}
            prefill={{
              kind: active.kind,
              name: fileNameToTitle(active.path),
              dataFormat: active.mime,
              fileFormat: active.mime,
              filepath: active.path,
            }}
            onCancel={() => setActive(null)}
            onAdded={async () => {
              setActive(null);
              onReload();
              await rescan();
            }}
          />
        </div>
      </div>
    );
  }

  const bulkReady = selected.size > 0 && bulkKeywords.trim() && bulkAuthor.trim() && bulkDescription.trim();

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-4 px-8 py-6">
        {/* Header: coverage + bulk toggle */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {files
              ? `${registeredCount} of ${files.length} files registered`
              : 'Scanning folder…'}
          </p>
          {files && files.length > 0 && (
            <button
              onClick={() => (bulk ? exitBulk() : setBulk(true))}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent"
            >
              {bulk ? <X className="size-3.5" /> : <Layers className="size-3.5" />}
              {bulk ? 'Cancel bulk' : 'Bulk register'}
            </button>
          )}
        </div>

        {/* Bulk shared-metadata form */}
        {bulk && (
          <div className="space-y-3 rounded-lg border border-border bg-card/40 p-4">
            <div className="inline-flex rounded-lg border border-border p-0.5">
              {(['dataset', 'software'] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setBulkKind(k)}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs capitalize transition',
                    bulkKind === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {k}
                </button>
              ))}
            </div>
            <Field label="Description" required hint="Shared across the selected files.">
              <TextArea value={bulkDescription} onChange={setBulkDescription} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Keywords" required hint="Comma-separated.">
                <TextInput value={bulkKeywords} onChange={setBulkKeywords} placeholder="ecg, hrv" />
              </Field>
              <Field label="Author" required>
                <TextInput value={bulkAuthor} onChange={setBulkAuthor} />
              </Field>
            </div>
            <Field label="Format" hint="Blank uses each file's guessed type.">
              <TextInput value={bulkFormat} onChange={setBulkFormat} placeholder="(per-file default)" />
            </Field>
            {bulkError && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <pre className="min-w-0 flex-1 whitespace-pre-wrap font-mono">{bulkError}</pre>
              </div>
            )}
            <button
              onClick={() => void registerBulk()}
              disabled={bulkBusy || !bulkReady}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
            >
              {bulkBusy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Register {selected.size} selected
            </button>
          </div>
        )}

        {/* File list */}
        {scanning && !files ? (
          <div className="grid place-items-center py-12 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Scanning folder…
            </span>
          </div>
        ) : !files || files.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No files found in this folder.
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {files.map((f) => {
              const isReg = registered.has(f.path);
              const checkable = bulk && !isReg;
              return (
                <li
                  key={f.path}
                  onClick={() => {
                    if (isReg) return;
                    if (bulk) toggleSelect(f.path);
                    else setActive(f);
                  }}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 text-sm',
                    isReg
                      ? 'cursor-default bg-muted/30 text-muted-foreground'
                      : 'cursor-pointer hover:bg-accent',
                  )}
                >
                  {checkable && (
                    <input
                      type="checkbox"
                      readOnly
                      checked={selected.has(f.path)}
                      className="size-3.5 shrink-0 accent-[var(--primary)]"
                    />
                  )}
                  {isReg ? (
                    <Check className="size-4 shrink-0 text-emerald-500" />
                  ) : (
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0 flex-1 truncate font-mono text-xs" title={f.path}>
                    {f.path}
                  </span>
                  <span className="shrink-0 text-xs capitalize text-muted-foreground">{f.kind}</span>
                  <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">{humanSize(f.size)}</span>
                  {!isReg && !bulk && <Plus className="size-3.5 shrink-0 text-muted-foreground" />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
