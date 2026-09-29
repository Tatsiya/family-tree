import { useState } from "react";
import { LineCapStyle, PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { ExportOptions } from "../model/export/types";
import type { Tree } from "../model/types";
import { computeTreeLayout } from "../model/treeLayout";
import { NODE_WIDTH } from "../model/treeLayoutConstants";
import type { PdfPageSizeId } from "../model/export/pageSizes";
import { resolvePdfPageSize, mmToPoints } from "../model/export/pageSizes";
import { clampToCanvasLimit } from "../model/export/raster";
import { exportFileName } from "../model/export/exportFileName";
import { buildPdfDrawPlan, AVATAR_CY, AVATAR_R, ICON_SIZE } from "../model/export/pdfDrawPlan";
import type { PdfThemeColors, RgbColor } from "../model/export/pdfDrawPlan";
import type { MeasureTextWidth } from "../model/textFit";
import { hexToRgb01 } from "../model/export/color";
import { ICON_VIEWBOX_SIZE } from "../model/export/personNodeIcon";
import playfairRegularUrl from "../assets/fonts/PlayfairDisplay-Regular.ttf";
import playfairBoldUrl from "../assets/fonts/PlayfairDisplay-SemiBold.ttf";

export type ExportStatus = "idle" | "exporting" | "error";

const GENERIC_ERROR_MESSAGE =
  "The tree couldn't be exported. Try again, or choose a different format.";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

// SVG-relevant CSS properties whose values come from Tailwind classes
// (fill, stroke, font, ...) rather than SVG attributes. A standalone SVG
// file has no access to the app's stylesheet, so these are copied onto the
// exported clone as inline styles.
const STYLE_PROPERTIES = [
  "fill",
  "stroke",
  "stroke-width",
  "stroke-dasharray",
  "stroke-linecap",
  "font-family",
  "font-size",
  "font-weight",
  "text-anchor",
  "color",
  "opacity",
];

function inlineComputedStyles(source: Element, clone: Element) {
  const computed = getComputedStyle(source);
  const declarations = STYLE_PROPERTIES.map(
    (property) => `${property}:${computed.getPropertyValue(property)}`,
  ).join(";");
  clone.setAttribute("style", declarations);
  clone.removeAttribute("class");

  for (let i = 0; i < source.children.length; i++) {
    inlineComputedStyles(source.children[i], clone.children[i]);
  }
}

function cssColor(variable: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable);
  return value.trim() || fallback;
}

function pageBackgroundColor(): string {
  return cssColor("--color-parchment-bg", "#ffffff");
}

// Resolves the app's palette (see index.css) once at export time, since
// the pure PDF draw-plan builder has no DOM access of its own.
function readThemeColors(): PdfThemeColors {
  return {
    background: hexToRgb01(cssColor("--color-parchment-bg", "#e8e0d0")),
    card: hexToRgb01(cssColor("--color-parchment-card", "#f5f0e8")),
    panel: hexToRgb01(cssColor("--color-parchment-panel", "#faf8f5")),
    border: hexToRgb01(cssColor("--color-parchment-border", "#c4a882")),
    borderMale: hexToRgb01(cssColor("--color-parchment-border-male", "#7d93a3")),
    borderFemale: hexToRgb01(cssColor("--color-parchment-border-female", "#b98a95")),
    text: hexToRgb01(cssColor("--color-parchment-text", "#2c1810")),
  };
}

// Produces a standalone, styled SVG document string -- safe to save to
// disk or rasterize -- from the live tree SVG element on screen. The
// viewBox stays at the tree's native layout units, but width/height (the
// SVG's declared output size) are set to renderWidth/renderHeight -- for a
// PNG export, that's the target raster resolution, so the browser renders
// vector text and lines crisply at full size instead of rasterizing small
// and blurring it back up when the canvas draws it in larger.
function serializeTreeSvg(svg: SVGSVGElement, renderWidth: number, renderHeight: number): string {
  const width = svg.viewBox.baseVal.width || svg.clientWidth;
  const height = svg.viewBox.baseVal.height || svg.clientHeight;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  inlineComputedStyles(svg, clone);
  clone.removeAttribute("style");
  clone.setAttribute("xmlns", SVG_NAMESPACE);
  clone.setAttribute("width", String(renderWidth));
  clone.setAttribute("height", String(renderHeight));
  clone.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const background = document.createElementNS(SVG_NAMESPACE, "rect");
  background.setAttribute("width", String(width));
  background.setAttribute("height", String(height));
  background.setAttribute("fill", pageBackgroundColor());
  clone.insertBefore(background, clone.firstChild);

  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n${new XMLSerializer().serializeToString(clone)}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// Rasterizes SVG markup onto an off-screen canvas at the given pixel size,
// for the PNG export path.
async function rasterize(markup: string, width: number, height: number): Promise<HTMLCanvasElement> {
  const svgUrl = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    image.src = svgUrl;
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width);
    canvas.height = Math.round(height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser doesn't support rendering images.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Couldn't render the tree as an image."));
    }, "image/png");
  });
}

const FONT_LOAD_ERROR_MESSAGE =
  "The tree couldn't be exported to PDF because a required font didn't load. Check your connection and try again.";

async function fetchFontBytes(url: string): Promise<ArrayBuffer> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error(FONT_LOAD_ERROR_MESSAGE);
  }
  if (!response.ok) throw new Error(FONT_LOAD_ERROR_MESSAGE);
  return response.arrayBuffer();
}

