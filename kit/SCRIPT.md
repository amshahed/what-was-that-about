# Episode script format

An episode is a **YAML** file (`episodes/<book>/script.yml`) that doubles as the **edit decision list**: each beat carries the narration to speak, the scene to show, and any timing/comedy tags. Downstream slices consume the parsed shape:

- **#6 stills batch** renders each beat's `scene` to a PNG.
- **#8 assembly** uses `ZOOM` to drive Ken Burns (`HOLD` is parsed but not used yet), syncing cuts to recorded narration.
- **#10 SFX/music** drops a sting for each `SFX:<name>`.

## Schema

```yaml
id: string                 # stable episode id = the slug (e.g. "ubik")
tone: light | balanced | heavy
beats:
  - narration: string      # what the narrator says (multiline OK)
    scene:
      layers:              # ≥1 layer, painted back-to-front
        - component: string       # registered kit id (bg:..., actor:..., prop:..., caption)
          props: { ... }          # untyped; the component's adapter validates at render time
      caption: string?     # optional bottom-bar caption (auto-appended as a layer)
    tags: [string]?        # optional list — see Tag grammar below
```

A canonical example lives at [`episodes/sample/script.yml`](../episodes/sample/script.yml).

**Planned (slice V2):** a `scene` can hold an AI image instead of `layers`:
`image: string` (the prompt), `cast: [string]?` (character files in `shared/characters/`) and
`seed: number?`. See [`docs/episode-workflow.md`](../docs/episode-workflow.md). Today the parser
requires `layers` and ignores `image`, `cast` and `seed` without a warning.

## Tag grammar

| Tag | Meaning |
|---|---|
| `HOLD` | Linger on this beat. *Parsed and passed through; assembly does not extend dwell yet (planned).* |
| `ZOOM` | Ken Burns punch-in during this beat. |
| `SFX:<name>` | Drop the named sound sting at this beat. Multiple SFX tags accumulate. Names are case-insensitive; `-` and `_` count as spaces. |

Anything else is an error — including `SECTION:` (planned, see PRD §6.4). Mark sections with YAML comments for now: `# --- SECTION: recap ---`.

## Parsing

```ts
import { readFileSync } from "node:fs";
import { parseScript } from "./script-parser";

const script = parseScript(readFileSync("episodes/sample/script.yml", "utf8"));
```

The parser produces the typed `Script` from `kit/script.ts`. Errors are `ScriptParseError` with a `path` (e.g. `$.beats[2].scene.layers[0].component`) so the offending location is named.

The parser validates **structure** and **component-id existence** against the kit registry. It does **not** validate component prop schemas — that's the adapter's job at render time, so every component's prop contract has a single source of truth (see [`kit/library.tsx`](./library.tsx) and [`kit/params.ts`](./params.ts)).

## Adding a new tag

1. Add a flag to `Beat` in [`kit/script.ts`](./script.ts).
2. Recognise the literal in `parseTags()` in [`kit/script-parser.ts`](./script-parser.ts).
3. Add a row to the table above.
4. Add a unit test in [`kit/script-parser.test.ts`](./script-parser.test.ts).
5. Wire the downstream consumer (assembly / SFX / etc.) to honor the new flag.
