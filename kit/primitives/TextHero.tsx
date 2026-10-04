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

/** Widest the text may be (the stage is 1920 wide). */
export const HERO_MAX_WIDTH = 1700;
// Average glyph width / font size for bold Comic Sans uppercase (measured ~0.7; wide letters more).
const GLYPH = 0.75;

/** Font size for the main text: as big as fits, 72–260 px. */
export function heroFontSize(text: string): number {
  return Math.max(72, Math.min(260, Math.floor(HERO_MAX_WIDTH / Math.max(text.length, 1) / GLYPH)));
}

/** Estimated rendered width at a font size. */
export function estimatedWidth(text: string, fontSize: number): number {
  return text.length * fontSize * GLYPH;
}

/**
 * SVG attributes that squeeze text into HERO_MAX_WIDTH when the estimate says it would not fit
 * (very long text at the minimum size, or wide letters such as W and M).
 */
function fit(
  text: string,
  fontSize: number,
): { textLength?: number; lengthAdjust?: "spacingAndGlyphs" } {
  return estimatedWidth(text, fontSize) > HERO_MAX_WIDTH
    ? { textLength: HERO_MAX_WIDTH, lengthAdjust: "spacingAndGlyphs" }
    : {};
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
  const subSize = Math.min(64, heroFontSize(sub ?? "") * 0.5);
  const y = sub ? 560 : 600;
  const underline = Math.min(estimatedWidth(text, size), HERO_MAX_WIDTH) * 0.6;
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
        {...fit(text, size)}
      >
        {text}
      </text>
      {RLine(960 - underline / 2, y + 40, 960 + underline / 2, y + 46, {
        stroke: HERO_COLORS[color],
        strokeWidth: 6,
      })}
      {sub && (
        <text
          x={960}
          y={y + 150}
          textAnchor="middle"
          fontFamily={CAPTION_FONT}
          fontSize={subSize}
          fill={PALETTE.ink}
          {...fit(sub, subSize)}
        >
          {sub}
        </text>
      )}
    </g>
  );
};
