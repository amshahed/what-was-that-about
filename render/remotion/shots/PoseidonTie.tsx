import type { FC } from "react";
import { Scene } from "../Scene";
import { OfficeWall } from "../../../kit/primitives/backgrounds";
import { Watch } from "../../../kit/primitives/props";
import { StickFigure } from "../../../kit/primitives/StickFigure";
import { Caption } from "../../../kit/primitives/Caption";

// Shot C: same guy, shirt and tie, checking the time.
export const PoseidonTie: FC = () => (
  <Scene>
    <OfficeWall />
    <StickFigure x={820} y={360} pose="tie" tie beard />
    <Watch x={850} y={372} />
    <Caption text="Now he rules... a 3 p.m. sync." />
  </Scene>
);
