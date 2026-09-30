import type { PersonCardRowKind } from "./formatPersonNode";

// Measures a string's rendered width at a given font size/weight, for a
// given row kind (name/lastName/lifespan/place). Callers use the kind to
// pick the right font -- Cormorant Garamond for names, Manrope for
// everything else -- instead of guessing from fontSize or always assuming
// one font. Real measurement (canvas on screen, embedded-font metrics in a
// PDF) rather than a character-count guess, so text reliably fits the
// space it's given.
export type MeasureTextWidth = (text: string, fontSize: number, bold: boolean, kind: PersonCardRowKind) => number;

const ELLIPSIS = "…";

// Truncates text to the longest prefix (plus an ellipsis) that fits
// maxWidth at a fixed font size. Unlike shrinking the font, the size stays
// constant and only the string gets shorter.
export function truncateToFit(
  text: string,
  maxWidth: number,
  fontSize: number,
  bold: boolean,
  kind: PersonCardRowKind,
  measureWidth: MeasureTextWidth,
): string {
  if (measureWidth(text, fontSize, bold, kind) <= maxWidth) return text;

  let low = 0;
  let high = text.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate = text.slice(0, mid).trimEnd() + ELLIPSIS;
    if (measureWidth(candidate, fontSize, bold, kind) <= maxWidth) low = mid;
    else high = mid - 1;
  }

  return low > 0 ? text.slice(0, low).trimEnd() + ELLIPSIS : ELLIPSIS;
}

// Wraps text across at most two lines at a fixed font size, truncating the
// second line with an ellipsis if it still doesn't fit -- the font size
// itself never shrinks.
export function wrapToTwoLinesWithEllipsis(
  text: string,
  maxWidth: number,
  fontSize: number,
  bold: boolean,
  kind: PersonCardRowKind,
  measureWidth: MeasureTextWidth,
): string[] {
  if (measureWidth(text, fontSize, bold, kind) <= maxWidth) return [text];

  const words = text.split(" ");
  if (words.length < 2) {
    return [truncateToFit(text, maxWidth, fontSize, bold, kind, measureWidth)];
  }

  let firstLine = words[0];
  let firstLineWordCount = 1;
  for (let i = 1; i < words.length; i++) {
    const candidate = `${firstLine} ${words[i]}`;
    if (measureWidth(candidate, fontSize, bold, kind) > maxWidth) break;
    firstLine = candidate;
    firstLineWordCount++;
  }

  const remainder = words.slice(firstLineWordCount).join(" ");
  if (!remainder) return [firstLine];

  return [firstLine, truncateToFit(remainder, maxWidth, fontSize, bold, kind, measureWidth)];
}
