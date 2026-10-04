// Text-hero beat (PRD §9.1 tier 2): one big word, number or short phrase fills the frame, with an
// optional smaller line under it. Image models draw text badly, so text beats are code-rendered.

import { CAPTION_FONT, PALETTE } from "../rough/style";
import { RLine } from "../rough/rough";

export const HERO_COLORS = {
  ink: PALETTE.ink,
  red: "#b23b3b",
  sea: PALETTE.seaDeep,
  gold: "#b8860b",
} as const;
export type HeroColor = keyof typeof HERO_COLORS;

/** Font size that keeps the text inside ~1600 px; long phrases get smaller. */
export function heroFontSize(text: string): number {
  return Math.max(72, Math.min(260, Math.floor(1700 / Math.max(text.length, 1) / 0.6)));
}

export const TextHero = ({
  text,
  sub,
  color = "ink",
}: {
  text: string;
  sub?: string;
  color?: HeroColor;
}) => {
  const size = heroFontSize(text);
  const y = sub ? 560 : 600;
  return (
    <g>
      <text
        x={960}
        y={y}
        textAnchor="middle"
        fontFamily={CAPTION_FONT}
        fontWeight={700}
        fontSize={size}
        fill={HERO_COLORS[color]}
      >
        {text}
      </text>
      {RLine(560, y + 40, 1360, y + 46, { stroke: HERO_COLORS[color], strokeWidth: 6 })}
      {sub && (
        <text
          x={960}
          y={y + 150}
          textAnchor="middle"
          fontFamily={CAPTION_FONT}
          fontSize={64}
          fill={PALETTE.ink}
        >
          {sub}
        </text>
      )}
    </g>
  );
};
