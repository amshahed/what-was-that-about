import { type FC, useCallback } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { CAPTION_FONT, PALETTE, STAGE } from "../../../kit/rough/style";
import { BeatShot } from "../BeatVisual";
import { CaptionTrack } from "./CaptionTrack";
import { buildCaptionLines } from "../../captions";
import { musicVolumeAtFrame, SFX_DURATION_FRAMES, type SfxEvent } from "../../mix";
import type { BeatEntry } from "../../timeline";

const SHORTS_W = 1080;
const SHORTS_H = 1920;
// Scale factor to fill the 9:16 frame height from the 16:9 source; center-crops width.
const SCENE_SCALE = SHORTS_H / STAGE.h;

export interface ShortsProps {
  beats: BeatEntry[];
  /** staticFile() names (public folder of the bundle), not URLs. Empty = none. */
  audioSrc: string;
  audioStartFrame: number;
  musicSrc: string;
  sfxEvents: SfxEvent[];
  totalFrames: number;
}

export const SHORTS_DEFAULT_PROPS: ShortsProps = {
  beats: [],
  audioSrc: "",
  audioStartFrame: 0,
  musicSrc: "",
  sfxEvents: [],
  totalFrames: 30,
};

const SceneCaption: FC<{ text: string }> = ({ text }) => (
  <AbsoluteFill style={{ alignItems: "center", paddingTop: 120, pointerEvents: "none" }}>
    <div
      style={{
        backgroundColor: "#fffef6",
        border: `3px solid ${PALETTE.ink}`,
        borderRadius: 10,
        padding: "16px 28px",
        maxWidth: "88%",
        textAlign: "center",
        fontFamily: CAPTION_FONT,
        fontSize: 56,
        lineHeight: 1.25,
        color: PALETTE.ink,
        overflowWrap: "break-word",
      }}
    >
      {text}
    </div>
  </AbsoluteFill>
);

export const Shorts: FC<ShortsProps> = ({
  beats,
  audioSrc,
  audioStartFrame,
  musicSrc,
  sfxEvents,
}) => {
  const captionLines = buildCaptionLines(beats);
  const musicVolume = useCallback((f: number) => musicVolumeAtFrame(f, beats), [beats]);
  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.paper, overflow: "hidden" }}>
      {/* Scene content: scale 16:9 source to fill 9:16 height, center-crop width */}
      <div
        style={{
          position: "absolute",
          width: STAGE.w,
          height: STAGE.h,
          left: "50%",
          top: 0,
          transformOrigin: "top center",
          transform: `translateX(-50%) scale(${SCENE_SCALE})`,
        }}
      >
        {beats.map((beat, i) => (
          <Sequence key={i} from={beat.startFrame} durationInFrames={beat.durationFrames}>
            <BeatShot beat={beat} withCaption={false} />
          </Sequence>
        ))}
      </div>
      {/* Audio — startFrom seeks into narration at the selected beat offset */}
      {audioSrc && <Audio src={staticFile(audioSrc)} startFrom={audioStartFrame} />}
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
      {/* Beat captions (scene.caption) at the top, at 9:16 width — inside the 16:9 layer they would be cropped */}
      {beats.map((beat, i) =>
        beat.scene.caption ? (
          <Sequence key={`cap-${i}`} from={beat.startFrame} durationInFrames={beat.durationFrames}>
            <SceneCaption text={beat.scene.caption} />
          </Sequence>
        ) : null,
      )}
      {/* Captions: rendered at native 9:16 resolution, not inside the scaled div */}
      <CaptionTrack lines={captionLines} />
    </AbsoluteFill>
  );
};

// Expose dimensions for width/height sanity check
export const SHORTS_DIMENSIONS = { w: SHORTS_W, h: SHORTS_H };
