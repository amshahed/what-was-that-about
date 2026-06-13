import type { FC } from "react";
import { Scene } from "../Scene";
import { CaveOffice } from "../../../kit/primitives/backgrounds";
import { Desk, Papers, Pen, Trident } from "../../../kit/primitives/props";
import { StickFigure } from "../../../kit/primitives/StickFigure";
import { Caption } from "../../../kit/primitives/Caption";

// Shot A: god of the sea, doing paperwork.
export const PoseidonOffice: FC = () => (
  <Scene>
    <CaveOffice />
    {/* trident leaning at his side, behind the desk */}
    <Trident cx={650} topY={300} bottomY={720} />
    <StickFigure x={760} y={430} pose="sitting" />
    <Desk x={600} y={620} w={720} h={200} />
    <Papers x={860} y={628} />
    <Pen x={884} y={612} />
    <Caption text="Poseidon. God of the sea. Still can't escape the 9 to 5." />
  </Scene>
);
