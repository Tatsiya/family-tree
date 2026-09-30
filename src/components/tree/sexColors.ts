// Shared avatar colors per sex -- an SVG pair (fill-*, for the tree card and
// its PersonAvatar) and a DOM pair (bg-*/text-*, for PersonAvatarBadge) so a
// person's initials circle always uses the same colors everywhere it appears.
export function sexAvatarFillClass(sex: "M" | "F" | undefined): string {
  if (sex === "M") return "fill-male-bg";
  if (sex === "F") return "fill-female-bg";
  return "fill-border";
}

export function sexAvatarTextClass(sex: "M" | "F" | undefined): string {
  if (sex === "M") return "fill-male-fg";
  if (sex === "F") return "fill-female-fg";
  return "fill-ink-2";
}

export function sexAvatarBgClass(sex: "M" | "F" | undefined): string {
  if (sex === "M") return "bg-male-bg";
  if (sex === "F") return "bg-female-bg";
  return "bg-border";
}

export function sexAvatarFgClass(sex: "M" | "F" | undefined): string {
  if (sex === "M") return "text-male-fg";
  if (sex === "F") return "text-female-fg";
  return "text-ink-2";
}
