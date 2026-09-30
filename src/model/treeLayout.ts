import { flextree } from "d3-flextree";
import type { FlextreeNode } from "d3-flextree";
import type { Family, Tree } from "./types";
import { connectorPath } from "./connectorPath";
import type { EdgeSource } from "./connectorPath";
import { buildAncestorGroup, fullRow, rowWidth } from "./ancestorGroup";
import type { AncestorGroupNode } from "./ancestorGroup";
import { NODE_WIDTH, NODE_HEIGHT, SIBLING_GAP, GROUP_GAP, GENERATION_GAP } from "./treeLayoutConstants";

export interface PositionedPerson {
  personId: string;
  x: number;
  y: number;
}

export interface PositionedEdge {
  id: string;
  path: string;
  // A second (or later) marriage, shown as a supplementary branch rather
  // than part of the primary ancestry line -- rendered dashed.
  secondary?: boolean;
  // A marriage bridge (couple or second marriage) vs. a parent/child
  // descent line -- rendered heavier, so a couple reads as a pair rather
  // than as two more entries in the surrounding sibling row.
  kind: "connector" | "bridge";
  // Center of the two-rings badge drawn on a couple's bridge (see
  // ConnectorLine.tsx and pdfDrawPlan.ts) -- set only for kind "bridge".
  // Computed here, where the bridge's endpoints are still plain numbers,
  // so consumers don't each need to parse it back out of the path string.
  ringBadgeCenter?: { x: number; y: number };
}

export interface TreeLayout {
  persons: PositionedPerson[];
  edges: PositionedEdge[];
  width: number;
  height: number;
}

interface RawEdge {
  id: string;
  sources: EdgeSource[];
  target: { x: number; y: number };
  // Where this edge's bus sits along the gap to its target (see
  // connectorPath). Distinguishes a couple's two chunks -- each connects to
  // its own separate parentGroup, and those can span overlapping x ranges
  // when one parent's ancestry is much wider than the other's; without a
  // distinct busT the two would draw as one shared line to both sets of
  // grandparents instead of two crossing ones.
  busT: number;
}

interface RawBridge {
  id: string;
  x1: number;
  x2: number;
  y: number;
  secondary?: boolean;
}

