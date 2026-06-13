# Kit — the visual component library

Code-defined, deterministic, hand-drawn-style components that any scene can compose.

## Concept
A **scene** is data: a `SceneSpec` is an ordered list of **layers**, each naming a registered **component** by id and passing untyped props. `composeScene(spec)` looks up each component in the **registry** and renders the layers back-to-front. The script parser (#5) and the stills batch (#6) speak this format.

```ts
import { composeScene, type SceneSpec } from "./scene";
import "./library"; // side-effect: registers every component

const spec: SceneSpec = {
  layers: [
    { component: "bg:office-wall" },
    { component: "actor:poseidon", props: { x: 820, y: 360, pose: "tie", tie: true } },
    { component: "prop:watch", props: { x: 850, y: 372 } },
  ],
  caption: "Now he rules... a 3 p.m. sync.",
};
```

`SceneCanvas` (in `render/remotion/`) wraps `composeScene` in a Remotion `<Scene>` so it can render in a video pipeline.

## Catalogue (current)
| Id | Kind | Notable props |
|---|---|---|
| `bg:cave-office` | background | — |
| `bg:sea-glory` | background | — |
| `bg:office-wall` | background | — |
| `actor:poseidon` | actor | `x, y, pose ("sitting"\|"glory"\|"tie"), beard, longHair, tie` |
| `actor:narrator` | actor | `x, y, pose, beard, tie` *(placeholder — restyle later)* |
| `prop:trident` | prop | `cx, topY, bottomY` |
| `prop:desk` | prop | `x, y, w, h` |
| `prop:papers` | prop | `x, y` |
| `prop:pen` | prop | `x, y` |
| `prop:watch` | prop | `x, y` |
| `prop:wall-clock` | prop | `x, y` |
| `prop:plant` | prop | `x, y` |
| `caption` | overlay | `text` *(auto-appended by `spec.caption`)* |

Stage is **1920×1080**, origin top-left.

## Adding a new component
1. **Implement** a React function in `kit/primitives/` (or extend an existing file). Use the `R*` helpers in `kit/rough/rough.tsx` for the hand-drawn look — they're seeded, so output is **deterministic** (same input ⇒ same character every render — this is the basis for recurring-character gags).
2. **Register** it in `kit/library.tsx` under a canonical id (`bg:` / `actor:` / `prop:` namespace) using the `num/str/bool/oneOf` helpers from `params.ts` for prop extraction:

   ```tsx
   register("prop:coffee", (p) => <Coffee x={num(p.x)} y={num(p.y)} steam={bool(p.steam, true)} />);
   ```

3. **Add a row** to the table above so the script parser and authors can discover it.
4. **Test** that the same props yield identical markup (see `scene.test.ts` for the pattern).

## Determinism
Rough.js is seeded (`SEED` in `kit/rough/style.ts`). The same shape with the same seed always produces the same path geometry — that's why "office Poseidon" is recognisably the same guy as "glorious Poseidon" three shots later. Don't introduce per-call randomness in components.
