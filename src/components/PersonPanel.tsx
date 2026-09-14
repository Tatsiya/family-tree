import { useTreeStore } from "../store/treeStore";
import { X } from "lucide-react";
import PersonFields from "./PersonFields";

function PersonPanel() {
  const person = useTreeStore((s) =>
    s.selectedId ? s.tree.persons[s.selectedId] : undefined,
  );
  const togglePerson = useTreeStore((s) => s.togglePerson);

  if (!person) return null;
  return (
    <div className="relative flex w-1/5 flex-col items-start bg-parchment-panel px-5 py-10 font-serif text-parchment-text shadow-[-4px_0_16px_rgba(0,0,0,0.1)]">
      <X
        size={20}
        className="absolute top-4 right-4 cursor-pointer"
        onClick={() => togglePerson(person.id)}
      />
      <PersonFields person={person} />
    </div>
  );
}

export default PersonPanel;
