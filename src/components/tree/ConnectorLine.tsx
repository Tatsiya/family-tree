export interface ConnectorLineProps {
  path: string;
  secondary?: boolean;
}

export function ConnectorLine({ path, secondary }: ConnectorLineProps) {
  return (
    <path
      d={path}
      className="fill-none stroke-parchment-border"
      strokeWidth={1.5}
      strokeDasharray={secondary ? "4 4" : undefined}
    />
  );
}
