export interface ConnectorLineProps {
  path: string;
  secondary?: boolean;
  kind: "connector" | "bridge";
}

export function ConnectorLine({ path, secondary, kind }: ConnectorLineProps) {
  return (
    <path
      d={path}
      className="fill-none stroke-parchment-border"
      strokeWidth={kind === "bridge" ? 3 : 1.5}
      strokeLinecap={kind === "bridge" ? "round" : undefined}
      strokeDasharray={secondary ? "8 6" : undefined}
    />
  );
}
