# Plan — Issue #6: Script → stills batch render

> Parent PRD: #1. Branch: `slice/6-stills-batch`. Type: **AFK** (pure technical).

## Goal
Given a parsed script (#5) and the kit registry (#4), render **every beat's still** as a 16:9 PNG into the episode `out/` directory with deterministic filenames. Validates the full parser→render chain and is the input to assembly (#7).

## Approach

### 1. Dynamic per-beat compositions
Currently `render/remotion/Root.tsx` hard-codes three named Compositions. For scripted episodes the beats are dynamic. Two options:
- **(a)** Register all beats up-front in `RemotionRoot` based on a loaded episode — requires Root to read the script.
- **(b)** Use a *single* parameterised Composition `beat-still` whose `defaultProps` is a `SceneSpec`, then call `selectComposition({ inputProps })` per beat to override.

**(b) is cleaner** — no Root coupling to a specific episode, one composition reused for every beat. Picking (b).

### 2. New composition
`render/remotion/compositions/BeatStill.tsx` — `SceneCanvas` wrapped in a Composition with `defaultProps: emptySceneSpec`. Each render call passes the beat's actual `SceneSpec` via `inputProps`.

### 3. CLI: `render:script`
`scripts/render-script.ts`:
- args: path to `script.yml` (or an episode directory containing one).
- parses with `parseScript()`.
- bundles Remotion once.
- for each beat: `selectComposition({ id: "beat-still", inputProps: beat.scene })` → `renderStill({ output: <out>/beat-NNN.png })`.
- output dir is `<episodeDir>/out/stills/`, deterministic filenames `beat-001.png`, `beat-002.png`, ...

### 4. Smoke test
Use `episodes/sample/script.yml` (parses cleanly today). Manual local invocation: `npm run render:script episodes/sample` → produces 3 PNGs that match the existing kit/samples shots semantically (cave-office, sea-glory, office-wall) — visual confirmation of the chain.

### 5. Unit tests
- `parseScript` happy path is already tested (#5).
- The render scripts call into the Remotion runtime which downloads headless Chrome — not appropriate for CI unit tests. The render CLI is exercised manually; CI lint/typecheck/build guards correctness statically. (Same rationale that kept actual render out of CI in #2.)

### 6. Determinism
Same input → identical PNGs (seeded Rough.js + deterministic composeScene already proven). The CLI is a thin orchestrator over already-deterministic primitives.

## Files to add / modify
- add: `render/remotion/compositions/BeatStill.tsx`, `scripts/render-script.ts`
- modify: `render/remotion/Root.tsx` (register `beat-still`), `package.json` (add `render:script` script), `plan.md` (status)

## Acceptance criteria → how met
- [ ] Feeding the sample script outputs one correctly-named PNG per beat in 16:9 → `render:script episodes/sample` produces 3 PNGs at 1920×1080
- [ ] Re-running is deterministic (same input → identical outputs) → seeded primitives + composeScene determinism (covered by existing tests)
- [ ] Missing/invalid component references surface as actionable errors → parser already throws `ScriptParseError` at load

## Out of scope
- Audio sync (#7).
- Video assembly (#7).
- Vertical (9:16) — that's slice #11.
