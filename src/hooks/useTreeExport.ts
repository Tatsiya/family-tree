import { useState } from "react";
import { LineCapStyle, PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { PDFFont } from "pdf-lib";
import type { ExportOptions } from "../model/export/types";
import type { Tree } from "../model/types";
import { computeTreeLayout } from "../model/treeLayout";
import { NODE_WIDTH } from "../model/treeLayoutConstants";
import { AVATAR_INITIALS_FONT_RATIO, PLACE_ICON_BASELINE_OFFSET_RATIO, PLACE_ICON_GAP, PLACE_ICON_SIZE } from "../model/formatPersonNode";
import type { PdfPageSizeId } from "../model/export/pageSizes";
import { resolvePdfPageSize, mmToPoints } from "../model/export/pageSizes";
import { clampToCanvasLimit } from "../model/export/raster";
import { exportFileName } from "../model/export/exportFileName";
import { buildPdfDrawPlan, AVATAR_CY, AVATAR_R, RING_BADGE_RADIUS } from "../model/export/pdfDrawPlan";
import type { PdfPersonTextLine, PdfThemeColors, RgbColor } from "../model/export/pdfDrawPlan";
import type { MeasureTextWidth } from "../model/textFit";
import { hexToRgb01 } from "../model/export/color";
import { MAP_PIN_DOT, MAP_PIN_OUTLINE_PATH, MAP_PIN_VIEWBOX_SIZE } from "../model/export/mapPinIcon";
import cormorantGaramondBoldUrl from "../assets/fonts/CormorantGaramond-Bold.ttf";
import manropeBoldUrl from "../assets/fonts/Manrope-Bold.ttf";
import manropeRegularUrl from "../assets/fonts/Manrope-Regular.ttf";

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
  return cssColor("--bg", "#f3ecdf");
}

