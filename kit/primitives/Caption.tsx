// A beat's own caption (scene.caption): a bar at the TOP of the frame. The bottom belongs to the
// line-pop narration subtitles (CaptionTrack, PRD §9.1), which would otherwise cover it.

import { RRect } from "../rough/rough";
import { PALETTE, CAPTION_FONT } from "../rough/style";

export const Caption = ({ text }: { text: string }) => {
  const y = 32;
  return (
    <g>
      {RRect(120, y, 1680, 96, {
        fill: "#fffef6",
        fillStyle: "solid",
        stroke: PALETTE.ink,
        strokeWidth: 3,
      })}
      <text
        x={960}
        y={y + 62}
        textAnchor="middle"
        fontFamily={CAPTION_FONT}
        fontSize={46}
        fill={PALETTE.ink}
      >
        {text}
      </text>
    </g>
  );
};
