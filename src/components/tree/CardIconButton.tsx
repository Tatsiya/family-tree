import type { KeyboardEvent, MouseEvent } from "react";
import type { LucideIcon } from "lucide-react";

export interface CardIconButtonProps {
  icon: LucideIcon;
  cx: number;
  cy: number;
  size: number;
  hitRadius: number;
  ariaLabel: string;
  onActivate: () => void;
}

// A small icon button drawn on top of a PersonNode card -- hidden by
// default and revealed on hover/focus of the card (see PersonNode's "group"
// class), and left out of exported files entirely (data-export-hide), since
// a static download has no hover state to reveal it with.
export function CardIconButton({ icon: Icon, cx, cy, size, hitRadius, ariaLabel, onActivate }: CardIconButtonProps) {
  function handleClick(e: MouseEvent<SVGGElement>) {
    e.stopPropagation();
    onActivate();
  }

  function handleKeyDown(e: KeyboardEvent<SVGGElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      onActivate();
    }
  }

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      data-export-hide="true"
      className="cursor-pointer opacity-0 outline-none transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <circle
        cx={cx}
        cy={cy}
        r={hitRadius}
        className="fill-transparent transition-colors hover:fill-hover-tint"
      />
      <Icon x={cx - size / 2} y={cy - size / 2} size={size} className="pointer-events-none stroke-muted" />
    </g>
  );
}
