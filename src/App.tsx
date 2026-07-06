import { useTreeStore } from "./store/treeStore";
import PersonCard from "./components/PersonCard";
import PersonPanel from "./components/PersonPanel";
import "./App.css";

export default function App() {
  const persons = useTreeStore((s) => s.tree.persons);

  return (
    <div className="appContainer">
      {Object.keys(persons).map((id) => (
        <PersonCard key={id} personId={id} />
      ))}
      <PersonPanel />
    </div>
  );
}
