export type PdfPageSizeId = "fit" | "a4" | "a3" | "a2" | "a1" | "a0";

interface PdfPageSize {
  id: PdfPageSizeId;
  label: string;
  widthMm?: number;
  heightMm?: number;
}

// Portrait ISO 216 dimensions; resolvePdfPageSize below rotates a preset to
// landscape when the tree itself is wider than it is tall.
export const PDF_PAGE_SIZES: PdfPageSize[] = [
  { id: "fit", label: "Fit to tree" },
  { id: "a4", label: "A4", widthMm: 210, heightMm: 297 },
  { id: "a3", label: "A3", widthMm: 297, heightMm: 420 },
  { id: "a2", label: "A2 (Poster)", widthMm: 420, heightMm: 594 },
  { id: "a1", label: "A1 (Large poster)", widthMm: 594, heightMm: 841 },
  { id: "a0", label: "A0 (Extra large poster)", widthMm: 841, heightMm: 1189 },
];

const PX_TO_MM = 25.4 / 96;
// Ceiling for "Fit to tree" so an unusually tall or wide tree still
// produces a page a print shop can actually handle.
const MAX_FIT_DIMENSION_MM = 1189; // A0's long edge

// Page dimensions in millimeters for the chosen size, given the tree's
// rendered pixel dimensions. Every size (including a fixed paper preset)
// produces a page shaped to the tree's own aspect ratio -- the preset only
// sets how big that page is allowed to get (its longer edge), rotated to
// landscape when the tree is wider than it is tall. A family tree is
// almost never the same aspect ratio as a sheet of paper (it's typically
// far wider than tall), so fitting an exact A4/A3/... rectangle around it
// would letterbox most of the page blank, shrinking the actual tree -- and
// its text -- to a fraction of that page's size.
export function resolvePdfPageSize(
  sizeId: PdfPageSizeId,
  contentWidthPx: number,
  contentHeightPx: number,
): { widthMm: number; heightMm: number } {
  const contentWidthMm = contentWidthPx * PX_TO_MM;
  const contentHeightMm = contentHeightPx * PX_TO_MM;

  if (sizeId === "fit") {
    const scale = Math.min(1, MAX_FIT_DIMENSION_MM / Math.max(contentWidthMm, contentHeightMm));
    return { widthMm: contentWidthMm * scale, heightMm: contentHeightMm * scale };
  }

  const preset = PDF_PAGE_SIZES.find((p) => p.id === sizeId);
  if (!preset?.widthMm || !preset.heightMm) {
    throw new Error(`Unknown PDF page size: ${sizeId}`);
  }

  // The preset's own longer edge is the target size; scale the tree's
  // aspect ratio up (or down) so its longer edge matches that exactly, with
  // the shorter edge following the tree's own proportions -- always a
  // custom-shaped page with the tree filling it edge to edge.
  const presetLongEdgeMm = Math.max(preset.widthMm, preset.heightMm);
  const scale = presetLongEdgeMm / Math.max(contentWidthMm, contentHeightMm);
  return { widthMm: contentWidthMm * scale, heightMm: contentHeightMm * scale };
}

export function mmToPoints(mm: number): number {
  return mm * (72 / 25.4);
}
