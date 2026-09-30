import { sexAvatarFillClass, sexAvatarTextClass } from "./sexColors";
import { AVATAR_INITIALS_FONT_RATIO } from "../../model/formatPersonNode";

export interface PersonAvatarProps {
  sex: "M" | "F" | undefined;
  initials: string;
  cx: number;
  cy: number;
  r: number;
}

export function PersonAvatar({ sex, initials, cx, cy, r }: PersonAvatarProps) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} className={sexAvatarFillClass(sex)} />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        className={`font-serif font-bold ${sexAvatarTextClass(sex)}`}
        style={{ fontSize: AVATAR_INITIALS_FONT_RATIO * r }}
      >
        {initials}
      </text>
    </g>
  );
}
