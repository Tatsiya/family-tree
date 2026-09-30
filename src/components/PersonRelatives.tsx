import type { Person } from "../model/types";
import type { Relatives } from "../model/relatives";
import { PersonRelativeRow } from "./PersonRelativeRow";

export interface PersonRelativesProps {
  relatives: Relatives;
  onSelectPerson: (personId: string) => void;
}

function spousesSectionTitle(spouses: Person[]): string {
  if (spouses.length > 1) return "Spouses";
  if (spouses[0]?.sex === "F") return "Wife";
  if (spouses[0]?.sex === "M") return "Husband";
  return "Spouse";
}

interface SectionProps {
  title: string;
  people: Person[];
  onSelectPerson: (personId: string) => void;
}

function Section({ title, people, onSelectPerson }: SectionProps) {
  if (people.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-[11px] font-bold tracking-[0.08em] text-gold uppercase">{title}</p>
      <div className="flex flex-col">
        {people.map((person) => (
          <PersonRelativeRow key={person.id} person={person} onSelect={onSelectPerson} />
        ))}
      </div>
    </div>
  );
}

export function PersonRelatives({ relatives, onSelectPerson }: PersonRelativesProps) {
  return (
    <>
      <Section title={spousesSectionTitle(relatives.spouses)} people={relatives.spouses} onSelectPerson={onSelectPerson} />
      <Section title="Parents" people={relatives.parents} onSelectPerson={onSelectPerson} />
      <Section
        title={`Children · ${relatives.children.length}`}
        people={relatives.children}
        onSelectPerson={onSelectPerson}
      />
      <Section
        title={`Siblings · ${relatives.siblings.length}`}
        people={relatives.siblings}
        onSelectPerson={onSelectPerson}
      />
      <Section
        title={`Half-siblings · ${relatives.halfSiblings.length}`}
        people={relatives.halfSiblings}
        onSelectPerson={onSelectPerson}
      />
    </>
  );
}
