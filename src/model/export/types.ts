import type { PdfPageSizeId } from "./pageSizes";

export type ExportFormat = "svg" | "png" | "pdf";

export type ExportOptions =
  | { format: "svg" }
  | { format: "png"; scale: 1 | 2 | 4 }
  | { format: "pdf"; pageSize: PdfPageSizeId };

export interface PngQualityOption {
  scale: 1 | 2 | 4;
  label: string;
}

// Standard matches the tree's native on-screen size; High and Print scale
// it up for a sharper zoomed-in view or a larger printed copy.
export const PNG_QUALITY_OPTIONS: PngQualityOption[] = [
  { scale: 1, label: "Standard" },
  { scale: 2, label: "High" },
  { scale: 4, label: "Print" },
];
