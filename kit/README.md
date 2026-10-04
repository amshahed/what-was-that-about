# Kit — the visual component library

Code-defined, deterministic, hand-drawn-style components that any scene can compose.

> **Scope (ADR 0002):** characters and scenes come from local AI stills. The kit covers
> **text-hero beats, diagrams and overlays**, where exact text matters. The old stick-figure actors
> and the Poseidon demo shots were removed (2026-10-04).

## Concept

A **scene** is data: a `SceneSpec` is an ordered list of **layers**, each naming a registered **component** by id and passing untyped props. `composeScene(spec)` looks up each component in the **registry** and renders the layers back-to-front. The script parser and `render-script` speak this format.

```ts
import { composeScene, type SceneSpec } from "./scene";
import "./library"; // side-effect: registers every component

const spec: SceneSpec = {
  layers: [
    { component: "bg:paper" },
    {
      component: "text:hero",
      props: { text: "HALF-LIFE", sub: "(not the video game)", color: "red" },
    },
  ],
  caption: "Ella is technically still available for comment.",
};
```

`SceneCanvas` (in `render/remotion/`) wraps `composeScene` in a Remotion `<Scene>` so it can render in a video pipeline.

## Catalogue (current)

| Id                | Kind       | Notable props                                                                       |
| ----------------- | ---------- | ----------------------------------------------------------------------------------- |
| `bg:paper`        | background | — _(plain paper, for text beats)_                                                   |
| `bg:office-wall`  | background | —                                                                                   |
| `text:hero`       | text       | `text`, `sub?`, `color? ("ink"\|"red"\|"sea"\|"gold")` — size shrinks for long text |
| `prop:desk`       | prop       | `x, y, w, h`                                                                        |
| `prop:papers`     | prop       | `x, y`                                                                              |
| `prop:pen`        | prop       | `x, y`                                                                              |
| `prop:watch`      | prop       | `x, y`                                                                              |
| `prop:wall-clock` | prop       | `x, y`                                                                              |
| `prop:plant`      | prop       | `x, y`                                                                              |
| `caption`         | overlay    | `text` _(auto-appended by `spec.caption`; bar at the top of the frame)_             |

Stage is **1920×1080**, origin top-left.

## Adding a new component

1. **Implement** a React function in `kit/primitives/` (or extend an existing file). Use the `R*` helpers in `kit/rough/rough.tsx` for the hand-drawn look — they're seeded, so output is **deterministic** (same input ⇒ same character every render — this is the basis for recurring-character gags).
2. **Register** it in `kit/library.tsx` under a canonical id (`bg:` / `text:` / `prop:` namespace) using the `num/str/bool/oneOf` helpers from `params.ts` for prop extraction:

   ```tsx
   register("prop:coffee", (p) => <Coffee x={num(p.x)} y={num(p.y)} steam={bool(p.steam, true)} />);
   ```

3. **Add a row** to the table above so the script parser and authors can discover it.
4. **Test** that the same props yield identical markup (see `scene.test.ts` for the pattern).

## Determinism

Rough.js is seeded (`SEED` in `kit/rough/style.ts`). The same shape with the same seed always produces the same path geometry, so a beat renders identically every time. Don't introduce per-call randomness in components.
