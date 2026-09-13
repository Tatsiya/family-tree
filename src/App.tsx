import { useTreeStore } from "./store/treeStore";
import PersonCard from "./components/PersonCard";
import PersonPanel from "./components/PersonPanel";
import Header from "./components/Header";
import "./App.css";

export default function App() {
  const persons = useTreeStore((s) => s.tree.persons);

  return (
    <div className="appRoot">
      <Header />
      <div className="appContainer">
        {Object.keys(persons).map((id) => (
          <PersonCard key={id} personId={id} />
        ))}
        <PersonPanel />
      </div>
    </div>
  );
}
