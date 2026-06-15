import type { FC } from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from "remotion";
import { PALETTE, CAPTION_FONT } from "../../../kit/rough/style";
import type { CaptionLine } from "../../captions";

const CaptionOverlay: FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(frame, [0, 6], [0.97, 1.0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 36,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(243,234,214,0.93)",
          border: `3px solid ${PALETTE.ink}`,
          borderRadius: 10,
          padding: "14px 36px",
          opacity,
          transform: `scale(${scale})`,
          maxWidth: "86%",
          textAlign: "center",
          fontFamily: CAPTION_FONT,
          fontSize: 42,
          color: PALETTE.ink,
          lineHeight: 1.35,
          overflowWrap: "break-word",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

export const CaptionTrack: FC<{ lines: CaptionLine[] }> = ({ lines }) => (
  <>
    {lines
      .filter((line) => line.durationFrames >= 1)
      .map((line, i) => (
        <Sequence key={i} from={line.startFrame} durationInFrames={line.durationFrames}>
          <CaptionOverlay text={line.text} />
        </Sequence>
      ))}
  </>
);
