import { GrUser, GrUserFemale } from "react-icons/gr";
import { sexStrokeClass, sexTextClass } from "./sexColors";

export interface GenderIconProps {
  sex: "M" | "F" | undefined;
  cx: number;
  cy: number;
  r: number;
}

export function GenderIcon({ sex, cx, cy, r }: GenderIconProps) {
  const Icon = sex === "F" ? GrUserFemale : GrUser;
  const iconSize = r * 1.5;

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        strokeWidth={2}
        className={`fill-parchment-panel ${sexStrokeClass(sex)}`}
      />
      <Icon
        x={cx - iconSize / 2}
        y={cy - iconSize / 2}
        size={iconSize}
        className={sexTextClass(sex)}
      />
    </g>
  );
}
