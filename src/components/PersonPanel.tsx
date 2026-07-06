import { useTreeStore } from "../store/treeStore";
import "../styles/PersonPanel.css";
import { X } from "lucide-react";

function PersonPanel() {
  const person = useTreeStore((s) =>
    s.selectedId ? s.tree.persons[s.selectedId] : undefined,
  );
  const togglePerson = useTreeStore((s) => s.togglePerson);

  if (!person) return null;
  return (
    <div className="personPanel">
      <X
        size={20}
        className="closeButton"
        onClick={() => togglePerson(person.id)}
      />
      <p className="personName">
        {person.name +
          " " +
          (person.middleName ? person.middleName + " " : "") +
          person.lastName}
      </p>
      {person.dateOfBirth && (
        <p className="personBirthDate">{person.dateOfBirth}</p>
      )}
      <p className="personBirthPlace">{person.placeOfBirth}</p>
    </div>
  );
}

export default PersonPanel;
