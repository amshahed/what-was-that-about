import { type FC, useCallback } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { BeatShot } from "../BeatVisual";
import { CaptionTrack } from "./CaptionTrack";
import { buildCaptionLines } from "../../captions";
import { musicVolumeAtFrame, SFX_DURATION_FRAMES, type SfxEvent } from "../../mix";
import type { BeatEntry } from "../../timeline";

export interface RoughCutProps {
  beats: BeatEntry[];
  /** staticFile() names (public folder of the bundle), not URLs. Empty = none. */
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
      {audioSrc && <Audio src={staticFile(audioSrc)} />}
      {musicSrc && <Audio src={staticFile(musicSrc)} volume={musicVolume} loop />}
      {sfxEvents.map((sfx, i) => (
        <Sequence
          key={`${sfx.startFrame}-${i}`}
          from={sfx.startFrame}
          durationInFrames={SFX_DURATION_FRAMES}
        >
          <Audio src={staticFile(sfx.src)} />
        </Sequence>
      ))}
      {beats.map((beat, i) => (
        <Sequence key={i} from={beat.startFrame} durationInFrames={beat.durationFrames}>
          <BeatShot beat={beat} />
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
