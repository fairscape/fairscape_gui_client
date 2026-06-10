// Evidence-graph viewer types — ported verbatim from fairscape_web_client
// (src/types/graph.ts). Kept local to the EvidenceGraph component so the viewer
// is self-contained in Studio. The crate-side RawGraphData in src/shared/types.ts
// is structurally compatible; the CLI's `build evidence-graph` JSON feeds in directly.
import { Node, Edge } from 'reactflow';

export interface RawGraphEntity {
  '@id': string;
  '@type': string | string[];
  name?: string;
  label?: string;
  description?: string;
  generatedBy?: { '@id': string } | Array<{ '@id': string }>;
  usedDataset?: { '@id': string } | Array<{ '@id': string }>;
  usedSoftware?: { '@id': string } | Array<{ '@id': string }>;
  usedSample?: { '@id': string } | Array<{ '@id': string }>;
  usedInstrument?: { '@id': string } | Array<{ '@id': string }>;
  usedMLModel?: { '@id': string } | Array<{ '@id': string }>;
  hasOutputs?: { '@id': string } | Array<{ '@id': string }>;
  createdBy?: string | { '@id': string } | Array<string | { '@id': string }>;
  'evi:annotatedBy'?: Array<{ '@id': string }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface RawGraphData {
  '@graph': { [arkId: string]: RawGraphEntity };
  outputs?: Array<{ '@id': string }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface EvidenceNodeData {
  id: string;
  type: string;
  label: string;
  displayName: string;
  description?: string;
  expandable: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: Record<string, any> & {
    count?: number;
    _childNodeIds?: string[];
    _parentNodeId?: string;
    _visibleChildren?: number;
  };
  _sourceData: RawGraphEntity | Record<string, never>;
  _expanded?: boolean;
}

export type EvidenceNode = Node<EvidenceNodeData>;
export type EvidenceEdge = Edge;
