import { type FC, useCallback } from "react";
import { AbsoluteFill, Audio, Sequence, useCurrentFrame, interpolate } from "remotion";
import { SceneCanvas } from "../SceneCanvas";
import { CaptionTrack } from "./CaptionTrack";
import { buildCaptionLines } from "../../captions";
import { musicVolumeAtFrame, type SfxEvent } from "../../mix";
import type { BeatEntry } from "../../timeline";
import type { SceneSpec } from "../../../kit/scene";

// Duration in frames allocated for each SFX sting (covers up to ~3s clips at 30fps).
const SFX_DURATION_FRAMES = 90;

export interface RoughCutProps {
  beats: BeatEntry[];
  audioSrc: string;
  musicSrc: string;
  sfxEvents: SfxEvent[];
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

export const RoughCut: FC<RoughCutProps> = ({ beats, audioSrc, musicSrc, sfxEvents }) => {
  const captionLines = buildCaptionLines(beats);
  const musicVolume = useCallback((f: number) => musicVolumeAtFrame(f, beats), [beats]);
  return (
    <AbsoluteFill>
      <Audio src={audioSrc} />
      {musicSrc && (
        <Audio
          src={musicSrc}
          volume={musicVolume}
          loop
        />
      )}
      {sfxEvents.map((sfx, i) => (
        <Sequence key={`${sfx.startFrame}-${i}`} from={sfx.startFrame} durationInFrames={SFX_DURATION_FRAMES}>
          <Audio src={sfx.src} />
        </Sequence>
      ))}
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
      <CaptionTrack lines={captionLines} />
    </AbsoluteFill>
  );
};

export const ROUGH_CUT_DEFAULT_PROPS: RoughCutProps = {
  beats: [],
  audioSrc: "",
  musicSrc: "",
  sfxEvents: [],
  totalFrames: 30,
};
