import type { FC } from "react";
import { AbsoluteFill, Audio, Sequence, useCurrentFrame, interpolate } from "remotion";
import { SceneCanvas } from "../SceneCanvas";
import type { BeatEntry } from "../../timeline";
import type { SceneSpec } from "../../../kit/scene";

export interface RoughCutProps {
  beats: BeatEntry[];
  audioSrc: string;
  totalFrames: number;
}

const ZoomedScene: FC<{ spec: SceneSpec; durationFrames: number }> = ({ spec, durationFrames }) => {
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

export const RoughCut: FC<RoughCutProps> = ({ beats, audioSrc }) => (
  <AbsoluteFill>
    <Audio src={`file://${audioSrc}`} />
    {beats.map((beat, i) => (
      <Sequence key={i} from={beat.startFrame} durationInFrames={beat.durationFrames}>
        {beat.zoom ? (
          <ZoomedScene spec={beat.scene} durationFrames={beat.durationFrames} />
        ) : (
          <AbsoluteFill>
            <SceneCanvas spec={beat.scene} />
          </AbsoluteFill>
        )}
      </Sequence>
    ))}
  </AbsoluteFill>
);

export const ROUGH_CUT_DEFAULT_PROPS: RoughCutProps = {
  beats: [],
  audioSrc: "",
  totalFrames: 30,
};
