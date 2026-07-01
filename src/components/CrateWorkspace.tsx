import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Boxes, Network, Pencil, Table2, ShieldCheck, Sparkles, Loader2, RefreshCw, FolderTree } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Crate } from '@/shared/types';
import { ExploreView } from './crate/ExploreView';
import { EvidenceGraphTab } from './crate/EvidenceGraphTab';
import { EditAddView } from './crate/EditAddView';
import { SchemaTab } from './crate/SchemaTab';
import { AiReadyTab } from './crate/AiReadyTab';
import { FilesTab } from './crate/FilesTab';

type Tab = 'files' | 'explore' | 'graph' | 'edit' | 'schemas' | 'ai-ready';

const BASE_TABS: { id: Tab; label: string; icon: typeof Boxes }[] = [
  { id: 'explore', label: 'Explore', icon: Boxes },
  { id: 'graph', label: 'Evidence Graph', icon: Network },
  { id: 'edit', label: 'Edit / Add', icon: Pencil },
];

// Build-mode only: scan/register files up front, then refine schemas & AI-Ready terms.
const FILES_TAB = { id: 'files' as Tab, label: 'Files', icon: FolderTree };
const BUILD_TABS: { id: Tab; label: string; icon: typeof Boxes }[] = [
  { id: 'schemas', label: 'Schemas', icon: Table2 },
  { id: 'ai-ready', label: 'AI-Ready', icon: ShieldCheck },
];

/**
 * Workspace for an RO-Crate. Loads the crate once, owns the active tab and the shared
 * selection, and exposes reload() so edits/adds and the evidence-graph build (which mutate
 * the crate metadata) refresh the view.
 *
 * In `mode='build'` (the manual human-input flow) it shows the Schemas and AI-Ready tabs
 * and a "Continue with AI" action that hands the crate off to the agent (onContinueWithAI).
 */
export function CrateWorkspace({
  dir,
  onBack,
  mode = 'open',
  onContinueWithAI,
}: {
  dir: string;
  onBack: () => void;
  mode?: 'open' | 'build';
  onContinueWithAI?: () => void;
}) {
  const build = mode === 'build';
  const TABS = build ? [FILES_TAB, ...BASE_TABS, ...BUILD_TABS] : BASE_TABS;
  const [crate, setCrate] = useState<Crate | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>(build ? 'files' : 'explore');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // `silent` refreshes the crate in place without flipping the full-screen loading
  // state — important after a graph build or edit/add so the active tab (and its
  // just-rendered evidence graph) isn't unmounted and discarded.
  const reload = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      const c = await window.fairscape.readCrate(dir);
      setCrate(c);
      setSelectedId((prev) => (prev && c?.['@graph'].some((e) => String(e['@id']) === prev) ? prev : null));
      if (!silent) setLoading(false);
    },
    [dir],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  /** Jump to Explore focused on an entity (used by graph/edit cross-links). */
  const focusEntity = useCallback((id: string) => {
    setSelectedId(id);
    setTab('explore');
  }, []);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border bg-gradient-to-r from-[#10182b] to-[#0b0e14] px-6 py-3">
        <div className="flex items-center gap-3 truncate">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent"
          >
            <ArrowLeft className="size-3.5" /> Back
          </button>
          <div className="truncate">
            <p className="text-sm font-semibold leading-tight">
              {build ? 'Build a Crate' : 'Crate Workspace'}
            </p>
            <p className="truncate text-xs text-muted-foreground" title={dir}>
              {dir}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {build && onContinueWithAI && (
            <button
              onClick={onContinueWithAI}
              title="Hand this crate to the AI for AI-Ready enrichment and grading"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition hover:opacity-90"
            >
              <Sparkles className="size-3.5" /> Continue with AI
            </button>
          )}
          <button
            onClick={() => void reload()}
            title="Reload from disk"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent"
          >
            <RefreshCw className="size-3.5" /> Reload
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="flex items-center gap-1 border-b border-border px-4">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm transition',
                active
                  ? 'border-primary font-medium text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-4" /> {t.label}
            </button>
          );
        })}
      </nav>

      <div className="flex min-h-0 flex-1 flex-col">
        {loading ? (
          <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Loading crate…
            </span>
          </div>
        ) : !crate ? (
          <div className="grid flex-1 place-items-center px-8 text-center text-sm text-muted-foreground">
            Couldn't read <span className="mx-1 font-mono">ro-crate-metadata.json</span> in this folder.
          </div>
        ) : tab === 'files' ? (
          <FilesTab dir={dir} crate={crate} onReload={() => void reload(true)} />
        ) : tab === 'explore' ? (
          <ExploreView crate={crate} selectedId={selectedId} onSelect={setSelectedId} />
        ) : tab === 'graph' ? (
          <EvidenceGraphTab
            dir={dir}
            crate={crate}
            onAfterBuild={() => void reload(true)}
            onNavigateEntity={focusEntity}
          />
        ) : tab === 'schemas' ? (
          <SchemaTab dir={dir} crate={crate} onReload={() => void reload(true)} />
        ) : tab === 'ai-ready' ? (
          <AiReadyTab
            dir={dir}
            crate={crate}
            onReload={() => void reload(true)}
            onHandoff={() => onContinueWithAI?.()}
          />
        ) : (
          <EditAddView
            dir={dir}
            crate={crate}
            selectedId={selectedId}
            onCrateChange={setCrate}
            onReload={() => void reload(true)}
          />
        )}
      </div>
    </div>
  );
}
