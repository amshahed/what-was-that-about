# Plan — Slice V2: AI scene generation

**Issue:** #29 (V2 in `plan.md`)
**Branch:** `slice/29-ai-scenes`
**Blocked by:** V0 (#26), V1 (#28) — merged ✅
**Decision record:** [ADR 0002](../docs/adr/0002-visuals-local-ai-stills.md)
**Design input:** two independent design passes (pipeline/architecture; image quality/operations),
merged below. Approved by the user to run end to end (2026-10-03).

---

## Goal

A beat in `script.yml` can be an **AI still**. `npm run generate-scenes <slug>` makes the images with
local ComfyUI + Flux; `assemble` and `short` render them. Code-kit beats (text-hero, diagrams) keep working.

## 1 — Script schema (`kit/script.ts`, `kit/script-parser.ts`)

```yaml
scene:
  image: "Poseidon facepalming at a desk buried in paperwork; setting: gloomy cave office"
  cast: [poseidon]   # optional; ids of files in shared/characters/
  seed: 2041         # optional; pin a take
  caption: "..."     # optional, as today
```

- Types: `BeatScene = KitScene | ImageScene`, discriminated by `kind` ("kit" | "image"). The parser sets
  `kind`; authors never write it. `KitScene` stays assignable to `SceneSpec`.
- Rules: exactly one of `layers` / `image`; unknown scene keys are errors (no more silent ignore);
  `image` non-empty; `cast` ≤ 3 unique ids matching `^[a-z0-9][a-z0-9-]*$`; `seed` integer 0…2³²−1.
- `parseScript(yaml, { characters? })`: when the CLI passes the known ids, an unknown id errors with
  the list of known ids. The parser stays free of file access.

## 2 — Character and style files (`shared/`)

- `shared/characters/poseidon.yml`: `id`, `name`, `description` (the locked text from
  `poseidon_refs.py`, with "a single golden trident"), `short` (~25 words, used when 2+ characters share
  a beat), `notes` (human-only). Unknown keys are errors. `shared/characters/README.md`: how to add one,
  casting doctrine.
- `shared/style.yml`: `prefix` (style words — first, because CLIP-L reads only ~77 tokens), `suffix`
  (uncluttered background, subject in the centre third for the 9:16 crop, channel palette, "unsigned
  artwork, clean empty corners, no text"), and render settings `width: 1344`, `height: 768`, `steps: 20`,
  `guidance: 3.5`.

**Prompt order:** `prefix` → cast block → beat `image` → `suffix`.
Cast block: 1 character → its `description`; 2–3 → "On the left: A, short. On the right: B, short."
(cast order = left to right). A token estimate above ~400 T5 tokens warns.

## 3 — Identity, seed, cache (`render/scene-prompt.ts`, pure)

- **Seed:** `seed:` if pinned, else derived from `sha256(image + cast)` — never from the beat position,
  so inserting beats changes nothing.
- **File:** `scenes/<slug-of-prompt>-<authorKey8>.png`, `authorKey = sha256(image, cast, seed)`.
  Script edits → new file name → `assemble` stops until generated.
- **renderKey** = sha256(composed prompt, seed, settings, workflow template). Stored in
  `scenes/manifest.json`. Style/character/workflow edits make a file **stale**: `generate-scenes`
  regenerates it, `assemble` only warns — an old episode can still be re-cut.
- `planScenes()` returns fresh / stale / missing per AI beat, and orphan files.

## 4 — ComfyUI client (`render/comfy.ts`)

- `buildWorkflow(template, {prompt, seed, width, height, steps, guidance, prefix})`: deep copy; checks
  node class types (4 CLIPTextEncode, 5 FluxGuidance, 7 EmptySD3LatentImage, 8 KSampler, 10 SaveImage).
- Client with injected `fetch`/`sleep`/`now` (testable without a GPU):
  preflight `GET /system_stats` (not running → start `C:\ComfyUI\run_nvidia_gpu_lan.bat` or set
  `COMFY_URL`), `GET /object_info/<loader>` (missing GGUF node or model file → `tools/comfyui/setup.ps1`);
  `POST /prompt` (400 → print `node_errors`); poll `/history` every 2 s (deadline 600 s first image,
  300 s after); `GET /view` → check PNG signature → write `.tmp` → rename. Only GETs retry.
  `POST /free` after the run so local Whisper gets the VRAM back.
- One beat at a time; a failed beat does not stop the others; exit 1 with a summary.

## 5 — CLI `npm run generate-scenes <slug>` (`scripts/generate-scenes.ts`)

Flags: `--only 2,5-7`, `--force`, `--dry-run` (plan + prompts, no ComfyUI; works on the Mac / CI),
`--prune` (delete orphan PNGs), `--reroll 7,12` (3 candidates per beat, seeds +1…+3, saved as
`scenes/candidates/…`), `--pick 7=2` (writes candidate 2's seed into `script.yml` via the `yaml`
Document API, keeps comments).
Progress: `[12/40] beat 17 · seed 18822 · 54s · ETA 25m`.

**Review page:** each run writes `out/scenes.html` — every beat in order (0-based numbers as used by
`short`), the still or a grey card for code-kit beats, narration excerpt, seed, prompt on hover, NEW badge,
and candidate strips after `--reroll`.

## 6 — Rendering (`render/remotion/**`, `scripts/assemble.ts`, `scripts/short.ts`)

- `BeatEntry.scene: BeatScene`; `BeatEntry.still?: string` (a `staticFile` name).
- New `BeatVisual`: kit → `SceneCanvas`; image → `<Img>` (waits for load) with `objectFit: cover` and
  1.04× overscan (trims corner marks), then the kit caption on top. `ZoomedScene` wraps any child.
- `scripts/lib/scene-stills.ts`: `stageStills()` before `bundle()` — missing stills exit 2 with the list
  and the exact `generate-scenes --only …` command; stale stills warn. `short` checks only its range.
- `render-script.ts` skips image beats with a log line.

## 7 — Docs

`kit/SCRIPT.md`, `docs/episode-workflow.md` (Stages 3–4), `README.md`, `PRD.md` §7/§8.1/§8.5/§8.6,
`plan.md`, `tools/README.md`, `.gitignore` (`episodes/**/scenes/`).

## Tests (CI, no GPU)

Parser union + every error path; prompt composition (exact strings), seed derivation (golden value,
position-independent), keys, file names, `planScenes`; character/style validation; ComfyUI client with
scripted fake responses (refused, missing node/model, 400, poll, execution error, timeout, bad PNG);
`buildWorkflow` immutability and drift; review page HTML; `--pick` YAML edit keeps comments; smoke test
that the committed character/style/workflow files load.

## Manual acceptance (GPU desktop)

1. Sample episode with 3–4 AI beats + 1 code-kit beat: `generate-scenes` → review page → `--reroll` one
   beat → `--pick` → re-run is a no-op (cache) → `align` (TTS narration) → `assemble` → `short`.
2. Check frames: AI still visible, caption on top, Ken Burns on a ZOOM beat, kit beat unchanged.
3. ComfyUI stopped → clear error. Missing still → `assemble` lists it with the command.

## Acceptance criteria

See issue #29.

## Out of scope

LoRA (V3), IP-Adapter / ControlNet (V4), upscaling, loudness normalization, portrait (9:16-native) stills.

## Scope addition found during manual acceptance

- **Caption collision (older than V2):** the line-pop narration subtitles (bottom) covered the beat's
  own `scene.caption` bar (also bottom) on every beat. The kit caption bar moved to the **top** of the
  frame; AI stills draw the same bar. In Shorts, beat captions are drawn at 9:16 width, outside the
  cropped 16:9 layer, so they are never cut off. PRD §9.1 now lists the beat caption as a third tier.
- `--pick` edits only the `seed:` text in script.yml (a full YAML re-serialize reformatted the file).

## Verification on the GPU desktop

- `generate-scenes sample`: 2 AI stills (cast and no-cast), ~50 s each; review page written; a second
  run makes nothing (cache); `--reroll 3` made 3 candidates; `--pick 3=2` pinned the seed and the next
  run treated it as up to date. `--dry-run` prints the composed prompts without ComfyUI.
- `align` (local, TTS narration of the 5-beat sample) → `assemble` (22.3 s) → `short sample 3 4` (8.8 s).
  Frames: kit beat unchanged; AI stills cover the frame; ZOOM punch-in works on a still; beat caption
  at the top and subtitles at the bottom, in 16:9 and 9:16.
- `align` asked ComfyUI to unload its models first.
- Known message: Remotion sometimes logs "Target closed" at browser shutdown; the file is complete
  and the exit code is 0.
