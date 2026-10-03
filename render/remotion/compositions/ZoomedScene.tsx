import type { FC, ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

/** Ken Burns punch-in (1.0 → 1.05 over the beat) around any shot. */
export const ZoomedScene: FC<{ durationFrames: number; children: ReactNode }> = ({
  durationFrames,
  children,
}) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, Math.max(durationFrames - 1, 1)], [1.0, 1.05], {
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: "center" }}>
      {children}
    </AbsoluteFill>
  );
};
