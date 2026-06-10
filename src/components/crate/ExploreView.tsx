import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Search, Boxes, Link2, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Crate, CrateEntity } from '@/shared/types';
import {
  authorText,
  byId,
  displayType,
  entityLinks,
  groupByType,
  keywordList,
} from './entityUtils';

/**
 * Read-only explorer: left = entities grouped by @type, right = detail of the
 * selected entity with clickable links that navigate between related entities.
 */
export function ExploreView({
  crate,
  selectedId,
  onSelect,
}: {
  crate: Crate;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const index = useMemo(() => byId(crate), [crate]);
  const groups = useMemo(() => groupByType(crate), [crate]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        entities: g.entities.filter(
          (e) =>
            (e.name?.toString() ?? '').toLowerCase().includes(q) ||
            String(e['@id']).toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.entities.length);
  }, [groups, q]);

  const selected = selectedId ? index.get(selectedId) ?? null : null;

  return (
    <div className="flex min-h-0 flex-1">
      {/* Entity list */}
      <aside className="flex w-80 shrink-0 flex-col border-r border-border">
        <div className="border-b border-border p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search entities…"
              className="w-full rounded-lg border border-input bg-background py-1.5 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">No matching entities.</p>
          ) : (
            filtered.map((g) => (
              <TypeGroup
                key={g.type}
                type={g.type}
                entities={g.entities}
                selectedId={selectedId}
                onSelect={onSelect}
                defaultOpen={!!q || g.entities.length <= 12}
              />
            ))
          )}
        </div>
      </aside>

      {/* Detail */}
      <section className="min-h-0 flex-1 overflow-y-auto">
        {selected ? (
          <EntityDetail entity={selected} crate={crate} onSelect={onSelect} />
        ) : (
          <div className="grid h-full place-items-center px-8 text-center">
            <div className="max-w-sm text-sm text-muted-foreground">
              <Boxes className="mx-auto mb-3 size-8 opacity-40" />
              {crate['@graph'].length} entities in this crate. Select one to inspect its metadata and
              how it links to the others.
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function TypeGroup({
  type,
  entities,
  selectedId,
  onSelect,
  defaultOpen,
}: {
  type: string;
  entities: CrateEntity[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-accent/40"
      >
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        {type}
        <span className="ml-auto rounded-full bg-muted px-1.5 text-[10px] font-medium">{entities.length}</span>
      </button>
      {open && (
        <ul className="mt-0.5 space-y-0.5">
          {entities.map((e) => {
            const id = String(e['@id']);
            const active = id === selectedId;
            return (
              <li key={id}>
                <button
                  onClick={() => onSelect(id)}
                  title={id}
                  className={cn(
                    'w-full truncate rounded-md px-2 py-1.5 pl-7 text-left text-sm',
                    active ? 'bg-primary/15 font-medium text-primary' : 'hover:bg-accent/40',
                  )}
                >
                  {e.name?.toString() || id}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EntityDetail({
  entity,
  crate,
  onSelect,
}: {
  entity: CrateEntity;
  crate: Crate;
  onSelect: (id: string) => void;
}) {
  const index = useMemo(() => byId(crate), [crate]);
  const links = entityLinks(entity, index);
  const keywords = keywordList(entity.keywords);
  const author = authorText(entity.author);

  return (
    <div className="mx-auto max-w-3xl px-8 py-6">
      <div className="flex items-start gap-3">
        <span className="mt-1 inline-flex items-center rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
          {displayType(entity['@type'])}
        </span>
        <h2 className="text-lg font-semibold leading-tight">{entity.name?.toString() || '(unnamed)'}</h2>
      </div>
      <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{String(entity['@id'])}</p>

      {entity.description && (
        <p className="mt-4 text-sm leading-relaxed text-foreground/90">{String(entity.description)}</p>
      )}

      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        {author && <Field label="Author" value={author} />}
        {entity.version != null && <Field label="Version" value={String(entity.version)} />}
        {typeof entity['contentUrl'] === 'string' && <Field label="Content URL" value={entity['contentUrl']} mono />}
      </dl>

      {keywords.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Keywords</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {keywords.map((k) => (
              <span key={k} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                {k}
              </span>
            ))}
          </div>
        </div>
      )}

      {links.length > 0 && (
        <div className="mt-5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Link2 className="size-3.5" /> Links
          </p>
          <div className="mt-2 space-y-2.5">
            {links.map((l) => (
              <div key={l.key}>
                <p className="text-xs font-medium text-muted-foreground">{l.label}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {l.targets.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => index.has(t.id) && onSelect(t.id)}
                      disabled={!index.has(t.id)}
                      title={t.id}
                      className={cn(
                        'max-w-xs truncate rounded-md border px-2 py-1 text-left text-xs',
                        index.has(t.id)
                          ? 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'
                          : 'border-border text-muted-foreground',
                      )}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <RawJson entity={entity} />
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('break-all', mono && 'font-mono text-xs')}>{value}</dd>
    </>
  );
}

function RawJson({ entity }: { entity: CrateEntity }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-6 border-t border-border pt-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        <Code2 className="size-3.5" /> Raw JSON-LD
      </button>
      {open && (
        <pre className="mt-2 max-h-96 overflow-auto rounded-lg border border-border bg-muted/40 p-3 text-[12px] leading-relaxed">
          {JSON.stringify(entity, null, 2)}
        </pre>
      )}
    </div>
  );
}
