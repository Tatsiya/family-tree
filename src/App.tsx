import { useTreeStore } from "./store/treeStore";
import { TreeCanvas } from "./components/tree/TreeCanvas";
import PersonPanel from "./components/PersonPanel";
import Header from "./components/Header";

export default function App() {
  const tree = useTreeStore((s) => s.tree);

  return (
    <div className="flex h-screen flex-col">
      <Header />
      <div className="flex min-h-0 flex-1 justify-between bg-parchment-bg">
        <TreeCanvas tree={tree} />
        <PersonPanel />
      </div>
    </div>
  );
}
