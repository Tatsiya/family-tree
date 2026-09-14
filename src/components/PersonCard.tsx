import { useTreeStore } from "../store/treeStore";
import PersonFields from "./PersonFields";

interface Props {
  personId: string;
}

function PersonCard({ personId }: Props) {
  const person = useTreeStore((s) => s.tree.persons[personId]);
  const togglePerson = useTreeStore((s) => s.togglePerson);
  if (!person) return null;

  return (
    <div
      className="flex h-fit w-fit cursor-pointer flex-col rounded-[20px] border border-parchment-border bg-parchment-card px-10 py-5 font-serif text-parchment-text"
      onClick={() => togglePerson(personId)}
    >
      <PersonFields person={person} yearOnly />
    </div>
  );
}

export default PersonCard;
