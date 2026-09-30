import { X, MapPin } from "lucide-react";
import { useTreeStore } from "../store/treeStore";
import { getRelatives } from "../model/relatives";
import { formatShortName } from "../model/formatShortName";
import { formatLifeSummary } from "../model/formatLifeSummary";
import { getInitials } from "../model/initials";
import { splitPlace } from "../model/splitPlace";
import { PersonAvatarBadge } from "./PersonAvatarBadge";
import { PersonRelatives } from "./PersonRelatives";

function PersonPanel() {
  const person = useTreeStore((s) =>
    s.selectedId ? s.tree.persons[s.selectedId] : undefined,
  );
  const tree = useTreeStore((s) => s.tree);
  const togglePerson = useTreeStore((s) => s.togglePerson);

  if (!person) return null;
  const relatives = getRelatives(tree, person.id);
  const lifeSummary = formatLifeSummary(person.dateOfBirth, person.dateOfDeath);
  const place = person.placeOfBirth ? splitPlace(person.placeOfBirth) : undefined;

  return (
    <div
      className="animate-panel-in relative flex w-[340px] shrink-0 flex-col gap-[22px] overflow-y-auto border-l border-border-soft bg-surface px-[26px] py-7 text-ink
        max-[900px]:fixed max-[900px]:inset-x-0 max-[900px]:bottom-0 max-[900px]:top-auto max-[900px]:z-30 max-[900px]:max-h-[75vh]
        max-[900px]:w-full max-[900px]:rounded-t-2xl max-[900px]:border-t max-[900px]:border-l-0"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute top-3 right-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-transparent text-ink transition-colors hover:bg-hover-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        onClick={() => togglePerson(person.id)}
      >
        <X size={20} />
      </button>

      <div className="flex flex-col items-center gap-2 text-center">
        <PersonAvatarBadge sex={person.sex} initials={getInitials(person)} size={84} fontSize={34} ring />
        <p className="font-serif text-[32px] leading-tight font-bold text-ink">{formatShortName(person)}</p>
        {lifeSummary && <p className="text-sm text-ink-2">{lifeSummary}</p>}
        {place && (
          <div className="flex flex-col items-center gap-0.5 pt-1">
            <span className="flex items-center gap-[5px]">
              <MapPin size={12} className="shrink-0 stroke-gold" />
              <span className="text-sm font-bold text-ink-2">{place.headline}</span>
            </span>
            {place.detail && (
              <span className="max-w-[260px] text-center text-[12.5px] leading-[1.4] text-muted">
                {place.detail}
              </span>
            )}
          </div>
        )}
      </div>

      <PersonRelatives relatives={relatives} onSelectPerson={togglePerson} />
    </div>
  );
}

export default PersonPanel;
