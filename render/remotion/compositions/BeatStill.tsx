// A single parameterised Composition reused for every beat in any episode.
// The script renderer (scripts/render-script.ts) passes the beat's SceneSpec
// via Remotion's `inputProps`, so Root never needs to know about specific episodes.

import type { FC } from "react";
import { SceneCanvas } from "../SceneCanvas";
import type { SceneSpec } from "../../../kit/scene";

const EMPTY_SPEC: SceneSpec = { layers: [{ component: "bg:office-wall" }] };

export const BeatStill: FC<{ spec?: SceneSpec }> = ({ spec }) => (
  <SceneCanvas spec={spec ?? EMPTY_SPEC} />
);

export const BEAT_STILL_DEFAULT_PROPS = { spec: EMPTY_SPEC } as const;
