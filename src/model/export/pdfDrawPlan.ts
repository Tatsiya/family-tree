import type { Tree } from "../types";
import type { TreeLayout } from "../treeLayout";
import { NODE_HEIGHT, NODE_WIDTH } from "../treeLayoutConstants";
import { buildPersonCardRows } from "../formatPersonNode";
import type { MeasureTextWidth } from "../textFit";
import { FEMALE_ICON_PATH, MALE_ICON_PATH } from "./personNodeIcon";
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
  panel: RgbColor;
  border: RgbColor;
  borderMale: RgbColor;
  borderFemale: RgbColor;
  text: RgbColor;
}

export interface PdfConnector {
  path: string;
  strokeWidth: number;
  color: RgbColor;
  dashed: boolean;
}

export interface PdfPersonTextLine {
  text: string;
  fontSize: number;
  bold: boolean;
  y: number;
}

export interface PdfPersonCard {
  x: number;
  y: number;
  borderColor: RgbColor;
  iconPath: string;
  iconColor: RgbColor;
  iconCircleColor: RgbColor;
  lines: PdfPersonTextLine[];
}

export interface PdfDrawPlan {
  width: number;
  height: number;
  backgroundColor: RgbColor;
  cardPath: string;
  connectors: PdfConnector[];
  cards: PdfPersonCard[];
}

const AVATAR_CY = 30;
const AVATAR_R = 22;
const ICON_SIZE = AVATAR_R * 1.5;
const CARD_RADIUS = 16;

function sexBorderColor(sex: "M" | "F" | undefined, colors: PdfThemeColors): RgbColor {
  if (sex === "M") return colors.borderMale;
  if (sex === "F") return colors.borderFemale;
  return colors.border;
}

// Rebuilds the tree's visual content (cards, connectors, avatar icons, text)
// as plain draw data -- independent of pdf-lib and the DOM -- so the PDF
// export can be drawn as true vector content instead of a rasterized image.
// measureWidth lets the caller supply real font metrics (from the embedded
// PDF font) so long names wrap/shrink to fit exactly as they do on screen.
export function buildPdfDrawPlan(
  tree: Tree,
  layout: TreeLayout,
  colors: PdfThemeColors,
  measureWidth: MeasureTextWidth,
): PdfDrawPlan {
  const connectors: PdfConnector[] = layout.edges.map((edge) => ({
    path: edge.path,
    strokeWidth: edge.kind === "bridge" ? 3 : 1.5,
    color: colors.border,
    dashed: Boolean(edge.secondary),
  }));

  const cards: PdfPersonCard[] = layout.persons.flatMap((positioned) => {
    const person = tree.persons[positioned.personId];
    if (!person) return [];

    const borderColor = sexBorderColor(person.sex, colors);
    const lines: PdfPersonTextLine[] = buildPersonCardRows(person, measureWidth);

    const card: PdfPersonCard = {
      x: positioned.x - NODE_WIDTH / 2,
      y: positioned.y,
      borderColor,
      iconPath: person.sex === "F" ? FEMALE_ICON_PATH : MALE_ICON_PATH,
      iconColor: borderColor,
      iconCircleColor: colors.panel,
      lines,
    };
    return [card];
  });

  return {
    width: layout.width,
    height: layout.height,
    backgroundColor: colors.background,
    cardPath: roundedRectPath(NODE_WIDTH, NODE_HEIGHT, CARD_RADIUS),
    connectors,
    cards,
  };
}

export { AVATAR_CY, AVATAR_R, ICON_SIZE };
