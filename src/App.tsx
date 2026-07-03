import { useTreeStore } from "./store/treeStore";
import PersonCard from "./components/PersonCard";

export default function App() {
  const persons = useTreeStore((s) => s.tree.persons);

  return (
    <div>
      {Object.keys(persons).map((id) => (
        <PersonCard key={id} personId={id} />
      ))}
    </div>
  );
}
