import { useTreeStore } from "./store/treeStore";
import PersonCard from "./components/PersonCard";
import PersonPanel from "./components/PersonPanel";
import Header from "./components/Header";

export default function App() {
  const persons = useTreeStore((s) => s.tree.persons);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1 justify-between bg-parchment-bg">
        {Object.keys(persons).map((id) => (
          <PersonCard key={id} personId={id} />
        ))}
        <PersonPanel />
      </div>
    </div>
  );
}
