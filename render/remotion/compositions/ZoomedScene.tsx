import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { SceneCanvas } from "../SceneCanvas";
import type { SceneSpec } from "../../../kit/scene";

export const ZoomedScene: FC<{ spec: SceneSpec; durationFrames: number }> = ({ spec, durationFrames }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, Math.max(durationFrames - 1, 1)], [1.0, 1.05], {
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: "center" }}>
      <SceneCanvas spec={spec} />
    </AbsoluteFill>
  );
};
