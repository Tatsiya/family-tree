// An SVG path 'd' string for a rounded rectangle anchored at (0,0), corners
// matching the quarter-circle style of a plain SVG <rect rx>.
export function roundedRectPath(width: number, height: number, radius: number): string {
  const r = Math.min(radius, width / 2, height / 2);
  return [
    `M${r},0`,
    `H${width - r}`,
    `A${r},${r} 0 0 1 ${width},${r}`,
    `V${height - r}`,
    `A${r},${r} 0 0 1 ${width - r},${height}`,
    `H${r}`,
    `A${r},${r} 0 0 1 0,${height - r}`,
    `V${r}`,
    `A${r},${r} 0 0 1 ${r},0`,
    "Z",
  ].join(" ");
}
