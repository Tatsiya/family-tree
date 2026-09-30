import type { Person, Tree } from "../types";
import type { TreeLayout } from "../treeLayout";
import { NODE_HEIGHT, NODE_WIDTH } from "../treeLayoutConstants";
import { AVATAR_DIAMETER, CARD_TOP_PADDING, buildPersonCardRows } from "../formatPersonNode";
import type { PersonCardRowKind } from "../formatPersonNode";
import { getInitials } from "../initials";
import type { MeasureTextWidth } from "../textFit";
import { roundedRectPath } from "./roundedRectPath";

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

// Resolved values of the app's CSS color variables (see index.css), read
// once at export time since this module can't reach the DOM itself.
export interface PdfThemeColors {
  background: RgbColor;
  card: RgbColor;
  surface: RgbColor;
  border: RgbColor;
  line: RgbColor;
  gold: RgbColor;
  ink: RgbColor;
  inkSecondary: RgbColor;
  muted: RgbColor;
  maleBg: RgbColor;
  maleFg: RgbColor;
  femaleBg: RgbColor;
  femaleFg: RgbColor;
  neutralBg: RgbColor;
  neutralFg: RgbColor;
}

export interface PdfConnector {
  path: string;
  strokeWidth: number;
  color: RgbColor;
  dashed: boolean;
  // Center of the two-rings badge drawn on a couple's marriage bridge (see
  // ConnectorLine.tsx for the on-screen equivalent) -- unset for a plain
  // parent/child connector.
  ringBadgeCenter?: { x: number; y: number };
}

export interface PdfPersonTextLine {
  text: string;
  fontSize: number;
  bold: boolean;
  y: number;
  kind: PersonCardRowKind;
}

export interface PdfPersonCard {
  x: number;
  y: number;
  avatarFill: RgbColor;
  avatarText: RgbColor;
  initials: string;
  lines: PdfPersonTextLine[];
}

export interface PdfDrawPlan {
  width: number;
  height: number;
  backgroundColor: RgbColor;
  cardPath: string;
  borderColor: RgbColor;
  connectors: PdfConnector[];
  cards: PdfPersonCard[];
}

export const AVATAR_R = AVATAR_DIAMETER / 2;
export const AVATAR_CY = CARD_TOP_PADDING + AVATAR_R;
export const RING_BADGE_RADIUS = 11;
const CARD_RADIUS = 14;

function avatarColors(sex: "M" | "F" | undefined, colors: PdfThemeColors): { fill: RgbColor; text: RgbColor } {
  if (sex === "M") return { fill: colors.maleBg, text: colors.maleFg };
  if (sex === "F") return { fill: colors.femaleBg, text: colors.femaleFg };
  return { fill: colors.neutralBg, text: colors.neutralFg };
}

// Rebuilds the tree's visual content (cards, connectors, avatars, text) as
// plain draw data -- independent of pdf-lib and the DOM -- so the PDF
// export can be drawn as true vector content instead of a rasterized image.
// measureWidth lets the caller supply real font metrics (from the embedded
// PDF fonts) so long names wrap/shrink to fit exactly as they do on screen.
export function buildPdfDrawPlan(
  tree: Tree,
  layout: TreeLayout,
  colors: PdfThemeColors,
  measureWidth: MeasureTextWidth,
): PdfDrawPlan {
  const connectors: PdfConnector[] = layout.edges.map((edge) => ({
    path: edge.path,
    strokeWidth: edge.kind === "bridge" ? 3 : 2,
    color: colors.line,
    dashed: Boolean(edge.secondary),
    ringBadgeCenter: edge.ringBadgeCenter,
  }));

  const cards: PdfPersonCard[] = layout.persons.flatMap((positioned) => {
    const person: Person | undefined = tree.persons[positioned.personId];
    if (!person) return [];

    const { fill, text } = avatarColors(person.sex, colors);
    const lines: PdfPersonTextLine[] = buildPersonCardRows(person, measureWidth);

    const card: PdfPersonCard = {
      x: positioned.x - NODE_WIDTH / 2,
      y: positioned.y,
      avatarFill: fill,
      avatarText: text,
      initials: getInitials(person),
      lines,
    };
    return [card];
  });

  return {
    width: layout.width,
    height: layout.height,
    backgroundColor: colors.background,
    cardPath: roundedRectPath(NODE_WIDTH, NODE_HEIGHT, CARD_RADIUS),
    borderColor: colors.border,
    connectors,
    cards,
  };
}