// Accumulated pre-flip, pre-translation output of the layout pipeline:
// raw flextree-space coordinates plus the running bounding box.
interface RawLayout {
  persons: PositionedPerson[];
  edges: RawEdge[];
  bridges: RawBridge[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const EMPTY_LAYOUT: TreeLayout = { persons: [], edges: [], width: 0, height: 0 };

// Renders as a pedigree chart: the tree's anchor person sits at the bottom,
// with their parents, grandparents, etc. fanning upward above them, and each
// ancestor's own siblings (plus half-siblings from a parent's other
// marriage) shown alongside them. A couple always shares one flextree node
// so they stay next to each other no matter how much deeper one side's
// known ancestry runs than the other's.
export function computeTreeLayout(tree: Tree): TreeLayout {
  if (!tree.persons[tree.rootPersonId]) return EMPTY_LAYOUT;

  const positionedRoot = layoutAncestorGroups(tree);
  return flipAndTranslate(collectPositions(positionedRoot));
}

// Builds the ancestor-group hierarchy (see ancestorGroup.ts) and runs it
// through d3-flextree to get each row's raw x/y position (pre axis-flip,
// pre translation).
function layoutAncestorGroups(tree: Tree): FlextreeNode<AncestorGroupNode> {
  const familiesByPartnerId = new Map<string, Family[]>();
  for (const family of Object.values(tree.families ?? {})) {
    for (const partnerId of family.partners) {
      const list = familiesByPartnerId.get(partnerId);
      if (list) list.push(family);
      else familiesByPartnerId.set(partnerId, [family]);
    }
  }

  const anchorGroup = buildAncestorGroup(
    tree,
    [tree.rootPersonId],
    familiesByPartnerId,
    new Set<string>(),
    null,
  );

  const layout = flextree<AncestorGroupNode>({
    children: (node) => {
      const parents = node.chunks.map((c) => c.parentGroup).filter((g) => g !== null);
      return parents.length > 0 ? parents : undefined;
    },
    nodeSize: (node) => [rowWidth(fullRow(node.data)), NODE_HEIGHT + GENERATION_GAP],
    spacing: GROUP_GAP,
  });
  return layout(layout.hierarchy(anchorGroup));
}

// Every row member's final x, keyed by personId. Row order was decided by
// buildAncestorGroup (siblings, half-siblings, the traced person, any extra
// spouse); flextree only positioned the row as a whole, centered at
// node.x -- this steps through it at a uniform card width.
function rowPositions(node: FlextreeNode<AncestorGroupNode>): Map<string, number> {
  const row = fullRow(node.data);
  const startX = node.x - rowWidth(row) / 2;
  return new Map(row.map((personId, index) => [personId, startX + index * (NODE_WIDTH + SIBLING_GAP) + NODE_WIDTH / 2]));
}

// Walks each positioned row to compute every member's final x, and collects
// parent/child edges and couple bridges along the way.
function collectPositions(positionedRoot: FlextreeNode<AncestorGroupNode>): RawLayout {
  const raw: RawLayout = {
    persons: [],
    edges: [],
    bridges: [],
    minX: Infinity,
    maxX: -Infinity,
    minY: 0,
    maxY: 0,
  };

  positionedRoot.each((node) => {
    const positionOf = rowPositions(node);

    for (const [personId, x] of positionOf) {
      raw.persons.push({ personId, x, y: node.y });
      raw.minX = Math.min(raw.minX, x - NODE_WIDTH / 2);
      raw.maxX = Math.max(raw.maxX, x + NODE_WIDTH / 2);
      raw.maxY = Math.max(raw.maxY, node.y);
    }

    // A couple sharing this node's chunks is drawn side by side above; if
    // both are known, a short bridge marks them as a couple.
    if (node.data.chunks.length > 1) {
      const xs = node.data.chunks.map((c) => positionOf.get(c.tracedId) as number);
      raw.bridges.push({
        id: `${node.data.chunks.map((c) => c.tracedId).join("+")}-bridge`,
        x1: Math.min(...xs),
        x2: Math.max(...xs),
        y: node.y,
      });
    }

    // node.children here are this chunk's own parents (one flextree node per
    // chunk that has known parents), since "children" walks upward toward
    // older generations. Every member of a chunk connects to their shared
    // parents, not just whoever continues the traced line -- half-siblings
    // are marked per-source (see connectorPath) so their stretch of the
    // shared bus renders dashed without needing a second, separately
    // positioned edge.
    let childIndex = 0;
    for (const [chunkIndex, chunk] of node.data.chunks.entries()) {
      if (chunk.parentGroup) {
        const parentNode = (node.children ?? [])[childIndex] as FlextreeNode<AncestorGroupNode>;
        childIndex += 1;

        const parentPositions = parentNode.data.chunks.map((c) => tracedPersonPosition(parentNode, c.tracedId));
        const parentX = parentPositions.reduce((sum, x) => sum + x, 0) / parentPositions.length;
        const parentY = parentNode.y;
        const parentKey = parentNode.data.chunks.map((c) => c.tracedId).join("+");

        raw.edges.push({
          id: `${chunk.row.join(",")}>${parentKey}`,
          sources: chunk.row.map((personId) => ({
            x: positionOf.get(personId) as number,
            y: node.y,
            secondary: chunk.halfSiblingIds.includes(personId),
          })),
          target: { x: parentX, y: parentY },
          busT: chunkIndex === 0 ? 0.5 : 0.7,
        });
      }

      // Second marriages: the other spouse already got a place in `row`
      // (right next to chunk.tracedId), so the existing flextree pass
      // reserves their space and nothing else can ever land on top of
      // them. A dashed bridge marks the marriage; their children render as
      // half-siblings in whoever's row has this chunk's parentGroup (see
      // ancestorGroup.ts), not here.
      const tracedX = positionOf.get(chunk.tracedId) as number;
      for (const marriage of chunk.extraMarriages) {
        const spouseX = positionOf.get(marriage.spouseId) as number;
        raw.bridges.push({
          id: `${chunk.tracedId}+${marriage.spouseId}-secondary-bridge`,
          x1: Math.min(tracedX, spouseX),
          x2: Math.max(tracedX, spouseX),
          y: node.y,
          secondary: true,
        });
      }
    }
  });

  return raw;
}

// Flips the vertical axis: flextree depth grows from the anchor (depth 0)
// upward through older generations, but the anchor belongs at the bottom.
// flipY maps a box's raw top to its final top; the source point below is
// the ancestor's bottom edge, so NODE_HEIGHT is added after flipping.
function flipAndTranslate(raw: RawLayout): TreeLayout {
  const flipY = (y: number) => raw.maxY - y;
  const shiftX = -raw.minX;

  // The target lands at the parent row's vertical center -- the same height
  // as the marriage bridge below -- so the two visibly meet at one point
  // instead of the connector stopping short at the box's top edge. Each
  // edge yields up to two PositionedEdges (solid and dashed halves of one
  // bus, see connectorPath) sharing the same id prefix.
  const connectorEdges: PositionedEdge[] = raw.edges.flatMap((e) => {
    const { solid, dashed } = connectorPath(
      e.sources.map((s) => ({ x: s.x + shiftX, y: flipY(s.y) + NODE_HEIGHT, secondary: s.secondary })),
      { x: e.target.x + shiftX, y: flipY(e.target.y) + NODE_HEIGHT / 2 },
      e.busT,
    );
    // solid is never empty here: every chunk's row includes the traced
    // person themself, who by construction is never in halfSiblingIds, so
    // every edge always has at least one non-secondary source.
    const parts: PositionedEdge[] = [{ id: `${e.id}-solid`, kind: "connector", path: solid }];
    if (dashed) parts.push({ id: `${e.id}-dashed`, kind: "connector", secondary: true, path: dashed });
    return parts;
  });
  const bridgeEdges: PositionedEdge[] = raw.bridges.map((b) => {
    const y = flipY(b.y) + NODE_HEIGHT / 2;
    const x1 = b.x1 + shiftX;
    const x2 = b.x2 + shiftX;
    return {
      id: b.id,
      secondary: b.secondary,
      kind: "bridge",
      path: `M${x1},${y}L${x2},${y}`,
      ringBadgeCenter: { x: (x1 + x2) / 2, y },
    };
  });

  return {
    persons: raw.persons.map((p) => ({ personId: p.personId, x: p.x + shiftX, y: flipY(p.y) })),
    edges: [...connectorEdges, ...bridgeEdges],
    width: raw.maxX - raw.minX,
    height: raw.maxY - raw.minY + NODE_HEIGHT,
  };
}

// The x-position of a specific person within a node's combined row.
function tracedPersonPosition(node: FlextreeNode<AncestorGroupNode>, personId: string): number {
  return rowPositions(node).get(personId) as number;
}
