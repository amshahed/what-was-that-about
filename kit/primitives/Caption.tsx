// Bottom caption bar. (Slice 8 will animate these from the script; here it's static.)

import { RRect } from "../rough/rough";
import { PALETTE } from "../rough/style";

export const Caption = ({ text }: { text: string }) => {
  const y = 952;
  return (
    <g>
      {RRect(120, y, 1680, 96, { fill: "#fffef6", fillStyle: "solid", stroke: PALETTE.ink, strokeWidth: 3 })}
      <text
        x={960}
        y={y + 62}
        textAnchor="middle"
        fontFamily='"Comic Sans MS", "Marker Felt", "Chalkboard SE", cursive'
        fontSize={46}
        fill={PALETTE.ink}
      >
        {text}
      </text>
    </g>
  );
};
