import { sexAvatarBgClass, sexAvatarFgClass } from "./tree/sexColors";

export interface PersonAvatarBadgeProps {
  sex: "M" | "F" | undefined;
  initials: string;
  size: number;
  fontSize: number;
  ring?: boolean;
}

// The DOM counterpart of the tree card's SVG avatar (see
// components/tree/PersonAvatar.tsx) -- same initials-circle look, used
// wherever a person needs an avatar outside the SVG tree (panel header,
// relative rows).
export function PersonAvatarBadge({ sex, initials, size, fontSize, ring }: PersonAvatarBadgeProps) {
  const circle = (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full font-serif font-bold ${sexAvatarBgClass(sex)} ${sexAvatarFgClass(sex)}`}
      style={{ width: size, height: size, fontSize }}
    >
      <span>{initials}</span>
    </div>
  );

  if (!ring) return circle;

  return (
    <div className="rounded-full border border-accent p-[3px]" style={{ width: size + 6, height: size + 6 }}>
      {circle}
    </div>
  );
}
