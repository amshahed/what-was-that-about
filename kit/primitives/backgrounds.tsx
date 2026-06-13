// Full-stage (1920x1080) backgrounds. The paper base colour is drawn by <Scene>.

import { RLine, RRect, RCircle, RCurve, RPolygon, solid } from "../rough/rough";
import { PALETTE } from "../rough/style";
import { WallClock, SadPlant } from "./props";

const FLOOR = 900;

const Fish = ({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) => {
  const d = flip ? -1 : 1;
  return (
    <g>
      {RCircle(x, y, 34, solid("#e08a5a"))}
      {RPolygon(
        [
          [x + d * 16, y],
          [x + d * 40, y - 16],
          [x + d * 40, y + 16],
        ],
        solid("#e08a5a"),
      )}
      {RCircle(x - d * 8, y - 4, 5, solid(PALETTE.ink))}
    </g>
  );
};

// Shot A — an ocean cave decorated like a corporate office.
export const CaveOffice = () => (
  <g>
    {/* rock walls */}
    {RPolygon([[0, 0], [330, 0], [210, 360], [300, 640], [0, FLOOR]], solid(PALETTE.rock))}
    {RPolygon([[1920, 0], [1600, 0], [1720, 380], [1640, 660], [1920, FLOOR]], solid(PALETTE.rock))}
    {/* floor */}
    {RRect(0, FLOOR, 1920, 1080 - FLOOR, solid("#b9a980"))}
    {RLine(0, FLOOR, 1920, FLOOR, { strokeWidth: 4 })}
    {/* porthole window to the sea */}
    {RCircle(1480, 320, 300, solid(PALETTE.sea))}
    {RCircle(1480, 320, 330, { strokeWidth: 8, stroke: "#6b6b6b" })}
    <Fish x={1410} y={300} />
    <Fish x={1545} y={365} flip />
    {RCurve([[1360, 250], [1420, 260], [1480, 248], [1560, 262]], { stroke: "#bfe0ff", strokeWidth: 3 })}
    {/* a lone motivational frame */}
    {RRect(360, 200, 230, 150, solid(PALETTE.paper2))}
    {RLine(390, 280, 560, 280, { strokeWidth: 2 })}
    {RLine(400, 312, 550, 312, { strokeWidth: 2 })}
  </g>
);

// Shot B — the open sea, in his glory.
export const SeaGlory = () => (
  <g>
    {RRect(0, 0, 1920, 560, solid("#bfe1ff"))}
    {RRect(0, 520, 1920, 560, solid(PALETTE.sea))}
    {RCircle(1640, 200, 180, solid("#ffe7a0"))}
    {/* big waves */}
    {RCurve([[-50, 560], [300, 510], [620, 580], [980, 520], [1340, 590], [1700, 525], [1980, 575]], {
      stroke: "#ffffff",
      strokeWidth: 6,
    })}
    {RCurve([[-50, 660], [360, 610], [720, 680], [1080, 615], [1440, 685], [1980, 625]], {
      stroke: "#dff0ff",
      strokeWidth: 5,
    })}
    {RCurve([[-50, 780], [420, 740], [840, 800], [1320, 740], [1980, 800]], {
      stroke: "#cfe7ff",
      strokeWidth: 5,
    })}
    {/* spray */}
    {RCircle(520, 520, 16, solid(PALETTE.paper2))}
    {RCircle(560, 495, 12, solid(PALETTE.paper2))}
    {RCircle(1300, 540, 14, solid(PALETTE.paper2))}
  </g>
);

// Shot C — a beige open-plan office.
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
