import { formatFullName } from "../model/formatFullName";
import { formatDate } from "../model/formatDate";
import type { Person } from "../model/types";
import type { Relatives } from "../model/relatives";

interface Props {
  person: Person;
  relatives?: Relatives;
  onSelectPerson?: (personId: string) => void;
}

const LABEL_CLASS = "text-[10px] tracking-wide text-parchment-text/60 uppercase";

interface FieldProps {
  label: string;
  value: string;
}

function Field({ label, value }: FieldProps) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={LABEL_CLASS}>{label}:</span>
      <p>{value}</p>
    </div>
  );
}

interface RelativeGroupProps {
  label: string;
  people: Person[];
  onSelectPerson?: (personId: string) => void;
}

function RelativeGroup({ label, people, onSelectPerson }: RelativeGroupProps) {
  if (people.length === 0) return null;

  return (
    <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
      <span className={LABEL_CLASS}>{label}:</span>
      {people.map((person, index) => (
        <span key={person.id}>
          <button
            type="button"
            className="text-parchment-text underline-offset-2 hover:underline focus:outline-2 focus:outline-offset-1 focus:outline-parchment-border"
            onClick={() => onSelectPerson?.(person.id)}
          >
            {formatFullName(person)}
          </button>
          {index < people.length - 1 && ","}
        </span>
      ))}
    </div>
  );
}

function PersonFields({ person, relatives, onSelectPerson }: Props) {
  return (
    <div className="flex w-full flex-col items-start gap-4 text-left text-xs">
      <p className="text-sm font-semibold">{formatFullName(person)}</p>

      <div className="flex flex-col items-start gap-2">
        {person.dateOfBirth && <Field label="Born" value={formatDate(person.dateOfBirth)} />}
        {person.dateOfDeath && <Field label="Died" value={formatDate(person.dateOfDeath)} />}
        {person.placeOfBirth && (
          <Field label="Place of birth" value={person.placeOfBirth} />
        )}
      </div>

      {relatives && (
        <div className="flex flex-col items-start gap-2">
          <RelativeGroup
            label="Parents"
            people={relatives.parents}
            onSelectPerson={onSelectPerson}
          />
          <RelativeGroup
            label="Siblings"
            people={relatives.siblings}
            onSelectPerson={onSelectPerson}
          />
          <RelativeGroup
            label="Half-siblings"
            people={relatives.halfSiblings}
            onSelectPerson={onSelectPerson}
          />
          <RelativeGroup
            label={relatives.spouses.length > 1 ? "Spouses" : "Spouse"}
            people={relatives.spouses}
            onSelectPerson={onSelectPerson}
          />
          <RelativeGroup
            label="Children"
            people={relatives.children}
            onSelectPerson={onSelectPerson}
          />
        </div>
      )}
    </div>
  );
}

export default PersonFields;
