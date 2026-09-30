import { formatShortName } from "../model/formatShortName";
import { formatLifespan } from "../model/formatPersonNode";
import { getInitials } from "../model/initials";
import type { Person } from "../model/types";
import { PersonAvatarBadge } from "./PersonAvatarBadge";

export interface PersonRelativeRowProps {
  person: Person;
  onSelect: (personId: string) => void;
}

export function PersonRelativeRow({ person, onSelect }: PersonRelativeRowProps) {
  const lifespan = formatLifespan(person.dateOfBirth, person.dateOfDeath);

  return (
    <button
      type="button"
      onClick={() => onSelect(person.id)}
      className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-hover-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <PersonAvatarBadge sex={person.sex} initials={getInitials(person)} size={30} fontSize={12} />
      <span className="flex-1 truncate text-sm font-bold text-ink">{formatShortName(person)}</span>
      {lifespan && <span className="shrink-0 text-xs text-muted">{lifespan}</span>}
    </button>
  );
}
