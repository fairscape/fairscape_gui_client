import { useEffect, useMemo, useState } from 'react';
import { ThemeProvider } from 'styled-components';
import { Network, Loader2, AlertTriangle } from 'lucide-react';
import type { Crate } from '@/shared/types';
import EvidenceGraphViewer from '@/components/EvidenceGraph/EvidenceGraphViewer';
// The viewer's RawGraphData uses stricter relationship types than the crate-side
// shared type, but they describe the same CLI JSON — cast at this boundary.
import type { RawGraphData } from '@/components/EvidenceGraph/types/graph';
import { graphTheme } from '@/components/EvidenceGraph/theme';
import { displayType } from './entityUtils';

/** Priority for ordering root candidates: outputs/computations first, then the rest. */
const TYPE_RANK: Record<string, number> = { Computation: 0, Dataset: 1, ROCrate: 2 };

/**
 * Evidence-graph tab: pick a root entity, build the graph via the CLI subprocess
 * (window.fairscape.buildEvidenceGraph), and render it with the ported viewer.
 * The CLI mutates crate metadata as a side effect, so we call onAfterBuild to reload.
 */
export function EvidenceGraphTab({
  dir,
  crate,
  onAfterBuild,
  onNavigateEntity,
}: {
  dir: string;
  crate: Crate;
  onAfterBuild: () => void;
  onNavigateEntity: (arkId: string) => void;
}) {
  const candidates = useMemo(() => {
    const list = crate['@graph']
      .filter((e) => !String(e['@id']).endsWith('ro-crate-metadata.json'))
      .map((e) => ({
        id: String(e['@id']),
        type: displayType(e['@type']),
        name: e.name?.toString() || String(e['@id']),
        isOutput: e.generatedBy != null,
      }));
    return list.sort((a, b) => {
      const ra = a.isOutput ? -1 : (TYPE_RANK[a.type] ?? 9);
      const rb = b.isOutput ? -1 : (TYPE_RANK[b.type] ?? 9);
      return ra - rb || a.name.localeCompare(b.name);
    });
  }, [crate]);

  // Rooting at the crate's ROCrate node yields a trivial 1-node graph; an output
  // entity (one with generatedBy) traces back through its computations. Prefer that.
  const defaultRoot = candidates.find((c) => c.isOutput)?.id ?? crate.rootId ?? candidates[0]?.id ?? '';
  const [arkId, setArkId] = useState(defaultRoot);
  const [graph, setGraph] = useState<RawGraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [builtFor, setBuiltFor] = useState<string | null>(null);

  // Reset the selected root if the crate changes underneath us.
  useEffect(() => {
    setArkId((prev) => (candidates.some((c) => c.id === prev) ? prev : defaultRoot));
  }, [candidates, defaultRoot]);

  async function build() {
    if (!arkId) return;
    setLoading(true);
    setError(null);
    const data = await window.fairscape.buildEvidenceGraph(dir, arkId);
    setLoading(false);
    if (!data) {
      setError('The CLI could not build an evidence graph for this entity. Check that it has provenance links.');
      return;
    }
    setGraph(data as unknown as RawGraphData);
    setBuiltFor(arkId);
    onAfterBuild();
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-8 py-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <label className="mb-1 block text-sm font-medium">Root entity</label>
            <p className="mb-2 text-xs text-muted-foreground">
              The graph traces provenance back from this entity. Defaults to the crate root; pick an
              output dataset or computation to focus.
            </p>
            <select
              value={arkId}
              onChange={(e) => setArkId(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.type} · {c.name}
                  {c.isOutput ? ' (output)' : ''}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => void build()}
            disabled={loading || !arkId}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Network className="size-4" />}
            {graph ? 'Rebuild graph' : 'Build graph'}
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-5">
          {loading ? (
            <div className="grid h-64 place-items-center rounded-xl border border-border text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Building evidence graph…
              </span>
            </div>
          ) : graph ? (
            <ThemeProvider theme={graphTheme}>
              <EvidenceGraphViewer evidenceGraphData={graph} onNavigateEntity={onNavigateEntity} />
            </ThemeProvider>
          ) : (
            <div className="grid h-64 place-items-center rounded-xl border border-dashed border-border px-8 text-center text-sm text-muted-foreground">
              <div>
                <Network className="mx-auto mb-2 size-7 opacity-40" />
                Choose a root entity and build the evidence graph to visualize how this crate's
                outputs were produced.
              </div>
            </div>
          )}
        </div>

        {graph && builtFor && (
          <p className="mt-3 text-xs text-muted-foreground">
            Showing the evidence graph rooted at <span className="font-mono">{builtFor}</span>. Click a
            node to expand it; shift-click two nodes to highlight the path between them.
          </p>
        )}
      </div>
    </div>
  );
}
