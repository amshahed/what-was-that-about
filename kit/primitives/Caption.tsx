// A beat's own caption (scene.caption): a bar at the TOP of the frame. The bottom belongs to the
// line-pop narration subtitles (CaptionTrack, PRD §9.1), which would otherwise cover it.

import { RRect } from "../rough/rough";
import { PALETTE, CAPTION_FONT } from "../rough/style";

export const Caption = ({ text }: { text: string }) => {
  // Occupies y 24–104. Kit scenes that use a caption keep that band free of important art.
  const y = 24;
  return (
    <g>
      {RRect(160, y, 1600, 80, {
        fill: "#fffef6",
        fillStyle: "solid",
        stroke: PALETTE.ink,
        strokeWidth: 3,
      })}
      <text
        x={960}
        y={y + 54}
        textAnchor="middle"
        fontFamily={CAPTION_FONT}
        fontSize={42}
        fill={PALETTE.ink}
      >
        {text}
      </text>
    </g>
  );
};
