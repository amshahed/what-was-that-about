// Full-stage (1920x1080) backgrounds. The paper base colour is drawn by <Scene>.

import { RLine, RRect, solid } from "../rough/rough";
import { PALETTE } from "../rough/style";
import { WallClock, SadPlant } from "./props";

const FLOOR = 900;

// A beige open-plan office.
export const OfficeWall = () => (
  <g>
    {RRect(0, 0, 1920, FLOOR, solid(PALETTE.wall))}
    {RRect(0, FLOOR, 1920, 1080 - FLOOR, solid("#cdb89a"))}
    {RLine(0, FLOOR, 1920, FLOOR, { strokeWidth: 4 })}
    {/* window with blinds */}
    {RRect(220, 170, 360, 240, solid("#cfe3f5"))}
    {RLine(220, 230, 580, 230, { strokeWidth: 2 })}
    {RLine(220, 290, 580, 290, { strokeWidth: 2 })}
    {RLine(220, 350, 580, 350, { strokeWidth: 2 })}
    <WallClock x={1480} y={250} />
    <SadPlant x={1620} y={FLOOR} />
  </g>
);

// Plain paper: the backdrop for text-hero beats (the paper colour itself is drawn by <Scene>).
export const Paper = () => <g />;
