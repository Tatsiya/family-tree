import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { RefCallback } from "react";

const MIN_SCALE = 0.15;
const MAX_SCALE = 2;
const ZOOM_STEP = 1.25;
// Trackpad pinch (and ctrl/cmd+scroll-wheel) reports as a wheel event with
// ctrlKey/metaKey set and a small deltaY per frame; this converts that delta
// into a smooth scale multiplier.
const WHEEL_ZOOM_SENSITIVITY = 0.01;
// Below this many pixels of movement, a mousedown+mouseup is treated as a
// click (e.g. selecting a person) rather than the start of a drag-to-pan.
const DRAG_THRESHOLD = 4;

export interface UseZoomPanResult {
  scrollRef: RefCallback<HTMLDivElement>;
  scale: number;
  zoomIn: () => void;
  zoomOut: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  centerOn: (x: number, y: number) => void;
  isPanning: boolean;
}

interface PendingAnchor {
  contentX: number;
  contentY: number;
  clientX: number;
  clientY: number;
}

// Owns zoom scale and scroll position for a pannable, zoomable content area.
// Panning uses the browser's native scrolling on scrollRef's element. Zoom
// (buttons or trackpad pinch/ctrl+wheel) keeps one content-space point fixed
// under a client-space position -- the viewport center for button zoom, the
// cursor for wheel zoom -- so the view doesn't jump.
export function useZoomPan(): UseZoomPanResult {
  const elRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  // Mirrors `scale` for reading inside stable callbacks without making them
  // (and the native wheel listener that closes over them) depend on scale.
  const scaleRef = useRef(scale);
  const pendingAnchorRef = useRef<PendingAnchor | null>(null);

  useLayoutEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  const anchorContentPoint = useCallback(
    (x: number, y: number, clientX: number, clientY: number, atScale: number) => {
      const el = elRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      el.scrollLeft = x * atScale - (clientX - rect.left);
      el.scrollTop = y * atScale - (clientY - rect.top);
    },
    [],
  );

  const centerOn = useCallback(
    (x: number, y: number) => {
      const el = elRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      anchorContentPoint(x, y, rect.left + rect.width / 2, rect.top + rect.height / 2, scaleRef.current);
    },
    [anchorContentPoint],
  );

  // Rescales around a client-space point, remembering which content-space
  // point sat there so the post-render effect below can restore it.
  const setScaleAnchored = useCallback((nextScale: number, clientX: number, clientY: number) => {
    const el = elRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      pendingAnchorRef.current = {
        contentX: (el.scrollLeft + clientX - rect.left) / scaleRef.current,
        contentY: (el.scrollTop + clientY - rect.top) / scaleRef.current,
        clientX,
        clientY,
      };
    }
    setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale)));
  }, []);

  const zoomAtViewportCenter = useCallback(
    (factor: number) => {
      const el = elRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setScaleAnchored(scaleRef.current * factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
    },
    [setScaleAnchored],
  );

  const zoomIn = useCallback(() => zoomAtViewportCenter(ZOOM_STEP), [zoomAtViewportCenter]);
  const zoomOut = useCallback(() => zoomAtViewportCenter(1 / ZOOM_STEP), [zoomAtViewportCenter]);

  // Runs after a scale change has resized the content, so the anchored
  // content point lands back under the same client position it was
  // captured at (viewport center for buttons, cursor for wheel/pinch).
  useLayoutEffect(() => {
    const anchor = pendingAnchorRef.current;
    if (!anchor) return;
    pendingAnchorRef.current = null;
    anchorContentPoint(anchor.contentX, anchor.contentY, anchor.clientX, anchor.clientY, scale);
  }, [scale, anchorContentPoint]);

  // Trackpad pinch (and ctrl/cmd+scroll-wheel) reports as a wheel event with
  // ctrlKey/metaKey set. Attached via a native listener (not JSX onWheel)
  // because React makes onWheel passive by default, so preventDefault
  // inside it can't actually stop the browser's own page-zoom.
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * WHEEL_ZOOM_SENSITIVITY);
      setScaleAnchored(scaleRef.current * factor, e.clientX, e.clientY);
    },
    [setScaleAnchored],
  );

  // Click-and-drag panning, for a mouse (which has no two-finger-scroll
  // gesture) and as an alternative to it on a trackpad. Below DRAG_THRESHOLD
  // of movement this is left alone so it doesn't eat an ordinary click on a
  // person card. The move/end handlers are scoped locally to one drag
  // gesture (rather than kept in refs) so they can freely reference each
  // other for their own cleanup without a self-referencing ref.
  const [isPanning, setIsPanning] = useState(false);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (e.button !== 0) return; // primary button only
    const el = elRef.current;
    if (!el) return;
    // A non-null const alias -- the nested closures below don't retain
    // `el`'s null-narrowing on their own.
    const scrollEl = el;

    const startX = e.clientX;
    const startY = e.clientY;
    const startScrollLeft = scrollEl.scrollLeft;
    const startScrollTop = scrollEl.scrollTop;
    let didDrag = false;

    function handleMove(moveEvent: MouseEvent) {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (!didDrag) {
        if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
        didDrag = true;
        setIsPanning(true);
        // Forces a consistent grabbing cursor for the whole drag, even
        // while passing over a person card (which sets its own pointer
        // cursor).
        document.body.style.cursor = "grabbing";
      }
      scrollEl.scrollLeft = startScrollLeft - dx;
      scrollEl.scrollTop = startScrollTop - dy;
    }

    function handleUp() {
      if (didDrag) {
        setIsPanning(false);
        document.body.style.cursor = "";
      }
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  }, []);

  // A callback ref so listeners attach whenever the scrollable element
  // itself mounts -- e.g. right after a GEDCOM import replaces the
  // empty-tree placeholder with the canvas -- not only when `scale` changes.
  const scrollRef = useCallback<RefCallback<HTMLDivElement>>(
    (node) => {
      elRef.current?.removeEventListener("wheel", handleWheel);
      elRef.current?.removeEventListener("mousedown", handleMouseDown);
      elRef.current = node;
      node?.addEventListener("wheel", handleWheel, { passive: false });
      node?.addEventListener("mousedown", handleMouseDown);
    },
    [handleWheel, handleMouseDown],
  );

  return {
    scrollRef,
    scale,
    zoomIn,
    zoomOut,
    canZoomIn: scale < MAX_SCALE,
    canZoomOut: scale > MIN_SCALE,
    centerOn,
    isPanning,
  };
}
