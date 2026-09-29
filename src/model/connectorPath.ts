export interface Point {
  x: number;
  y: number;
}

// Below this, a horizontal offset is layout jitter rather than a real
// structural asymmetry (a sibling shifting a row's center, say) -- it
// shouldn't render as a visible zigzag on what's conceptually a straight
// line. Genuine offsets from an asymmetric sibling row are much larger.
const STRAIGHT_THRESHOLD = 20;

// A shared horizontal "bus" at the midpoint between generations, with one
// vertical drop per source and one up to the target. Giving every sibling
// in a row their own independent elbow to the same target left overlapping,
// crossing horizontal segments once more than one or two shared it; a single
// bus line reads as one clean junction no matter how many sources feed it.
export function connectorPath(sources: Point[], target: Point): string {
  const xs = [...sources.map((p) => p.x), target.x];
  const busLeft = Math.min(...xs);
  const busRight = Math.max(...xs);

  if (busRight - busLeft < STRAIGHT_THRESHOLD) {
    return sources.map((source) => `M${target.x},${source.y}V${target.y}`).join(" ");
  }

  const busY = (sources[0].y + target.y) / 2;
  const segments = [`M${busLeft},${busY}H${busRight}`];
  for (const source of sources) {
    segments.push(`M${source.x},${source.y}V${busY}`);
  }
  segments.push(`M${target.x},${busY}V${target.y}`);
  return segments.join(" ");
}
