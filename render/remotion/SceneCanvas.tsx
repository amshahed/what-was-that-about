// Remotion wrapper that turns a SceneSpec into a rendered frame.
// Importing this file also registers every kit component (side-effect of importing `library`).

import type { FC } from "react";
import { Scene } from "./Scene";
import { composeScene, type SceneSpec } from "../../kit/scene";
import "../../kit/library";

export const SceneCanvas: FC<{ spec: SceneSpec }> = ({ spec }) => (
  <Scene>{composeScene(spec)}</Scene>
);
