import { flextree } from "d3-flextree";
import type { FlextreeNode } from "d3-flextree";
import type { Family, Tree } from "./types";
import { connectorPath } from "./connectorPath";
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
}

export interface TreeLayout {
  persons: PositionedPerson[];
  edges: PositionedEdge[];
  width: number;
  height: number;
}

interface RawEdge {
  id: string;
  sources: { x: number; y: number }[];
  target: { x: number; y: number };
  secondary?: boolean;
}

interface RawBridge {
  id: string;
  x1: number;
  x2: number;
  y: number;
  secondary?: boolean;
}

interface PendingChildPlacement {
  spouseId: string;
  spouseX: number;
  spouseY: number;
  childIds: string[];
}

// Accumulated pre-flip, pre-translation output of the layout pipeline:
// raw flextree-space coordinates plus the running bounding box.
interface RawLayout {
  persons: PositionedPerson[];
  edges: RawEdge[];
  bridges: RawBridge[];
  pendingChildPlacements: PendingChildPlacement[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const EMPTY_LAYOUT: TreeLayout = { persons: [], edges: [], width: 0, height: 0 };

// Renders as a pedigree chart: the tree's anchor person sits at the bottom,
// with their parents, grandparents, etc. fanning upward above them, and each
// ancestor's own siblings shown alongside them. A couple always shares one
// flextree node so they stay next to each other no matter how much deeper
// one side's known ancestry runs than the other's.
export function computeTreeLayout(tree: Tree): TreeLayout {
  if (!tree.persons[tree.rootPersonId]) return EMPTY_LAYOUT;

  const positionedRoot = layoutAncestorGroups(tree);
  const raw = collectPrimaryPositions(positionedRoot);
  placeSecondMarriageChildren(raw);
  return flipAndTranslate(raw);
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

// Walks each positioned row to compute every member's final x (row order
// was decided by buildAncestorGroup; flextree only positioned the row as a
// whole), and collects parent/child edges and couple bridges along the way.
function collectPrimaryPositions(positionedRoot: FlextreeNode<AncestorGroupNode>): RawLayout {
  const raw: RawLayout = {
    persons: [],
    edges: [],
    bridges: [],
    pendingChildPlacements: [],
    minX: Infinity,
    maxX: -Infinity,
    minY: 0,
    maxY: 0,
  };

  positionedRoot.each((node) => {
    const row = fullRow(node.data);
    const startX = node.x - rowWidth(row) / 2;
    const positionOf = new Map(row.map((personId, index) => [personId, startX + index * (NODE_WIDTH + SIBLING_GAP) + NODE_WIDTH / 2]));

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
    // parents, not just whoever continues the traced line.
    let childIndex = 0;
    for (const chunk of node.data.chunks) {
      if (chunk.parentGroup) {
        const parentNode = (node.children ?? [])[childIndex] as FlextreeNode<AncestorGroupNode>;
        childIndex += 1;

        const parentPositions = parentNode.data.chunks.map((c) => tracedPersonPosition(parentNode, c.tracedId));
        const parentX = parentPositions.reduce((sum, x) => sum + x, 0) / parentPositions.length;
        const parentY = parentNode.y;
        const parentKey = parentNode.data.chunks.map((c) => c.tracedId).join("+");

        raw.edges.push({
          id: `${chunk.row.join(",")}>${parentKey}`,
          sources: chunk.row.map((personId) => ({ x: positionOf.get(personId) as number, y: node.y })),
          target: { x: parentX, y: parentY },
        });
      }

      // Second marriages: the other spouse already got a place in `row`
      // (right next to chunk.tracedId), so the existing flextree pass
      // reserves their space and nothing else can ever land on top of them.
      // A dashed bridge marks the marriage; their children are queued for
      // placement below once every row's position is final (see
      // placeSecondMarriageChildren).
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

        if (marriage.childIds.length > 0) {
          raw.pendingChildPlacements.push({
            spouseId: marriage.spouseId,
            spouseX,
            spouseY: node.y,
            childIds: marriage.childIds,
          });
        }
      }
    }
  });

  return raw;
}

// Now that every row -- including each second marriage's spouse -- has a
// final position, place that marriage's children one generation below,
// exactly like any other parent/child pair. Try directly under the spouse
// first; if another box already occupies that generation there (unrelated
// primary content flextree had no reason to avoid, since it never knew
// about these extra children), step sideways until clear. Mutates `raw`.
function placeSecondMarriageChildren(raw: RawLayout): void {
  const rowStep = NODE_WIDTH + SIBLING_GAP;
  for (const placement of raw.pendingChildPlacements) {
    const { spouseId, spouseX, spouseY, childIds } = placement;
    const childCount = childIds.length;
    const generationY = spouseY - (GENERATION_GAP + NODE_HEIGHT);
    const occupiedXs = raw.persons.filter((p) => Math.abs(p.y - generationY) < 1).map((p) => p.x);

    const fits = (centerX: number) =>
      childIds.every((_, i) => {
        const x = centerX + (i - (childCount - 1) / 2) * rowStep;
        return occupiedXs.every((otherX) => Math.abs(otherX - x) >= rowStep);
      });

    let groupCenterX = spouseX;
    for (let attempt = 1; !fits(groupCenterX) && attempt < 500; attempt++) {
      const magnitude = Math.ceil(attempt / 2) * rowStep;
      groupCenterX = spouseX + (attempt % 2 === 1 ? magnitude : -magnitude);
    }

    const childPositions = childIds.map((childId, i) => ({
      personId: childId,
      x: groupCenterX + (i - (childCount - 1) / 2) * rowStep,
      y: generationY,
    }));
    for (const p of childPositions) {
      raw.persons.push(p);
      raw.minX = Math.min(raw.minX, p.x - NODE_WIDTH / 2);
      raw.maxX = Math.max(raw.maxX, p.x + NODE_WIDTH / 2);
      raw.minY = Math.min(raw.minY, p.y);
    }
    raw.edges.push({
      id: `${spouseId}-secondary-children`,
      secondary: true,
      sources: childPositions.map((p) => ({ x: p.x, y: generationY })),
      target: { x: spouseX, y: spouseY },
    });
  }
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
  // instead of the connector stopping short at the box's top edge.
  const connectorEdges: PositionedEdge[] = raw.edges.map((e) => ({
    id: e.id,
    secondary: e.secondary,
    path: connectorPath(
      e.sources.map((s) => ({ x: s.x + shiftX, y: flipY(s.y) + NODE_HEIGHT })),
      { x: e.target.x + shiftX, y: flipY(e.target.y) + NODE_HEIGHT / 2 },
    ),
  }));
  const bridgeEdges: PositionedEdge[] = raw.bridges.map((b) => {
    const y = flipY(b.y) + NODE_HEIGHT / 2;
    return { id: b.id, secondary: b.secondary, path: `M${b.x1 + shiftX},${y}L${b.x2 + shiftX},${y}` };
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
  const row = fullRow(node.data);
  const startX = node.x - rowWidth(row) / 2;
  const index = row.indexOf(personId);
  return startX + index * (NODE_WIDTH + SIBLING_GAP) + NODE_WIDTH / 2;
}