// Resolves the app's palette (see index.css) once at export time, since
// the pure PDF draw-plan builder has no DOM access of its own. Reads the
// root element's computed style once and pulls every variable off that one
// declaration, rather than re-querying getComputedStyle per variable.
function readThemeColors(): PdfThemeColors {
  const rootStyle = getComputedStyle(document.documentElement);
  const readVar = (variable: string, fallback: string): string => rootStyle.getPropertyValue(variable).trim() || fallback;

  return {
    background: hexToRgb01(readVar("--bg", "#f3ecdf")),
    card: hexToRgb01(readVar("--card", "#fffdf8")),
    surface: hexToRgb01(readVar("--surface", "#fbf7f0")),
    border: hexToRgb01(readVar("--border", "#e7dcc8")),
    line: hexToRgb01(readVar("--line", "#bfa27e")),
    gold: hexToRgb01(readVar("--gold", "#a8825a")),
    ink: hexToRgb01(readVar("--ink", "#2b2420")),
    inkSecondary: hexToRgb01(readVar("--ink-2", "#5e5146")),
    muted: hexToRgb01(readVar("--muted", "#756656")),
    maleBg: hexToRgb01(readVar("--male-bg", "#dce6e4")),
    maleFg: hexToRgb01(readVar("--male-fg", "#34585c")),
    femaleBg: hexToRgb01(readVar("--female-bg", "#f3e0da")),
    femaleFg: hexToRgb01(readVar("--female-fg", "#96463f")),
    neutralBg: hexToRgb01(readVar("--border", "#e7dcc8")),
    neutralFg: hexToRgb01(readVar("--ink-2", "#5e5146")),
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

  const [cormorantBoldBytes, manropeBoldBytes, manropeRegularBytes] = await Promise.all([
    fetchFontBytes(cormorantGaramondBoldUrl),
    fetchFontBytes(manropeBoldUrl),
    fetchFontBytes(manropeRegularUrl),
  ]);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  // Not subset: fontkit's subsetter mis-renders a handful of glyphs in
  // these particular (font-tools-instanced) files, silently dropping them.
  // Embedding the full font avoids that at the cost of a larger file.
  const [cormorantBoldFont, manropeBoldFont, manropeRegularFont] = await Promise.all([
    pdfDoc.embedFont(cormorantBoldBytes, { subset: false }),
    pdfDoc.embedFont(manropeBoldBytes, { subset: false }),
    pdfDoc.embedFont(manropeRegularBytes, { subset: false }),
  ]);

  const fontForKind = (kind: PdfPersonTextLine["kind"]): PDFFont =>
    kind === "name" ? cormorantBoldFont : kind === "lastName" ? manropeBoldFont : manropeRegularFont;
  const colorForKind = (kind: PdfPersonTextLine["kind"]): RgbColor =>
    kind === "name" ? colors.ink : kind === "lastName" ? colors.inkSecondary : colors.muted;

  const measureWidth: MeasureTextWidth = (text, fontSize, _bold, kind) =>
    fontForKind(kind).widthOfTextAtSize(text, fontSize);

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
      borderLineCap: LineCapStyle.Round,
    });

    if (connector.ringBadgeCenter) {
      const cx = connector.ringBadgeCenter.x * scale;
      const cy = pageHeightPt - connector.ringBadgeCenter.y * scale;
      page.drawCircle({
        x: cx,
        y: cy,
        size: RING_BADGE_RADIUS * scale,
        color: toColor(colors.surface),
        borderColor: toColor(colors.line),
        borderWidth: 1.5 * scale,
      });
      for (const dx of [-2, 2]) {
        page.drawCircle({
          x: cx + dx * scale,
          y: cy,
          size: 4 * scale,
          borderColor: toColor(colors.gold),
          borderWidth: 1.4 * scale,
        });
      }
    }
  }

  const mapPinScale = (PLACE_ICON_SIZE / MAP_PIN_VIEWBOX_SIZE) * scale;

  for (const card of plan.cards) {
    const originX = card.x * scale;
    const originYTop = pageHeightPt - card.y * scale;

    page.drawSvgPath(plan.cardPath, {
      x: originX,
      y: originYTop,
      scale,
      color: toColor(colors.card),
      borderColor: toColor(plan.borderColor),
      borderWidth: 1 * scale,
    });

    const avatarCx = originX + (NODE_WIDTH / 2) * scale;
    const avatarCy = originYTop - AVATAR_CY * scale;
    page.drawCircle({
      x: avatarCx,
      y: avatarCy,
      size: AVATAR_R * scale,
      color: toColor(card.avatarFill),
    });

    const initialsFontSize = AVATAR_INITIALS_FONT_RATIO * AVATAR_R * scale;
    const initialsWidth = cormorantBoldFont.widthOfTextAtSize(card.initials, initialsFontSize);
    page.drawText(card.initials, {
      x: avatarCx - initialsWidth / 2,
      y: avatarCy - initialsFontSize * 0.36,
      size: initialsFontSize,
      font: cormorantBoldFont,
      color: toColor(card.avatarText),
    });

    for (const line of card.lines) {
      if (!line.text) continue;
      const font = fontForKind(line.kind);
      const fontSize = line.fontSize * scale;
      const textWidth = font.widthOfTextAtSize(line.text, fontSize);
      const lineY = originYTop - line.y * scale;

      if (line.kind === "place") {
        const iconTopY = lineY + line.fontSize * scale * PLACE_ICON_BASELINE_OFFSET_RATIO;
        const combinedWidth = (PLACE_ICON_SIZE + PLACE_ICON_GAP) * scale + textWidth;
        const startX = originX + (NODE_WIDTH * scale) / 2 - combinedWidth / 2;

        page.drawSvgPath(MAP_PIN_OUTLINE_PATH, {
          x: startX,
          y: iconTopY,
          scale: mapPinScale,
          borderColor: toColor(colors.gold),
          borderWidth: 1.6 * mapPinScale,
        });
        page.drawCircle({
          x: startX + MAP_PIN_DOT.cx * mapPinScale,
          y: iconTopY - MAP_PIN_DOT.cy * mapPinScale,
          size: MAP_PIN_DOT.r * mapPinScale,
          borderColor: toColor(colors.gold),
          borderWidth: 1.6 * mapPinScale,
        });
        page.drawText(line.text, {
          x: startX + (PLACE_ICON_SIZE + PLACE_ICON_GAP) * scale,
          y: lineY,
          size: fontSize,
          font,
          color: toColor(colorForKind(line.kind)),
        });
      } else {
        page.drawText(line.text, {
          x: originX + (NODE_WIDTH * scale) / 2 - textWidth / 2,
          y: lineY,
          size: fontSize,
          font,
          color: toColor(colorForKind(line.kind)),
        });
      }
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
