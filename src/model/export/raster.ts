// Browsers refuse to create (or silently fail on) a canvas beyond roughly
// these limits; clamping here keeps a "Print" quality PNG export working
// everywhere instead of failing at an undocumented per-browser ceiling.
// (PDF export is vector, not rasterized, so it has no such ceiling.)
export const MAX_CANVAS_DIMENSION_PX = 12000;
export const MAX_CANVAS_AREA_PX = 40_000_000;

export function clampToCanvasLimit(width: number, height: number): { width: number; height: number } {
  const dimensionScale = Math.min(1, MAX_CANVAS_DIMENSION_PX / Math.max(width, height));
  const areaScale = Math.min(1, Math.sqrt(MAX_CANVAS_AREA_PX / (width * height)));
  const scale = Math.min(dimensionScale, areaScale);
  return { width: width * scale, height: height * scale };
}
