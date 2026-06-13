import type { FC } from "react";
import { SceneCanvas } from "../SceneCanvas";
import type { SceneSpec } from "../../../kit/scene";

// Shot A: god of the sea, doing paperwork.
export const poseidonOfficeSpec: SceneSpec = {
  id: "poseidon-office",
  layers: [
    { component: "bg:cave-office" },
    { component: "prop:trident", props: { cx: 650, topY: 300, bottomY: 720 } },
    { component: "actor:poseidon", props: { x: 760, y: 430, pose: "sitting" } },
    { component: "prop:desk", props: { x: 600, y: 620, w: 720, h: 200 } },
    { component: "prop:papers", props: { x: 860, y: 628 } },
    { component: "prop:pen", props: { x: 884, y: 612 } },
  ],
  caption: "Poseidon. God of the sea. Still can't escape the 9 to 5.",
};

export const PoseidonOffice: FC = () => <SceneCanvas spec={poseidonOfficeSpec} />;
