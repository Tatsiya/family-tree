import { useMemo } from "react";
import type { KeyboardEvent } from "react";
import { NODE_HEIGHT, NODE_WIDTH } from "../../model/treeLayoutConstants";
import { buildPersonCardRows } from "../../model/formatPersonNode";
import type { MeasureTextWidth } from "../../model/textFit";
import { useTreeStore } from "../../store/treeStore";
import { GenderIcon } from "./GenderIcon";
import { sexStrokeClass } from "./sexColors";

export interface PersonNodeProps {
  personId: string;
  x: number;
  y: number;
}

const AVATAR_CY = 30;
const AVATAR_R = 22;

// A single offscreen canvas, reused across every card: canvas text
// measurement is cheap, but there's no reason to allocate one per node.
let measureContext: CanvasRenderingContext2D | null = null;

const measureCardText: MeasureTextWidth = (text, fontSize, bold) => {
  if (!measureContext) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return text.length * fontSize * 0.6; // no canvas support -- rough fallback
    measureContext = context;
  }
  measureContext.font = `${bold ? 600 : 400} ${fontSize}px "Playfair Display", serif`;
  return measureContext.measureText(text).width;
};

export function PersonNode({ personId, x, y }: PersonNodeProps) {
  const person = useTreeStore((s) => s.tree.persons[personId]);
  const togglePerson = useTreeStore((s) => s.togglePerson);

  const rows = useMemo(() => (person ? buildPersonCardRows(person, measureCardText) : []), [person]);

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
      {rows.map((row, index) => (
        <text
          key={index}
          x={NODE_WIDTH / 2}
          y={row.y}
          textAnchor="middle"
          className="fill-parchment-text font-serif"
          style={{ fontSize: row.fontSize, fontWeight: row.bold ? 600 : 400 }}
        >
          {row.text}
        </text>
      ))}
    </g>
  );
}
