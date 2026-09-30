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
  "flex h-11 w-11 items-center justify-center rounded-full text-secondary-text transition-colors hover:bg-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";

export function ZoomControls({ scale, onZoomIn, onZoomOut, canZoomIn, canZoomOut, className }: ZoomControlsProps) {
  return (
    <div
      className={`flex items-center gap-1 rounded-full border border-border-soft bg-surface px-2 py-1 shadow-[0_4px_14px_rgba(74,52,30,0.08)] ${className ?? ""}`}
    >
      <button type="button" className={zoomButton} onClick={onZoomOut} disabled={!canZoomOut} aria-label="Zoom out">
        <ZoomOut size={18} />
      </button>
      <span className="w-10 text-center text-[13px] font-semibold text-ink tabular-nums">
        {Math.round(scale * 100)}%
      </span>
      <button type="button" className={zoomButton} onClick={onZoomIn} disabled={!canZoomIn} aria-label="Zoom in">
        <ZoomIn size={18} />
      </button>
    </div>
  );
}
