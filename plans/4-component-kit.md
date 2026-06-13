# Plan — Issue #4: Component kit + composition API

> Parent PRD: #1. Branch: `slice/4-component-kit`. Type: **AFK** (technical architecture, no new art).

## Goal
Turn the spike's hard-coded shots into a real, reusable system: a **component registry**, a **declarative SceneSpec**, and a **`composeScene()`** API that the script parser (#5) and stills batch (#6) can drive.

## Approach
1. **Param helpers** (`kit/params.ts`): `num/str/bool/oneOf` — type-safe extraction from `Record<string, unknown>`, with required/default semantics. Doubles as the validation primitive #5 will reuse.
2. **Registry** (`kit/registry.tsx`): id → `(props) => ReactElement`. `register/get/has/ids`.
3. **SceneSpec + composeScene** (`kit/scene.tsx`): data-only scene description (`{ layers: [{ component, props }], caption? }`); `composeScene(spec)` looks up and renders layers in order. Caption is a convenience field that appends a `caption` layer.
4. **Library** (`kit/library.tsx`): import primitives and register them under canonical ids:
   - `bg:cave-office`, `bg:sea-glory`, `bg:office-wall`
   - `actor:poseidon` (params: `x,y,pose,beard,longHair,tie`)
   - `actor:narrator` (no beard, no flowing hair — placeholder utility)
   - `prop:trident`, `prop:desk`, `prop:papers`, `prop:pen`, `prop:watch`, `prop:wall-clock`, `prop:plant`
   - `caption`
5. **SceneCanvas** (`render/remotion/SceneCanvas.tsx`): Remotion wrapper that renders `<Scene>{composeScene(spec)}</Scene>`. Side-effect-imports `kit/library` to guarantee registrations.
6. **Refactor shots** to data: each `PoseidonOffice/Glory/Tie.tsx` becomes a `SceneSpec` + a one-liner component using `SceneCanvas`. Existing samples render identically (regression check).
7. **Tests** (`kit/scene.test.ts`):
   - `composeScene` of a fixed spec is deterministic across renders (renderToStaticMarkup string equality).
   - Unknown component id throws a clear error.
   - The same actor spec renders identically when used twice (recurring-character invariant).
8. **Docs**: short `kit/README.md` covering "how to add a component" and the SceneSpec shape.
9. Update root `plan.md` status.

## Files to add / modify
- add: `kit/params.ts`, `kit/registry.tsx`, `kit/scene.tsx`, `kit/library.tsx`, `kit/README.md`, `kit/scene.test.ts`, `render/remotion/SceneCanvas.tsx`
- modify: `render/remotion/shots/PoseidonOffice.tsx`, `PoseidonGlory.tsx`, `PoseidonTie.tsx`, `plan.md`

## Acceptance criteria → how met
- [ ] `composeScene()` renders a scene PNG from named components → all 3 samples re-rendered via composeScene
- [ ] Recurring character renders identically across scenes → determinism test
- [ ] Library coverage ≥1 narrator actor, ≥1 character, ≥3 poses, ≥3 props, ≥2 backgrounds → met (poseidon w/ 3 poses + narrator; 7 props; 3 bgs)
- [ ] Docs: how to add a new actor/pose/prop/background → `kit/README.md`

## Out of scope
- Script schema (#5), still batch (#6), assembly (#7+). Art refinement (deferred to owner sign-off on #2).

## Risks
- React server-render of seeded Rough.js in node test env should be stable (already proven by the rough determinism test); guard with a smoke test.
