import { useRef } from "react";
import { useTreeStore } from "./store/treeStore";
import { TreeCanvas } from "./components/tree/TreeCanvas";
import PersonPanel from "./components/PersonPanel";
import Header from "./components/Header";

export default function App() {
  const tree = useTreeStore((s) => s.tree);
  const svgRef = useRef<SVGSVGElement>(null);

  return (
    <div className="flex h-screen flex-col">
      <Header svgRef={svgRef} />
      <div className="flex min-h-0 flex-1 justify-between">
        <TreeCanvas tree={tree} svgRef={svgRef} />
        <PersonPanel />
      </div>
    </div>
  );
}
