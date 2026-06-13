import type { FC } from "react";
import { SceneCanvas } from "../SceneCanvas";
import type { SceneSpec } from "../../../kit/scene";

// Shot C: same guy, shirt and tie, checking the time.
export const poseidonTieSpec: SceneSpec = {
  id: "poseidon-tie",
  layers: [
    { component: "bg:office-wall" },
    { component: "actor:poseidon", props: { x: 820, y: 360, pose: "tie", tie: true, beard: true } },
    { component: "prop:watch", props: { x: 850, y: 372 } },
  ],
  caption: "Now he rules... a 3 p.m. sync.",
};

export const PoseidonTie: FC = () => <SceneCanvas spec={poseidonTieSpec} />;
