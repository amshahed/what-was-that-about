import type { FC } from "react";
import { Scene } from "../Scene";
import { SeaGlory } from "../../../kit/primitives/backgrounds";
import { Trident } from "../../../kit/primitives/props";
import { StickFigure } from "../../../kit/primitives/StickFigure";
import { Caption } from "../../../kit/primitives/Caption";

// Shot B: the same guy, in his full mythic glory.
export const PoseidonGlory: FC = () => (
  <Scene>
    <SeaGlory />
    <Trident cx={1060} topY={150} bottomY={400} />
    <StickFigure x={940} y={300} pose="glory" longHair beard />
    <Caption text="Once, he ruled the oceans." />
  </Scene>
);
