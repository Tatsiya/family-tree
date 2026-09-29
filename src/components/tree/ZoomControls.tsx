import { ZoomIn, ZoomOut } from "lucide-react";

export interface ZoomControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  className?: string;
}

const zoomButton =
  "flex items-center justify-center rounded-full p-1.5 text-parchment-text transition-colors hover:bg-parchment-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-parchment-border-male focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50";

export function ZoomControls({ scale, onZoomIn, onZoomOut, canZoomIn, canZoomOut, className }: ZoomControlsProps) {
  return (
    <div
      className={`flex items-center gap-2 rounded-full border border-parchment-border bg-parchment-card px-2 py-1.5 font-serif text-xs text-parchment-text shadow-sm ${className ?? ""}`}
    >
      <button type="button" className={zoomButton} onClick={onZoomOut} disabled={!canZoomOut} aria-label="Zoom out">
        <ZoomOut size={16} />
      </button>
      <span className="w-10 text-center tabular-nums">{Math.round(scale * 100)}%</span>
      <button type="button" className={zoomButton} onClick={onZoomIn} disabled={!canZoomIn} aria-label="Zoom in">
        <ZoomIn size={16} />
      </button>
    </div>
  );
}
