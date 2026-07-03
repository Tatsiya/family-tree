import { useTreeStore } from "../store/treeStore";

interface Props {
  personId: string
}

function PersonCard({ personId } : Props) {
  const person = useTreeStore((s) => s.tree.persons[personId]);
  return <div>{person.name + person.lastName}</div>;
}

export default PersonCard;
