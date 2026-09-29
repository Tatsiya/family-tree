import type { RgbColor } from "./pdfDrawPlan";

// Parses a "#rrggbb" (or "#rgb") string into 0-1 float components, the
// format pdf-lib's rgb() expects.
export function hexToRgb01(hex: string): RgbColor {
  const normalized = hex.trim().replace(/^#/, "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;

  const value = parseInt(expanded, 16);
  return {
    r: ((value >> 16) & 0xff) / 255,
    g: ((value >> 8) & 0xff) / 255,
    b: (value & 0xff) / 255,
  };
}
