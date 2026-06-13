# Plan — Issue #5: Script / Edit-Decision-List format + parser

> Parent PRD: #1. Branch: `slice/5-script-parser`. Type: **AFK** (pure technical, no creative input).

## Goal
Define the **episode script format** and a **parser** that produces a typed beat list. This format is the canonical hand-off from authoring (#11) to stills batch (#6), alignment (#7), and assembly (#8).

## Format choice — YAML
Authoring is half prose (narration) and half structured data (scene composition, tags). YAML covers both: multiline strings for narration, native nesting for `scene.layers`, and a familiar shape for non-developer authors.

### Shape
```yaml
id: ubik-pilot
tone: balanced-heavy        # one of: light | balanced | heavy
beats:
  - narration: |
      Free narration text — what the narrator actually says.
    scene:
      layers:
        - component: bg:office-wall
        - component: actor:poseidon
          props: { x: 800, y: 400, pose: tie, tie: true }
      caption: "Optional caption text."
    tags: [HOLD, "SFX:record-scratch"]
```

### Tags supported
- `HOLD` → `beat.hold = true` (linger on this beat)
- `ZOOM` → `beat.zoom = true` (Ken Burns punch-in)
- `SFX:<name>` → push `<name>` into `beat.sfx[]` (Slice 9 consumes these)

Anything else fails with a clear error.

## Approach
1. **Types** in `kit/script.ts`:
   ```ts
   type Tone = "light" | "balanced" | "heavy";
   interface Beat { narration: string; scene: SceneSpec; hold: boolean; zoom: boolean; sfx: string[]; }
   interface Script { id: string; tone: Tone; beats: Beat[]; }
   ```
2. **Parser** in `kit/script-parser.ts`:
   - `parseScript(yamlText: string): Script`
   - Uses `yaml` to load; walks the structure with `params.ts` helpers.
   - Validates each layer's `component` against the registry via `has(id)`.
   - Pluggable error class `ScriptParseError` with `(path, message)` so messages name the offending beat/layer.
3. **Tests** in `kit/script-parser.test.ts`:
   - Valid script round-trips into the expected typed shape.
   - Missing top-level fields → clear errors (`id`, `tone`, `beats`).
   - Invalid tone → enum error.
   - Empty beats array → error.
   - Missing narration / scene / layers → errors.
   - Unknown component id → error mentions known ids.
   - Tag parsing: `HOLD`, `ZOOM`, `SFX:<x>` each set the right flag; unknown tag errors.
   - Multiple `SFX:` tags accumulate in `sfx[]`.
4. **Sample episode** under `episodes/sample/script.yml` so the format has a concrete reference.
5. **Docs** at `kit/SCRIPT.md` covering the schema, tag grammar, and how to add a tag.

## Files to add / modify
- add: `kit/script.ts`, `kit/script-parser.ts`, `kit/script-parser.test.ts`, `kit/SCRIPT.md`, `episodes/sample/script.yml`
- modify: `plan.md` (status), `package.json` already updated with `yaml` dep

## Acceptance criteria → how met
- [ ] Format spec documented + example episode script → `kit/SCRIPT.md` + `episodes/sample/script.yml`
- [ ] Parser turns valid script into ordered beat list (narration + composition + tags) → `parseScript`
- [ ] Invalid scripts fail with clear, located messages → `ScriptParseError(path, message)`
- [ ] Parser unit-tested → comprehensive `script-parser.test.ts`

## Out of scope
- Rendering beats to stills (#6).
- Assembling beats into video (#7+).
- Tag semantics beyond classification (Ken Burns motion, SFX timing live in #7 / #9).

## Risks
- Loose typing on raw YAML — mitigated by walking with `params.ts` helpers + a path-aware error class.
- Per-component prop validation deferred to render time (adapters throw via `params.ts`). The parser only validates structure + component existence; this is a deliberate single-source-of-truth choice (adapters own prop schemas).
