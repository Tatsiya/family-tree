export interface Point {
  x: number;
  y: number;
}

export interface EdgeSource extends Point {
  // Half-siblings share this edge's bus and target with everyone else in
  // the row, but their own portion of it renders dashed -- see
  // connectorPath.
  secondary?: boolean;
}

export interface ConnectorPaths {
  solid: string;
  dashed: string;
}

// Below this, a horizontal offset is layout jitter rather than a real
// structural asymmetry (a sibling shifting a row's center, say) -- it
// shouldn't render as a visible zigzag on what's conceptually a straight
// line. Genuine offsets from an asymmetric sibling row are much larger.
const STRAIGHT_THRESHOLD = 20;

// A shared horizontal "bus" between generations, with one vertical drop per
// source and one up to the target. Giving every sibling in a row their own
// independent elbow to the same target left overlapping, crossing
// horizontal segments once more than one or two shared it; a single bus
// line reads as one clean junction no matter how many sources feed it.
//
// Some sources are half-siblings (see EdgeSource): they share this same bus
// and target as everyone else, but their own stretch of it -- their drops,
// and the piece of the horizontal bar directly above them -- renders
// dashed. Splitting the return into solid/dashed path strings (rather than
// drawing the whole bus twice at different heights, or dashing the whole
// thing) is what keeps it reading as one line with a dashed stretch in the
// middle, instead of two lines that either overlap into unreadable clutter
// or sit apart looking like two unrelated connectors.
//
// busT places the bus along the source-to-target span (0 = at the sources,
// 1 = at the target). A couple's two chunks each connect to their own,
// separate parentGroup; when those two edges' x-ranges happen to overlap
// (one parent's ancestry is much wider than the other's, say), drawing both
// at the same default height makes them look like one shared connection to
// both sets of grandparents. Give the second chunk's edge a different busT
// in that case. Valid range is roughly (0.46, 0.77): outside that band the
// bus drifts into the child card above it or the parent card below it,
// since sources[0] is a card's bottom edge and target is the next card's
// center, not the empty space between them.
export function connectorPath(sources: EdgeSource[], target: Point, busT: number): ConnectorPaths {
  const xs = [...sources.map((p) => p.x), target.x];
  const busLeft = Math.min(...xs);
  const busRight = Math.max(...xs);

  if (busRight - busLeft < STRAIGHT_THRESHOLD) {
    const { solidSources, dashedSources } = partitionBySecondary(sources);
    return {
      solid: solidSources.map((s) => `M${target.x},${s.y}V${target.y}`).join(" "),
      dashed: dashedSources.map((s) => `M${target.x},${s.y}V${target.y}`).join(" "),
    };
  }

  const busY = sources[0].y + (target.y - sources[0].y) * busT;
  const { solidSources, dashedSources } = partitionBySecondary(sources);

  const solidSegments: string[] = [];
  const dashedSegments: string[] = [];

  if (dashedSources.length > 0) {
    const dashedXs = dashedSources.map((s) => s.x);
    const dashedLeft = Math.min(...dashedXs);
    const dashedRight = Math.max(...dashedXs);
    if (busLeft < dashedLeft) solidSegments.push(`M${busLeft},${busY}H${dashedLeft}`);
    dashedSegments.push(`M${dashedLeft},${busY}H${dashedRight}`);
    if (dashedRight < busRight) solidSegments.push(`M${dashedRight},${busY}H${busRight}`);
  } else {
    solidSegments.push(`M${busLeft},${busY}H${busRight}`);
  }

  for (const source of solidSources) solidSegments.push(`M${source.x},${source.y}V${busY}`);
  for (const source of dashedSources) dashedSegments.push(`M${source.x},${source.y}V${busY}`);
  // The rise to the target is the shared trunk everyone's drop feeds into --
  // it isn't itself a half-sibling's own segment, so it always renders
  // solid, even when it happens to land underneath the dashed stretch.
  solidSegments.push(`M${target.x},${busY}V${target.y}`);

  return { solid: solidSegments.join(" "), dashed: dashedSegments.join(" ") };
}

function partitionBySecondary(
  sources: EdgeSource[],
): { solidSources: EdgeSource[]; dashedSources: EdgeSource[] } {
  return {
    solidSources: sources.filter((s) => !s.secondary),
    dashedSources: sources.filter((s) => s.secondary),
  };
}
