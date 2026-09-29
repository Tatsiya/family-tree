// Shared border/avatar accent per sex, used by PersonNode and GenderIcon so
// a card's border always matches its avatar frame.
export function sexStrokeClass(sex: "M" | "F" | undefined): string {
  if (sex === "M") return "stroke-parchment-border-male";
  if (sex === "F") return "stroke-parchment-border-female";
  return "stroke-parchment-border";
}

export function sexTextClass(sex: "M" | "F" | undefined): string {
  if (sex === "M") return "text-parchment-border-male";
  if (sex === "F") return "text-parchment-border-female";
  return "text-parchment-border";
}
