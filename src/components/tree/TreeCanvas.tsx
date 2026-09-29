import { useMemo } from "react";
import { computeTreeLayout } from "../../model/treeLayout";
import type { Tree } from "../../model/types";
import { ConnectorLine } from "./ConnectorLine";
import { PersonNode } from "./PersonNode";

export interface TreeCanvasProps {
  tree: Tree;
}

export function TreeCanvas({ tree }: TreeCanvasProps) {
  const layout = useMemo(() => computeTreeLayout(tree), [tree]);

  if (layout.persons.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-10 text-center font-serif text-sm text-parchment-text">
        No family tree yet. Add a person or import a GEDCOM file to get
        started.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <svg width={layout.width} height={layout.height}>
        {layout.edges.map((edge) => (
          <ConnectorLine key={edge.id} path={edge.path} secondary={edge.secondary} kind={edge.kind} />
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
  );
}
