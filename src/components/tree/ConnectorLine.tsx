export interface ConnectorLineProps {
  path: string;
  secondary?: boolean;
  kind: "connector" | "bridge";
  highlighted?: boolean;
  // Center of the two-rings marriage badge, already computed by the layout
  // (see treeLayout.ts) -- unset for a plain parent/child connector.
  ringBadgeCenter?: { x: number; y: number };
}

export function ConnectorLine({ path, secondary, kind, highlighted, ringBadgeCenter }: ConnectorLineProps) {
  return (
    <>
      <path
        d={path}
        className={`fill-none ${highlighted ? "stroke-accent" : "stroke-line"}`}
        strokeWidth={kind === "bridge" ? 3 : 2}
        strokeLinecap="round"
        strokeDasharray={secondary ? "8 6" : undefined}
      />
      {ringBadgeCenter && (
        <g transform={`translate(${ringBadgeCenter.x}, ${ringBadgeCenter.y})`}>
          <circle r={11} className="fill-surface stroke-line" strokeWidth={1.5} />
          <svg x={-7} y={-5} width={14} height={10} viewBox="0 0 14 10" aria-hidden="true">
            <circle cx={5} cy={5} r={4} className="fill-none stroke-gold" strokeWidth={1.4} />
            <circle cx={9} cy={5} r={4} className="fill-none stroke-gold" strokeWidth={1.4} />
          </svg>
        </g>
      )}
    </>
  );
}
