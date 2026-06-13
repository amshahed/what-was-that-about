// The recurring "Poseidon" actor. Deterministic (seeded Rough.js), so the same
// character reads as the same guy across shots — the basis for recurring gags.

import { RCircle, RLine, RCurve, RRect, RPolygon, solid } from "../rough/rough";
import { PALETTE } from "../rough/style";

const BEARD = "#e6e9ec";

type Pose = "sitting" | "glory" | "tie";

interface Props {
  x: number; // head centre x
  y: number; // head centre y
  pose: Pose;
  beard?: boolean;
  longHair?: boolean;
  tie?: boolean;
}

const Head = ({ x, y, r, beard, longHair }: { x: number; y: number; r: number; beard: boolean; longHair: boolean }) => (
  <g>
    {/* hair / flowing locks */}
    {RCurve(
      longHair
        ? [
            [x - r, y - r * 0.2],
            [x - r * 1.5, y + r * 0.8],
            [x - r * 1.1, y + r * 1.6],
            [x - r * 1.7, y + r * 2.2],
          ]
        : [
            [x - r * 0.9, y - r * 0.3],
            [x - r * 1.2, y + r * 0.4],
            [x - r * 0.8, y + r * 0.9],
          ],
      { stroke: "#cfd4d8", strokeWidth: 4 },
    )}
    {RCurve(
      longHair
        ? [
            [x + r, y - r * 0.2],
            [x + r * 1.5, y + r * 0.8],
            [x + r * 1.1, y + r * 1.6],
            [x + r * 1.7, y + r * 2.2],
          ]
        : [
            [x + r * 0.9, y - r * 0.3],
            [x + r * 1.2, y + r * 0.4],
            [x + r * 0.8, y + r * 0.9],
          ],
      { stroke: "#cfd4d8", strokeWidth: 4 },
    )}
    {/* crown of hair */}
    {RCurve(
      [
        [x - r * 0.8, y - r * 0.7],
        [x - r * 0.3, y - r * 1.15],
        [x + r * 0.3, y - r * 0.95],
        [x + r * 0.8, y - r * 1.2],
        [x + r * 0.9, y - r * 0.6],
      ],
      { stroke: "#cfd4d8", strokeWidth: 4 },
    )}
    {/* head */}
    {RCircle(x, y, r * 2, solid(PALETTE.skin))}
    {/* eyes */}
    {RCircle(x - 15, y - 6, 7, solid(PALETTE.ink))}
    {RCircle(x + 15, y - 6, 7, solid(PALETTE.ink))}
    {/* brow (a touch of gravitas) */}
    {RLine(x - 24, y - 18, x - 6, y - 14)}
    {RLine(x + 6, y - 14, x + 24, y - 18)}
    {/* mouth */}
    {RLine(x - 12, y + 14, x + 12, y + 16)}
    {/* beard */}
    {beard &&
      RPolygon(
        [
          [x - r * 0.7, y + r * 0.4],
          [x - r * 0.5, y + r * 1.5],
          [x, y + r * 1.95],
          [x + r * 0.5, y + r * 1.5],
          [x + r * 0.7, y + r * 0.4],
        ],
        solid(BEARD),
      )}
  </g>
);

export const StickFigure = ({ x, y, pose, beard = true, longHair = false, tie = false }: Props) => {
  const r = 46;
  const neck = y + r;
  const shoulder = neck + 16;

  return (
    <g>
      {pose === "glory" && <GloryBody x={x} shoulder={shoulder} neck={neck} />}
      {pose === "sitting" && <SittingBody x={x} shoulder={shoulder} neck={neck} />}
      {pose === "tie" && <TieBody x={x} shoulder={shoulder} neck={neck} tie={tie} />}
      <Head x={x} y={y} r={r} beard={beard} longHair={longHair} />
    </g>
  );
};

const GloryBody = ({ x, shoulder, neck }: { x: number; shoulder: number; neck: number }) => {
  const hip = neck + 190;
  return (
    <g>
      {RLine(x, neck, x, hip)}
      {/* legs, planted heroically */}
      {RLine(x, hip, x - 60, hip + 150)}
      {RLine(x, hip, x + 60, hip + 150)}
      {/* raised arm (holds trident, drawn by the shot) */}
      {RLine(x, shoulder, x + 120, shoulder - 150)}
      {/* other arm, flung out */}
      {RLine(x, shoulder, x - 130, shoulder + 30)}
    </g>
  );
};

const SittingBody = ({ x, shoulder, neck }: { x: number; shoulder: number; neck: number }) => {
  const hip = neck + 120;
  return (
    <g>
      {RLine(x, neck, x, hip)}
      {/* arm holding trident upright at his side */}
      {RLine(x, shoulder, x - 95, shoulder + 30)}
      {/* arm reaching forward to sign on the desk */}
      {RLine(x, shoulder + 10, x + 120, shoulder + 95)}
    </g>
  );
};

const TieBody = ({ x, shoulder, neck, tie }: { x: number; shoulder: number; neck: number; tie: boolean }) => {
  const hip = neck + 175;
  return (
    <g>
      {/* shirt torso */}
      {RRect(x - 42, neck, 84, hip - neck, solid(PALETTE.shirt))}
      {/* collar */}
      {RLine(x, neck + 4, x - 22, neck + 34)}
      {RLine(x, neck + 4, x + 22, neck + 34)}
      {/* tie */}
      {tie &&
        RPolygon(
          [
            [x, neck + 8],
            [x - 13, neck + 24],
            [x - 9, hip - 35],
            [x, hip - 18],
            [x + 9, hip - 35],
            [x + 13, neck + 24],
          ],
          solid(PALETTE.tie),
        )}
      {/* legs / trousers */}
      {RLine(x - 18, hip, x - 30, hip + 150)}
      {RLine(x + 18, hip, x + 30, hip + 150)}
      {/* left arm down */}
      {RLine(x - 38, shoulder + 6, x - 95, shoulder + 130)}
      {/* right arm bent up, checking the watch */}
      {RLine(x + 40, shoulder + 6, x + 95, shoulder + 60)}
      {RLine(x + 95, shoulder + 60, x + 30, shoulder - 6)}
    </g>
  );
};
