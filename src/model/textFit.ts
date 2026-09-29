export interface FittedTextRow {
  text: string;
  fontSize: number;
}

// Measures a string's rendered width at a given font size/weight. Real
// measurement (canvas on screen, embedded-font metrics in a PDF) rather
// than a character-count guess, so text reliably fits the space it's given.
export type MeasureTextWidth = (text: string, fontSize: number, bold: boolean) => number;

// Floor for the proportional shrink below -- font metrics scale linearly
// enough with size that this stays reliable, but a pathologically long
// single word (no space to wrap at) could otherwise shrink toward zero.
const MIN_FONT_SIZE = 6;

// Picks the largest font size (from candidateSizes, largest first) whose
// rendered width fits within maxWidth. If none fit, wraps the text across
// two lines at the smallest candidate size, splitting at whichever word
// boundary balances the two lines' widths most evenly -- then, since that
// split is only chosen to balance the halves and isn't itself guaranteed to
// fit, shrinks both lines together (proportionally, so they stay the same
// size as each other) until the wider one does.
export function fitOrWrapText(
  text: string,
  maxWidth: number,
  candidateSizes: number[],
  bold: boolean,
  measureWidth: MeasureTextWidth,
): FittedTextRow[] {
  for (const fontSize of candidateSizes) {
    if (measureWidth(text, fontSize, bold) <= maxWidth) return [{ text, fontSize }];
  }

  const startingSize = candidateSizes[candidateSizes.length - 1];
  const words = text.split(" ");

  if (words.length < 2) {
    return [{ text, fontSize: shrinkToFit(text, maxWidth, startingSize, bold, measureWidth) }];
  }

  let bestSplit = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const line1Width = measureWidth(words.slice(0, i).join(" "), startingSize, bold);
    const line2Width = measureWidth(words.slice(i).join(" "), startingSize, bold);
    const diff = Math.abs(line1Width - line2Width);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestSplit = i;
    }
  }

  const line1 = words.slice(0, bestSplit).join(" ");
  const line2 = words.slice(bestSplit).join(" ");
  const widest = Math.max(measureWidth(line1, startingSize, bold), measureWidth(line2, startingSize, bold));
  const fontSize = widest > maxWidth ? Math.max(MIN_FONT_SIZE, startingSize * (maxWidth / widest)) : startingSize;

  return [
    { text: line1, fontSize },
    { text: line2, fontSize },
  ];
}

// Scales fontSize down proportionally (font metrics track size closely
// enough for this to land within a fraction of a point) until text fits
// maxWidth, bottoming out at MIN_FONT_SIZE for a word too long to ever fit.
function shrinkToFit(
  text: string,
  maxWidth: number,
  fontSize: number,
  bold: boolean,
  measureWidth: MeasureTextWidth,
): number {
  const width = measureWidth(text, fontSize, bold);
  if (width <= maxWidth) return fontSize;
  return Math.max(MIN_FONT_SIZE, fontSize * (maxWidth / width));
}
