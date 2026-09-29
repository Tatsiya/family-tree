import { PNG_QUALITY_OPTIONS } from "./types";
import type { ExportOptions } from "./types";

// Includes the quality/paper-size choice in the filename so exporting the
// same tree twice in a day (e.g. to compare paper sizes) produces distinct,
// self-explanatory files instead of the browser silently piling up
// "family-tree-2026-09-29 (1).pdf", "(2).pdf", ... behind the one name.
export function exportFileName(options: ExportOptions): string {
  const date = new Date().toISOString().slice(0, 10);
  const variant = describeVariant(options);
  return `family-tree-${date}${variant ? `-${variant}` : ""}.${options.format}`;
}

function describeVariant(options: ExportOptions): string {
  if (options.format === "png") {
    return PNG_QUALITY_OPTIONS.find((option) => option.scale === options.scale)?.label.toLowerCase() ?? "";
  }
  if (options.format === "pdf") {
    return options.pageSize;
  }
  return "";
}
