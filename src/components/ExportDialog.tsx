import { useState } from "react";
import type { RefObject } from "react";
import { Modal } from "./Modal";
import { useTreeExport } from "../hooks/useTreeExport";
import { useTreeStore } from "../store/treeStore";
import { PNG_QUALITY_OPTIONS } from "../model/export/types";
import type { ExportFormat } from "../model/export/types";
import { PDF_PAGE_SIZES } from "../model/export/pageSizes";
import type { PdfPageSizeId } from "../model/export/pageSizes";

export interface ExportDialogProps {
  svgRef: RefObject<SVGSVGElement | null>;
  onClose: () => void;
}

const FORMAT_OPTIONS: { value: ExportFormat; label: string; description: string }[] = [
  { value: "svg", label: "SVG", description: "Vector file that stays sharp at any zoom level." },
  { value: "png", label: "PNG", description: "Image file for viewing or sharing on any device." },
  { value: "pdf", label: "PDF", description: "Print-ready page, sized for large-format printing." },
];

function toggleButtonClass(active: boolean): string {
  return `flex-1 rounded-lg border px-2.5 py-2 font-serif text-xs transition-colors focus:outline-2 focus:outline-offset-1 focus:outline-parchment-border ${
    active
      ? "border-parchment-text bg-parchment-text text-parchment-card"
      : "border-parchment-border bg-parchment-panel text-parchment-text hover:bg-parchment-bg"
  }`;
}

export function ExportDialog({ svgRef, onClose }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>("svg");
  const [pngScale, setPngScale] = useState<1 | 2 | 4>(2);
  const [pdfPageSize, setPdfPageSize] = useState<PdfPageSizeId>("fit");
  const tree = useTreeStore((s) => s.tree);
  const { status, error, exportTree } = useTreeExport();

  const activeFormat = FORMAT_OPTIONS.find((option) => option.value === format);

  async function handleExport() {
    const context = { svg: svgRef.current, tree };

    if (format === "svg") await exportTree(context, { format: "svg" });
    else if (format === "png") await exportTree(context, { format: "png", scale: pngScale });
    else await exportTree(context, { format: "pdf", pageSize: pdfPageSize });
  }

  return (
    <Modal title="Export Family Tree" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-2 font-serif text-xs font-semibold text-parchment-text">Format</p>
          <div className="flex gap-2">
            {FORMAT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFormat(option.value)}
                className={toggleButtonClass(format === option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          {activeFormat && (
            <p className="mt-2 font-serif text-xs text-parchment-text">{activeFormat.description}</p>
          )}
        </div>

        {format === "png" && (
          <div>
            <p className="mb-2 font-serif text-xs font-semibold text-parchment-text">Quality</p>
            <div className="flex gap-2">
              {PNG_QUALITY_OPTIONS.map((option) => (
                <button
                  key={option.scale}
                  type="button"
                  onClick={() => setPngScale(option.scale)}
                  className={toggleButtonClass(pngScale === option.scale)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {format === "pdf" && (
          <div>
            <p className="mb-2 font-serif text-xs font-semibold text-parchment-text">Paper size</p>
            <div className="flex flex-wrap gap-2">
              {PDF_PAGE_SIZES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPdfPageSize(option.id)}
                  className={toggleButtonClass(pdfPageSize === option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {status === "error" && error && (
          <p className="rounded-lg border border-parchment-border bg-parchment-panel px-3 py-2 font-serif text-xs text-parchment-text">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-parchment-border bg-parchment-panel px-4 py-2 font-serif text-xs text-parchment-text transition-colors hover:bg-parchment-bg focus:outline-2 focus:outline-offset-1 focus:outline-parchment-border"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={status === "exporting"}
            className="cursor-pointer rounded-full border border-parchment-border bg-parchment-text px-4 py-2 font-serif text-xs text-parchment-card transition-colors hover:bg-parchment-text-strong focus:outline-2 focus:outline-offset-1 focus:outline-parchment-border disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "exporting" ? "Exporting…" : "Download"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
