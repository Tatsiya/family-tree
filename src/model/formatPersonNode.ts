import type { Person } from "./types";
import { NODE_WIDTH } from "./treeLayoutConstants";
import { fitOrWrapText } from "./textFit";
import type { MeasureTextWidth } from "./textFit";

// Shared between the on-screen PersonNode and the PDF export renderer, so
// both lay out a person's card text identically.

export function formatLifespan(dateOfBirth: string | undefined, dateOfDeath: string | undefined): string {
  const birthYear = dateOfBirth?.slice(0, 4);
  const deathYear = dateOfDeath?.slice(0, 4);
  if (birthYear && deathYear) return `${birthYear}–${deathYear}`;
  if (birthYear) return birthYear;
  if (deathYear) return `–${deathYear}`;
  return "";
}

export function shortPlace(placeOfBirth: string | undefined): string | undefined {
  return placeOfBirth?.split(",")[0]?.trim() || undefined;
}

export interface PersonCardRow {
  text: string;
  fontSize: number;
  bold: boolean;
  y: number;
}

// Horizontal padding keeps text off the card's rounded corners and border.
const CARD_TEXT_WIDTH = NODE_WIDTH - 24;
const NAME_FONT_SIZES = [13, 11, 9];
const SECONDARY_FONT_SIZES = [12, 10, 9];
// The card has room for about this many text rows below the avatar before
// text would run past its bottom edge; a name long enough to wrap onto two
// lines pushes place out first, since it's the least essential detail.
const MAX_ROWS = 5;

const CARD_TEXT_TOP_Y = 64;
const CARD_LINE_HEIGHT = 16;

export function buildPersonCardRows(person: Person, measureWidth: MeasureTextWidth): PersonCardRow[] {
  const givenNames = [person.name, person.middleName].filter(Boolean).join(" ");
  const lifespan = formatLifespan(person.dateOfBirth, person.dateOfDeath);
  const place = shortPlace(person.placeOfBirth);

  const nameRows = givenNames
    ? fitOrWrapText(givenNames, CARD_TEXT_WIDTH, NAME_FONT_SIZES, true, measureWidth)
    : [];
  const lastNameRows = person.lastName
    ? fitOrWrapText(person.lastName, CARD_TEXT_WIDTH, NAME_FONT_SIZES, true, measureWidth)
    : [];

  const rows: Omit<PersonCardRow, "y">[] = [
    ...nameRows.map((row) => ({ ...row, bold: true })),
    ...lastNameRows.map((row) => ({ ...row, bold: true })),
  ];

  if (lifespan) rows.push({ text: lifespan, fontSize: 12, bold: false });

  // A given name that fits on one line leaves a line's worth of space
  // unused compared to a wrapped one -- rather than let that sit as a gap
  // between the name and whatever follows, start one row lower, so the
  // block reads the same whether the name wrapped or not.
  const startRow = nameRows.length < 2 ? 1 : 0;

  if (place) {
    const placeRows = fitOrWrapText(place, CARD_TEXT_WIDTH, SECONDARY_FONT_SIZES, false, measureWidth).map(
      (row) => ({ ...row, bold: false }),
    );
    if (startRow + rows.length + placeRows.length <= MAX_ROWS) rows.push(...placeRows);
  }

  return rows.slice(0, MAX_ROWS - startRow).map((row, index) => ({
    ...row,
    y: CARD_TEXT_TOP_Y + (startRow + index) * CARD_LINE_HEIGHT,
  }));
}
