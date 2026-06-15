import { type FC, useCallback } from "react";
import { AbsoluteFill, Audio, Sequence } from "remotion";
import { SceneCanvas } from "../SceneCanvas";
import { ZoomedScene } from "./ZoomedScene";
import { CaptionTrack } from "./CaptionTrack";
import { buildCaptionLines } from "../../captions";
import { musicVolumeAtFrame, SFX_DURATION_FRAMES, type SfxEvent } from "../../mix";
import type { BeatEntry } from "../../timeline";

export interface RoughCutProps {
  beats: BeatEntry[];
  audioSrc: string;
  musicSrc: string;
  sfxEvents: SfxEvent[];
  totalFrames: number;
}

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
