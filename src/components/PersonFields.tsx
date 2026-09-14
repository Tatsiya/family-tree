import { formatFullName } from "../model/formatFullName";
import type { Person } from "../model/types";

interface Props {
  person: Person;
  yearOnly?: boolean;
}

function PersonFields({ person, yearOnly }: Props) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-center text-xs">
      <p className="text-sm font-semibold">{formatFullName(person)}</p>
      {person.dateOfBirth && (
        <p>{yearOnly ? person.dateOfBirth.slice(0, 4) : person.dateOfBirth}</p>
      )}
      <p>{person.placeOfBirth}</p>
    </div>
  );
}

export default PersonFields;
