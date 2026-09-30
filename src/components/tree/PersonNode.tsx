import { useMemo } from "react";
import type { KeyboardEvent } from "react";
import { MapPin } from "lucide-react";
import { NODE_HEIGHT, NODE_WIDTH } from "../../model/treeLayoutConstants";
import {
  buildPersonCardRows,
  AVATAR_DIAMETER,
  CARD_TOP_PADDING,
  PLACE_ICON_BASELINE_OFFSET_RATIO,
  PLACE_ICON_GAP,
  PLACE_ICON_SIZE,
} from "../../model/formatPersonNode";
import type { PersonCardRow } from "../../model/formatPersonNode";
import { getInitials } from "../../model/initials";
import type { MeasureTextWidth } from "../../model/textFit";
import { useTreeStore } from "../../store/treeStore";
import { PersonAvatar } from "./PersonAvatar";

function rowClassName(kind: PersonCardRow["kind"]): string {
  switch (kind) {
    case "name":
      return "fill-ink font-serif font-bold";
    case "lastName":
      // Text content is already uppercased (see formatPersonNode) so it
      // reads the same on screen and in every export format.
      return "fill-ink-2 font-bold tracking-[0.07em]";
    default:
      return "fill-muted";
  }
}

export interface PersonNodeProps {
  personId: string;
  x: number;
  y: number;
}

const AVATAR_R = AVATAR_DIAMETER / 2;
const AVATAR_CY = CARD_TOP_PADDING + AVATAR_R;

// A single offscreen canvas per font family, reused across every card:
// canvas text measurement is cheap, but there's no reason to allocate one
// per node, or one per font.
function createMeasurer(fontFamily: string): (text: string, fontSize: number, bold: boolean) => number {
  let context: CanvasRenderingContext2D | null = null;
  return (text, fontSize, bold) => {
    if (!context) {
      const canvas = document.createElement("canvas");
      const created = canvas.getContext("2d");
      if (!created) return text.length * fontSize * 0.6; // no canvas support -- rough fallback
      context = created;
    }
    context.font = `${bold ? 600 : 400} ${fontSize}px "${fontFamily}"`;
    return context.measureText(text).width;
  };
}

// The name row renders in Cormorant Garamond; every other row (last name,
// lifespan, place) renders in Manrope -- measuring each with the font it's
// actually shown in keeps wrapping/truncation, and the place row's icon
// centering, accurate.
const measureSerif = createMeasurer("Cormorant Garamond");
const measureSans = createMeasurer("Manrope");
const measureCardText: MeasureTextWidth = (text, fontSize, bold, kind) =>
  kind === "name" ? measureSerif(text, fontSize, bold) : measureSans(text, fontSize, bold);

export function PersonNode({ personId, x, y }: PersonNodeProps) {
  const person = useTreeStore((s) => s.tree.persons[personId]);
  const isSelected = useTreeStore((s) => s.selectedId === personId);
  const togglePerson = useTreeStore((s) => s.togglePerson);

  const rows = useMemo(() => (person ? buildPersonCardRows(person, measureCardText) : []), [person]);

  // Icon + text are centered together as one inline unit, rather than the
  // icon sitting at a fixed offset from the card's center while the text is
  // independently centered on its own -- which is what let a short place
  // name's text overlap the icon. Computed alongside `rows` (not at render
  // time on every render) since it only depends on the place row's already
  // -fitted text.
  const placeIconStartX = useMemo(() => {
    const placeRow = rows.find((row) => row.kind === "place");
    if (!placeRow) return null;
    const textWidth = measureSans(placeRow.text, placeRow.fontSize, false);
    const combinedWidth = PLACE_ICON_SIZE + PLACE_ICON_GAP + textWidth;
    return NODE_WIDTH / 2 - combinedWidth / 2;
  }, [rows]);

  if (!person) return null;

  function handleKeyDown(e: KeyboardEvent<SVGGElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      togglePerson(personId);
    }
  }

  return (
    <g
      transform={`translate(${x - NODE_WIDTH / 2}, ${y})`}
      className="cursor-pointer outline-none transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      role="button"
      tabIndex={0}
      aria-label={`${[person.name, person.middleName, person.lastName].filter(Boolean).join(" ")}`}
      onClick={() => togglePerson(personId)}
      onKeyDown={handleKeyDown}
    >
      <rect
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={14}
        strokeWidth={isSelected ? 2 : 1}
        className={
          isSelected
            ? "fill-card stroke-accent drop-shadow-[0_10px_16px_rgba(74,52,30,0.14)]"
            : "fill-card stroke-border transition-colors hover:stroke-[#D9C7A8] drop-shadow-[0_4px_10px_rgba(74,52,30,0.08)]"
        }
      />
      <PersonAvatar sex={person.sex} initials={getInitials(person)} cx={NODE_WIDTH / 2} cy={AVATAR_CY} r={AVATAR_R} />
      {rows.map((row, index) => {
        if (row.kind === "place" && placeIconStartX !== null) {
          return (
            <g key={index}>
              <MapPin
                x={placeIconStartX}
                y={row.y - row.fontSize * PLACE_ICON_BASELINE_OFFSET_RATIO}
                size={PLACE_ICON_SIZE}
                className="fill-none stroke-gold"
              />
              <text
                x={placeIconStartX + PLACE_ICON_SIZE + PLACE_ICON_GAP}
                y={row.y}
                textAnchor="start"
                className={rowClassName(row.kind)}
                style={{ fontSize: row.fontSize }}
              >
                {row.text}
              </text>
            </g>
          );
        }

        return (
          <text
            key={index}
            x={NODE_WIDTH / 2}
            y={row.y}
            textAnchor="middle"
            className={rowClassName(row.kind)}
            style={{ fontSize: row.fontSize }}
          >
            {row.text}
          </text>
        );
      })}
    </g>
  );
}
