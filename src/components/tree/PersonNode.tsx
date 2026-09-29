import type { KeyboardEvent } from "react";
import { NODE_HEIGHT, NODE_WIDTH } from "../../model/treeLayoutConstants";
import { useTreeStore } from "../../store/treeStore";
import { GenderIcon } from "./GenderIcon";
import { sexStrokeClass } from "./sexColors";

export interface PersonNodeProps {
  personId: string;
  x: number;
  y: number;
}

function fontSizeClass(text: string): string {
  if (text.length > 24) return "text-[9px]";
  if (text.length > 18) return "text-[11px]";
  return "text-[13px]";
}

function formatLifespan(dateOfBirth: string | undefined, dateOfDeath: string | undefined): string {
  const birthYear = dateOfBirth?.slice(0, 4);
  const deathYear = dateOfDeath?.slice(0, 4);
  if (birthYear && deathYear) return `${birthYear}–${deathYear}`;
  if (birthYear) return birthYear;
  if (deathYear) return `–${deathYear}`;
  return "";
}

function shortPlace(placeOfBirth: string | undefined): string | undefined {
  return placeOfBirth?.split(",")[0]?.trim() || undefined;
}

const AVATAR_CY = 30;
const AVATAR_R = 22;

export function PersonNode({ personId, x, y }: PersonNodeProps) {
  const person = useTreeStore((s) => s.tree.persons[personId]);
  const togglePerson = useTreeStore((s) => s.togglePerson);
  if (!person) return null;

  const givenNames = [person.name, person.middleName].filter(Boolean).join(" ");
  const place = shortPlace(person.placeOfBirth);

  function handleKeyDown(e: KeyboardEvent<SVGGElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      togglePerson(personId);
    }
  }

  return (
    <g
      transform={`translate(${x - NODE_WIDTH / 2}, ${y})`}
      className="cursor-pointer focus:outline-2 focus:outline-offset-1 focus:outline-parchment-border"
      role="button"
      tabIndex={0}
      aria-label={`${[person.name, person.middleName, person.lastName].filter(Boolean).join(" ")}`}
      onClick={() => togglePerson(personId)}
      onKeyDown={handleKeyDown}
    >
      <rect
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={16}
        strokeWidth={2}
        className={`fill-parchment-card ${sexStrokeClass(person.sex)}`}
      />
      <GenderIcon sex={person.sex} cx={NODE_WIDTH / 2} cy={AVATAR_CY} r={AVATAR_R} />
      <text
        x={NODE_WIDTH / 2}
        y={64}
        textAnchor="middle"
        className={`fill-parchment-text font-serif font-semibold ${fontSizeClass(givenNames)}`}
      >
        {givenNames}
      </text>
      <text
        x={NODE_WIDTH / 2}
        y={80}
        textAnchor="middle"
        className={`fill-parchment-text font-serif font-semibold ${fontSizeClass(person.lastName)}`}
      >
        {person.lastName}
      </text>
      {(person.dateOfBirth || person.dateOfDeath) && (
        <text
          x={NODE_WIDTH / 2}
          y={98}
          textAnchor="middle"
          className="fill-parchment-text font-serif text-xs"
        >
          {formatLifespan(person.dateOfBirth, person.dateOfDeath)}
        </text>
      )}
      {place && (
        <text
          x={NODE_WIDTH / 2}
          y={114}
          textAnchor="middle"
          className={`fill-parchment-text font-serif ${fontSizeClass(place)}`}
        >
          {place}
        </text>
      )}
    </g>
  );
}
