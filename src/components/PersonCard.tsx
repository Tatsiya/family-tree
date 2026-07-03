import { useTreeStore } from "../store/treeStore";
import "../styles/PersonCard.css";

interface Props {
  personId: string;
}

function PersonCard({ personId }: Props) {
  const person = useTreeStore((s) => s.tree.persons[personId]);
  if (!person) return null;
  return (
    <div className="personCard">
      <p className="personName">
        {person.name +
          " " +
          (person.middleName ? person.middleName + " " : "") +
          person.lastName}
      </p>
      {person.dateOfBirth && (
        <p className="personBirthDate">{person.dateOfBirth?.slice(0, 4)}</p>
      )}
      <p className="personBirthPlace">{person.placeOfBirth}</p>
    </div>
  );
}

export default PersonCard;
