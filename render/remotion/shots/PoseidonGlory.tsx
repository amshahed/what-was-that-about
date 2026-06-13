import type { FC } from "react";
import { SceneCanvas } from "../SceneCanvas";
import type { SceneSpec } from "../../../kit/scene";

// Shot B: the same guy, in his full mythic glory.
export const poseidonGlorySpec: SceneSpec = {
  id: "poseidon-glory",
  layers: [
    { component: "bg:sea-glory" },
    { component: "prop:trident", props: { cx: 1060, topY: 150, bottomY: 400 } },
    { component: "actor:poseidon", props: { x: 940, y: 300, pose: "glory", longHair: true, beard: true } },
  ],
  caption: "Once, he ruled the oceans.",
};

export const PoseidonGlory: FC = () => <SceneCanvas spec={poseidonGlorySpec} />;
