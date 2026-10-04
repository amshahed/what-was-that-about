// What a beat shows on screen: a code-kit scene (Rough.js layers) or an AI still (PNG made by
// `npm run generate-scenes`), with the beat's caption drawn on top in the kit style either way.

import type { FC } from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { composeScene } from "../../kit/scene";
import { isImageScene } from "../../kit/script";
import { PALETTE, STAGE } from "../../kit/rough/style";
import { SceneCanvas } from "./SceneCanvas";
import { ZoomedScene } from "./compositions/ZoomedScene";
import type { BeatEntry } from "../timeline";
import "../../kit/library";

// Slight overscan: trims ~2% at each edge, where Flux sometimes leaves signature-like marks.
export const STILL_OVERSCAN = 1.04;

export const ImageCanvas: FC<{ still: string; caption?: string; pixelated?: boolean }> = ({
  still,
  caption,
  pixelated,
}) => (
  <AbsoluteFill style={{ backgroundColor: PALETTE.paper, overflow: "hidden" }}>
    <Img
      src={staticFile(still)}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transform: `scale(${STILL_OVERSCAN})`,
        ...(pixelated && { imageRendering: "pixelated" as const }),
      }}
    />
    {caption && (
      <AbsoluteFill>
        <svg
          width={STAGE.w}
          height={STAGE.h}
          viewBox={`0 0 ${STAGE.w} ${STAGE.h}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          {composeScene({ layers: [], caption })}
        </svg>
      </AbsoluteFill>
    )}
  </AbsoluteFill>
);

/** withCaption=false leaves out scene.caption (Shorts draws it separately, at 9:16 width). */
export const BeatVisual: FC<{ beat: BeatEntry; withCaption?: boolean }> = ({
  beat,
  withCaption = true,
}) => {
  const { scene } = beat;
  if (isImageScene(scene)) {
    if (!beat.still) {
      // The CLIs check this before rendering; this is only a safety net.
      throw new Error(`AI still missing for beat "${scene.image.slice(0, 60)}"`);
    }
    return (
      <ImageCanvas
        still={beat.still}
        caption={withCaption ? scene.caption : undefined}
        pixelated={beat.pixelated}
      />
    );
  }
  return <SceneCanvas spec={withCaption ? scene : { ...scene, caption: undefined }} />;
};

/** A beat as a shot: plain, or with the Ken Burns punch-in when tagged ZOOM. */
export const BeatShot: FC<{ beat: BeatEntry; withCaption?: boolean }> = ({ beat, withCaption }) =>
  beat.zoom ? (
    <ZoomedScene durationFrames={beat.durationFrames}>
      <BeatVisual beat={beat} withCaption={withCaption} />
    </ZoomedScene>
  ) : (
    <AbsoluteFill>
      <BeatVisual beat={beat} withCaption={withCaption} />
    </AbsoluteFill>
  );
