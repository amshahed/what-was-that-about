// Reusable props. All seeded => stable across renders.

import { RLine, RRect, RCircle, RPolygon, RCurve, solid } from "../rough/rough";
import { PALETTE } from "../rough/style";

export const Trident = ({ cx, topY, bottomY }: { cx: number; topY: number; bottomY: number }) => {
  const g = { stroke: PALETTE.gold, strokeWidth: 7 } as const;
  return (
    <g>
      {RLine(cx, topY, cx, bottomY, g)}
      {/* tines */}
      {RLine(cx, topY - 6, cx, topY - 52, g)}
      {RLine(cx, topY - 4, cx - 24, topY - 48, g)}
      {RLine(cx, topY - 4, cx + 24, topY - 48, g)}
      {RLine(cx - 26, topY - 6, cx + 26, topY - 6, g)}
    </g>
  );
};

export const Desk = ({ x, y, w, h }: { x: number; y: number; w: number; h: number }) => (
  <g>
    {RRect(x, y, w, 26, solid("#9c6b3b"))}
    {RRect(x + 14, y + 26, w - 28, h - 26, solid("#b9824c"))}
    {/* drawer seams */}
    {RLine(x + w - 90, y + 40, x + w - 90, y + h - 12, { strokeWidth: 2 })}
    {RCircle(x + w - 60, y + 70, 10, solid(PALETTE.ink))}
  </g>
);

export const Papers = ({ x, y }: { x: number; y: number }) => (
  <g>
    {RRect(x, y, 150, 100, solid(PALETTE.paper2))}
    {RLine(x + 18, y + 28, x + 132, y + 28, { strokeWidth: 2 })}
    {RLine(x + 18, y + 50, x + 132, y + 50, { strokeWidth: 2 })}
    {RLine(x + 18, y + 72, x + 100, y + 72, { strokeWidth: 2 })}
    {/* signature line */}
    {RCurve(
      [
        [x + 40, y + 88],
        [x + 60, y + 78],
        [x + 80, y + 92],
        [x + 110, y + 80],
      ],
      { stroke: "#2b50b4", strokeWidth: 3 },
    )}
  </g>
);

export const Pen = ({ x, y }: { x: number; y: number }) => RLine(x, y, x + 46, y - 30, { stroke: "#222", strokeWidth: 5 });

export const Watch = ({ x, y }: { x: number; y: number }) => (
  <g>
    {RRect(x - 16, y - 14, 32, 28, solid("#888"))}
    {RCircle(x, y, 22, solid(PALETTE.paper2))}
    {RLine(x, y, x, y - 8, { strokeWidth: 2 })}
    {RLine(x, y, x + 6, y, { strokeWidth: 2 })}
  </g>
);

export const WallClock = ({ x, y }: { x: number; y: number }) => (
  <g>
    {RCircle(x, y, 130, solid(PALETTE.paper2))}
    {RLine(x, y, x, y - 46, { strokeWidth: 4 })}
    {RLine(x, y, x + 34, y + 14, { strokeWidth: 4 })}
    {RCircle(x, y, 8, solid(PALETTE.ink))}
  </g>
);

export const SadPlant = ({ x, y }: { x: number; y: number }) => (
  <g>
    {RPolygon(
      [
        [x - 34, y],
        [x + 34, y],
        [x + 26, y + 70],
        [x - 26, y + 70],
      ],
      solid("#c2703a"),
    )}
    {/* drooping leaves */}
    {RCurve([[x, y], [x - 30, y - 50], [x - 52, y - 30]], { stroke: "#5a8f4a", strokeWidth: 5 })}
    {RCurve([[x, y], [x + 28, y - 56], [x + 50, y - 24]], { stroke: "#5a8f4a", strokeWidth: 5 })}
    {RCurve([[x, y], [x, y - 64], [x + 8, y - 40]], { stroke: "#6fa356", strokeWidth: 5 })}
  </g>
);
