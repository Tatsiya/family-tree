import type { Person } from "./types";
import { NODE_WIDTH } from "./treeLayoutConstants";
import { splitPlace } from "./splitPlace";
import { truncateToFit, wrapToTwoLinesWithEllipsis } from "./textFit";
import type { MeasureTextWidth } from "./textFit";

// Shared between the on-screen PersonNode and the PDF export renderer, so
// both lay out a person's card text identically.

export function formatLifespan(dateOfBirth: string | undefined, dateOfDeath: string | undefined): string {
  const birthYear = dateOfBirth?.slice(0, 4);
  const deathYear = dateOfDeath?.slice(0, 4);
  if (birthYear && deathYear) return `${birthYear} – ${deathYear}`;
  if (birthYear) return birthYear;
  if (deathYear) return `– ${deathYear}`;
  return "";
}

export function shortPlace(placeOfBirth: string | undefined): string | undefined {
  return placeOfBirth ? splitPlace(placeOfBirth).headline || undefined : undefined;
}

export type PersonCardRowKind = "name" | "lastName" | "lifespan" | "place";

export interface PersonCardRow {
  text: string;
  fontSize: number;
  bold: boolean;
  y: number;
  // Which part of the card this row renders -- lets the on-screen card give
  // each kind its own type treatment (the PDF renderer only uses
  // text/fontSize/bold/y, so this is purely a screen-rendering hint).
  kind: PersonCardRowKind;
}

// Horizontal padding keeps text off the card's rounded corners and border.
const CARD_SIDE_PADDING = 8;
const CARD_TEXT_WIDTH = NODE_WIDTH - CARD_SIDE_PADDING * 2;

// Card geometry shared with the avatar drawn on top of it -- both the
// on-screen SVG card and the PDF renderer derive the avatar's position from
// these instead of each hardcoding its own copy of the same numbers.
export const CARD_TOP_PADDING = 10;
export const AVATAR_DIAMETER = 34;
// Ratio of an avatar's initials font size to its radius (a 17px-radius
// avatar gets 16px initials) -- shared so every renderer uses the same
// proportion.
export const AVATAR_INITIALS_FONT_RATIO = 16 / 17;

const AVATAR_GAP = 5;
// Gap between rows of different kinds -- not between a wrapped name's own
// two lines, which use NAME_LINE_HEIGHT for that instead.
const ROW_GAP = 2;

const NAME_FONT_SIZE = 17;
const NAME_LINE_HEIGHT = 1.1;
const LAST_NAME_FONT_SIZE = 10.5;
const LIFESPAN_FONT_SIZE = 11;
const PLACE_FONT_SIZE = 10.5;

// The place row's icon (drawn by PersonNode/the PDF renderer) sits before
// its text -- reserved here too, so the text is truncated to leave it room
// instead of being measured against the card's full width and overlapping
// it once the icon is drawn.
export const PLACE_ICON_SIZE = 10;
export const PLACE_ICON_GAP = 3;
// How far above the text baseline the icon's own top edge sits.
export const PLACE_ICON_BASELINE_OFFSET_RATIO = 0.8;

// How far below a line box's top a line's SVG baseline sits -- close enough
// for both the on-screen fonts and the PDF's embedded ones to stack rows
// tightly without per-font metrics.
const BASELINE_RATIO = 0.78;
// Generic single-line box height (ascent + descent + a little breathing
// room) for rows that are never more than one line: last name, years, place.
const SINGLE_LINE_HEIGHT = 1.15;

export function buildPersonCardRows(person: Person, measureWidth: MeasureTextWidth): PersonCardRow[] {
  const givenNames = [person.name, person.middleName].filter(Boolean).join(" ");
  const lifespan = formatLifespan(person.dateOfBirth, person.dateOfDeath);
  const place = shortPlace(person.placeOfBirth);

  const rows: Omit<PersonCardRow, "y">[] = [];

  if (givenNames) {
    for (const line of wrapToTwoLinesWithEllipsis(
      givenNames,
      CARD_TEXT_WIDTH,
      NAME_FONT_SIZE,
      true,
      "name",
      measureWidth,
    )) {
      rows.push({ text: line, fontSize: NAME_FONT_SIZE, bold: true, kind: "name" });
    }
  }

  if (person.lastName) {
    // Uppercased here, in the actual text content, rather than left to a
    // screen-only CSS text-transform -- the PDF renderer draws this string
    // as-is, with no CSS of its own to apply the same transform.
    rows.push({
      text: truncateToFit(
        person.lastName.toUpperCase(),
        CARD_TEXT_WIDTH,
        LAST_NAME_FONT_SIZE,
        true,
        "lastName",
        measureWidth,
      ),
      fontSize: LAST_NAME_FONT_SIZE,
      bold: true,
      kind: "lastName",
    });
  }

  if (lifespan) {
    rows.push({ text: lifespan, fontSize: LIFESPAN_FONT_SIZE, bold: false, kind: "lifespan" });
  }

  if (place) {
    const placeMaxWidth = CARD_TEXT_WIDTH - PLACE_ICON_SIZE - PLACE_ICON_GAP;
    rows.push({
      text: truncateToFit(place, placeMaxWidth, PLACE_FONT_SIZE, false, "place", measureWidth),
      fontSize: PLACE_FONT_SIZE,
      bold: false,
      kind: "place",
    });
  }

  // Rows stack tightly from just under the avatar: each row's own height
  // advances the cursor, with a small fixed gap between rows of different
  // kinds -- rather than every row claiming a fixed-size slot regardless of
  // how tall it actually is, which is what used to leave a gap under the
  // avatar whenever the name rendered smaller than that slot assumed.
  let cursorTop = CARD_TOP_PADDING + AVATAR_DIAMETER + AVATAR_GAP;
  let previousKind: PersonCardRowKind | undefined;

  return rows.map((row) => {
    const isWrappedNameLine = previousKind === "name" && row.kind === "name";
    if (previousKind !== undefined && !isWrappedNameLine) cursorTop += ROW_GAP;

    const lineHeight = row.kind === "name" ? row.fontSize * NAME_LINE_HEIGHT : row.fontSize * SINGLE_LINE_HEIGHT;
    const y = cursorTop + row.fontSize * BASELINE_RATIO;
    cursorTop += lineHeight;
    previousKind = row.kind;

    return { ...row, y };
  });
}
