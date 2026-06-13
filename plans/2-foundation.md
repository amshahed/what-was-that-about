# Plan — Issue #2: Foundation

> Scaffold + render-stack decision + house-style spike + CI. Parent PRD: #1. Branch: `slice/2-foundation`.
> Type: **HITL** (two human gates: render-stack decision + house-style sign-off).

## Goal
Stand up the TypeScript project, **decide & document the render stack**, **prove the house style** with sample shots (the biggest project risk), and wire CI so every later PR has a green/red gate.

---

## ⚠️ Decision to confirm: render stack
This choice shapes slices #7–#11, so we lock it here.

| | **Remotion (recommended)** | SVG→PNG + FFmpeg |
|---|---|---|
| What | React components → video (headless Chrome + FFmpeg) | Render each scene to PNG (resvg/sharp), stitch with FFmpeg |
| Pros | Unifies components + motion + captions + audio + 9:16 in ONE framework → collapses #7/#8/#9/#11; great preview DX | Lighter deps, fully scriptable, no React/Chrome at render |
| Cons | Heavier dep; headless-Chrome render; licensing tiers | You hand-build motion/caption/mix glue (more code across slices) |
| Licensing | Free for individuals & small teams (our case) | N/A |
| Effort-to-zero (PRD §13) | **Best** — most automation reuse | More custom glue per slice |

**Recommendation: Remotion** — it most directly serves the "drive per-episode effort to zero" constraint, and Rough.js output (SVG/canvas) embeds cleanly in Remotion components.

---

## Approach / steps
1. **Tooling:** Node + npm, TypeScript (strict), ESLint + Prettier, Vitest, `tsx`.
2. **Repo structure** (PRD §8.5): `kit/`, `render/`, `shared/`, `episodes/`, `scripts/`, `docs/adr/`, (`plans/` exists).
3. **Render stack:** install Remotion; a minimal composition that renders one frame (proves the toolchain).
4. **Rough.js styling layer:** `kit/rough/` helper + minimal primitives (`stickFigure`, `prop`, `background`) — only enough for the samples.
5. **Sample shots:** 3 stills proving the look, the canonical Poseidon gag —
   (a) ocean-cave-as-corporate-office, stick-Poseidon signing papers with a trident;
   (b) glorious Poseidon, hair/beard flowing;
   (c) Poseidon in shirt-and-tie checking his watch.
   Output to `kit/samples/*.png` via an `npm run render:samples` script.
6. **CI:** `.github/workflows/ci.yml` — install + lint + typecheck + build + test on PRs to `main`. (Heavy headless render stays local, not in CI.)
7. **ADR:** `docs/adr/0001-render-stack.md` recording the decision + rationale.
8. **README/plan.md:** document the npm scripts; flip #2 status to in-progress.

## Files to add (sketch)
- `package.json`, `tsconfig.json`, `.eslintrc`, `.prettierrc`, `vitest.config.ts`
- `kit/rough/style.ts`, `kit/primitives/{stickFigure,prop,background}.ts`
- `render/remotion/` (root + sample still composition)
- `scripts/render-samples.ts`
- `kit/samples/` (output)
- `.github/workflows/ci.yml`
- `docs/adr/0001-render-stack.md`

## Test strategy
- CI: lint + typecheck + build + unit tests pass.
- Unit: rough styling helper produces deterministic output (smoke).
- `render:samples` emits exactly 3 PNGs (local smoke; manual visual review).

## Acceptance criteria → how met
- [ ] Builds/lints from clean clone → tooling + CI + README scripts
- [ ] ADR committed → `docs/adr/0001-render-stack.md`
- [ ] `render:samples` outputs 3 PNGs incl. Poseidon-in-a-suit → step 5
- [ ] **User signs off on house style** → present `kit/samples/*.png` (HITL gate)
- [ ] CI green on PR → `.github/workflows/ci.yml`

## Out of scope (later slices)
Full video assembly (#3/#7), script parser (#4), stills batch (#5), alignment (#6).

## Risks
- Remotion + Rough.js integration friction → de-risk with the single-frame spike before building primitives.
- Style might not land first try → samples are cheap to iterate; that's the point of the gate.
