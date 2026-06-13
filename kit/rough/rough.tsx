// Thin wrapper turning Rough.js drawables into deterministic SVG <path> elements.
// Everything is seeded (style.ts SEED) so the same call always renders the same wobble.

import type { ReactElement } from "react";
import rough from "roughjs";
import type { Options } from "roughjs/bin/core";
import { INK, SEED } from "./style";

const gen = rough.generator();

const base = (o?: Options): Options => ({
  seed: SEED,
  roughness: 1.5,
  bowing: 1.1,
  stroke: INK,
  strokeWidth: 3,
  ...o,
});

type Drawable = ReturnType<typeof gen.rectangle>;

function toPaths(drawable: Drawable): ReactElement {
  const parts = gen.toPaths(drawable);
  return (
    <>
      {parts.map((p, i) => (
        <path
          key={i}
          d={p.d}
          stroke={p.stroke}
          strokeWidth={p.strokeWidth}
          fill={p.fill ?? "none"}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </>
  );
}

type Pt = [number, number];

export const RRect = (x: number, y: number, w: number, h: number, o?: Options) =>
  toPaths(gen.rectangle(x, y, w, h, base(o)));

export const REllipse = (cx: number, cy: number, w: number, h: number, o?: Options) =>
  toPaths(gen.ellipse(cx, cy, w, h, base(o)));

export const RCircle = (cx: number, cy: number, diameter: number, o?: Options) =>
  toPaths(gen.circle(cx, cy, diameter, base(o)));

export const RLine = (x1: number, y1: number, x2: number, y2: number, o?: Options) =>
  toPaths(gen.line(x1, y1, x2, y2, base(o)));

export const RPath = (d: string, o?: Options) => toPaths(gen.path(d, base(o)));

export const RPolygon = (points: Pt[], o?: Options) => toPaths(gen.polygon(points, base(o)));

export const RCurve = (points: Pt[], o?: Options) => toPaths(gen.curve(points, base(o)));

export const RLinearPath = (points: Pt[], o?: Options) => toPaths(gen.linearPath(points, base(o)));

// Solid fill helper (Rough's hachure off) for blocks of colour.
export const solid = (fill: string): Options => ({ fill, fillStyle: "solid", strokeWidth: 2.5 });
