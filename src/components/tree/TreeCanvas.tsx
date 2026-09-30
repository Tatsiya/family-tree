import { useEffect, useMemo } from "react";
import type { RefObject } from "react";
import { computeTreeLayout } from "../../model/treeLayout";
import { NODE_HEIGHT } from "../../model/treeLayoutConstants";
import type { Tree } from "../../model/types";
import { useZoomPan } from "../../hooks/useZoomPan";
import { useTreeStore } from "../../store/treeStore";
import { ConnectorLine } from "./ConnectorLine";
import { edgeConnectsToPerson } from "./edgeHighlight";
import { PersonNode } from "./PersonNode";
import { ZoomControls } from "./ZoomControls";

export interface TreeCanvasProps {
  tree: Tree;
  svgRef: RefObject<SVGSVGElement | null>;
}

export function TreeCanvas({ tree, svgRef }: TreeCanvasProps) {
  const layout = useMemo(() => computeTreeLayout(tree), [tree]);
  const selectedId = useTreeStore((s) => s.selectedId);
  const { scrollRef, scale, zoomIn, zoomOut, canZoomIn, canZoomOut, centerOn, isPanning } = useZoomPan();

  const highlightedEdgeIds = useMemo(() => {
    if (!selectedId) return new Set<string>();
    return new Set(layout.edges.filter((edge) => edgeConnectsToPerson(edge.id, selectedId)).map((edge) => edge.id));
  }, [layout.edges, selectedId]);

  useEffect(() => {
    const root = layout.persons.find((p) => p.personId === tree.rootPersonId);
    if (root) centerOn(root.x, root.y + NODE_HEIGHT / 2);
    // Re-center only when the tree is re-rooted, not on every edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree.rootPersonId]);

  if (layout.persons.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-10 text-center text-sm text-ink">
        No family tree yet. Add a person or import a GEDCOM file to get
        started.
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={scrollRef}
        className={`h-full overflow-auto p-6 ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          width={layout.width * scale}
          height={layout.height * scale}
        >
          {layout.edges.map((edge) => (
            <ConnectorLine
              key={edge.id}
              path={edge.path}
              secondary={edge.secondary}
              kind={edge.kind}
              highlighted={highlightedEdgeIds.has(edge.id)}
              ringBadgeCenter={edge.ringBadgeCenter}
            />
          ))}
          {layout.persons.map((person) => (
            <PersonNode
              key={person.personId}
              personId={person.personId}
              x={person.x}
              y={person.y}
            />
          ))}
        </svg>
      </div>
      <ZoomControls
        scale={scale}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        canZoomIn={canZoomIn}
        canZoomOut={canZoomOut}
        className="absolute bottom-6 right-6"
      />
    </div>
  );
}
