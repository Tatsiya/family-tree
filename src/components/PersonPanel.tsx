import { useTreeStore } from "../store/treeStore";
import { X } from "lucide-react";
import PersonFields from "./PersonFields";
import { getRelatives } from "../model/relatives";

function PersonPanel() {
  const person = useTreeStore((s) =>
    s.selectedId ? s.tree.persons[s.selectedId] : undefined,
  );
  const tree = useTreeStore((s) => s.tree);
  const togglePerson = useTreeStore((s) => s.togglePerson);

  if (!person) return null;
  const relatives = getRelatives(tree, person.id);

  return (
    <div className="relative flex w-1/5 flex-col items-start overflow-y-auto bg-parchment-panel px-5 py-10 font-serif text-parchment-text shadow-[-4px_0_16px_rgba(0,0,0,0.1)]">
      <X
        size={20}
        className="absolute top-4 right-4 cursor-pointer"
        onClick={() => togglePerson(person.id)}
      />
      <PersonFields person={person} relatives={relatives} onSelectPerson={togglePerson} />
    </div>
  );
}

export default PersonPanel;