// Builds the PDF as true vector content -- real paths and embedded-font
// text, not a rasterized picture -- so it stays perfectly sharp at any
// zoom level or print size, the same as the SVG export.
async function renderVectorPdf(tree: Tree, pageSize: PdfPageSizeId): Promise<Uint8Array> {
  const layout = computeTreeLayout(tree);
  const colors = readThemeColors();

  const [regularBytes, boldBytes] = await Promise.all([
    fetchFontBytes(playfairRegularUrl),
    fetchFontBytes(playfairBoldUrl),
  ]);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const regularFont = await pdfDoc.embedFont(regularBytes, { subset: true });
  const boldFont = await pdfDoc.embedFont(boldBytes, { subset: true });

  // Real glyph-metric measurement (not a character-count guess), so a long
  // name wraps or shrinks to fit the card exactly as it does on screen.
  const measureWidth: MeasureTextWidth = (text, fontSize, bold) =>
    (bold ? boldFont : regularFont).widthOfTextAtSize(text, fontSize);

  const plan = buildPdfDrawPlan(tree, layout, colors, measureWidth);

  const { widthMm, heightMm } = resolvePdfPageSize(pageSize, plan.width, plan.height);
  const pageWidthPt = mmToPoints(widthMm);
  const pageHeightPt = mmToPoints(heightMm);
  const scale = pageWidthPt / plan.width;

  const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);
  const toColor = (c: RgbColor) => rgb(c.r, c.g, c.b);

  page.drawRectangle({ x: 0, y: 0, width: pageWidthPt, height: pageHeightPt, color: toColor(plan.backgroundColor) });

  for (const connector of plan.connectors) {
    page.drawSvgPath(connector.path, {
      x: 0,
      y: pageHeightPt,
      scale,
      borderColor: toColor(connector.color),
      borderWidth: connector.strokeWidth * scale,
      borderDashArray: connector.dashed ? [8 * scale, 6 * scale] : undefined,
      borderLineCap: connector.strokeWidth >= 3 ? LineCapStyle.Round : undefined,
    });
  }

  const iconScale = (ICON_SIZE / ICON_VIEWBOX_SIZE) * scale;
  const iconBoxX = NODE_WIDTH / 2 - ICON_SIZE / 2;
  const iconBoxY = AVATAR_CY - ICON_SIZE / 2;

  for (const card of plan.cards) {
    const originX = card.x * scale;
    const originYTop = pageHeightPt - card.y * scale;

    page.drawSvgPath(plan.cardPath, {
      x: originX,
      y: originYTop,
      scale,
      color: toColor(colors.card),
      borderColor: toColor(card.borderColor),
      borderWidth: 2 * scale,
    });

    page.drawCircle({
      x: originX + (NODE_WIDTH / 2) * scale,
      y: originYTop - AVATAR_CY * scale,
      size: AVATAR_R * scale,
      color: toColor(card.iconCircleColor),
      borderColor: toColor(card.iconColor),
      borderWidth: 2 * scale,
    });

    page.drawSvgPath(card.iconPath, {
      x: originX + iconBoxX * scale,
      y: originYTop - iconBoxY * scale,
      scale: iconScale,
      borderColor: toColor(card.iconColor),
      borderWidth: 2 * iconScale,
    });

    for (const line of card.lines) {
      if (!line.text) continue;
      const font = line.bold ? boldFont : regularFont;
      const fontSize = line.fontSize * scale;
      const textWidth = font.widthOfTextAtSize(line.text, fontSize);
      page.drawText(line.text, {
        x: originX + (NODE_WIDTH * scale) / 2 - textWidth / 2,
        y: originYTop - line.y * scale,
        size: fontSize,
        font,
        color: toColor(colors.text),
      });
    }
  }

  return pdfDoc.save();
}

export interface UseTreeExportResult {
  status: ExportStatus;
  error?: string;
  exportTree: (context: { svg: SVGSVGElement | null; tree: Tree }, options: ExportOptions) => Promise<void>;
}

export function useTreeExport(): UseTreeExportResult {
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [error, setError] = useState<string>();

  async function exportTree(context: { svg: SVGSVGElement | null; tree: Tree }, options: ExportOptions) {
    setStatus("exporting");
    setError(undefined);
    try {
      const filename = exportFileName(options);

      if (options.format === "pdf") {
        const pdfBytes = await renderVectorPdf(context.tree, options.pageSize);
        downloadBlob(new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" }), filename);
      } else {
        const svg = context.svg;
        if (!svg) throw new Error(GENERIC_ERROR_MESSAGE);

        const nativeWidth = svg.viewBox.baseVal.width || svg.clientWidth;
        const nativeHeight = svg.viewBox.baseVal.height || svg.clientHeight;

        if (options.format === "svg") {
          const markup = serializeTreeSvg(svg, nativeWidth, nativeHeight);
          downloadBlob(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }), filename);
        } else {
          const { width: canvasWidth, height: canvasHeight } = clampToCanvasLimit(
            nativeWidth * options.scale,
            nativeHeight * options.scale,
          );
          const markup = serializeTreeSvg(svg, canvasWidth, canvasHeight);
          const canvas = await rasterize(markup, canvasWidth, canvasHeight);
          downloadBlob(await canvasToPngBlob(canvas), filename);
        }
      }
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : GENERIC_ERROR_MESSAGE);
      setStatus("error");
    }
  }

  return { status, error, exportTree };
}
