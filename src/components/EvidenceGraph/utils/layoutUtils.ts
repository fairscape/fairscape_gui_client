import { Node, Edge } from "reactflow";
import dagre from "dagre";

const NODE_WIDTH = 180;
const NODE_HEIGHT = 90;

const RANK_SEP = 200;
const NODE_SEP = 120;
const ALIGNMENT = "DL";
const MARGIN_X = 50;
const MARGIN_Y = 50;

export const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction = "LR" // Default to Left-to-Right
): { nodes: Node[]; edges: Edge[] } => {
  if (!nodes || nodes.length === 0) {
    console.log("Layout skipped: No nodes provided.");
    return { nodes, edges };
  }

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: NODE_SEP,
    ranksep: RANK_SEP,
    align: ALIGNMENT,
    marginx: MARGIN_X,
    marginy: MARGIN_Y,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  });

  edges.forEach((edge) => {
    if (
      nodes.some((n) => n.id === edge.source) &&
      nodes.some((n) => n.id === edge.target)
    ) {
      dagreGraph.setEdge(edge.source, edge.target);
    } else {
      console.warn(
        `Skipping edge ${edge.id} due to missing source/target node in current layout batch.`
      );
    }
  });

  try {
    dagre.layout(dagreGraph);
  } catch (e) {
    console.error("Dagre layout calculation failed:", e);
    return { nodes, edges };
  }

  const layoutedNodes = nodes.map((node): Node => {
    const nodeWithPosition = dagreGraph.node(node.id);
    if (nodeWithPosition) {
      const position = {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      };
      return {
        ...node,
        position,
        // Include explicit width and height in the node data
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      };
    } else {
      console.warn(
        `Node ${node.id} not found in Dagre layout results. Keeping original position.`
      );
      return {
        ...node,
        position: node.position || {
          x: Math.random() * 300,
          y: Math.random() * 300,
        },
      };
    }
  });

  return { nodes: layoutedNodes, edges };
};
