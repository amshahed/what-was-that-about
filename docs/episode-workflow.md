# Per-episode workflow

The standard loop for one video. Stage numbers match the pipeline table in
[PRD §7](../PRD.md#7-the-production-pipeline-the-system). **C** = Claude, **U** = User.

The pipeline enforces one gate: assembly and Shorts do not run until the fact-check is approved.

| Stage                  | Owner | Output                                                                        |
| ---------------------- | ----- | ----------------------------------------------------------------------------- |
| 0 Book + tone tag      | U     | `new-episode`, the book in `notes/source/`, tone tag                          |
| 1 Your take            | U     | `seed.md` — summary, explanation, analysis, review                            |
| 2 Book notes           | C     | `notes/characters.md`, `concepts.md`, `plot.md`, `analysis.md`, `research.md` |
| 2b Merge → outline     | C + U | `notes/outline.md`                                                            |
| 2c Cast + looks        | C + U | `characters/<id>.yml`, reference sets, optional `style.yml`                   |
| 3 Script (EDL)         | C + U | `script.yml` (draft → edits → final)                                          |
| 3b Fact-check gate ⛔  | U     | `notes/factcheck.md` → `Status: ✅ approved`                                  |
| 4 Scene images         | C + U | `scenes/*.png`, `out/scenes.html`                                             |
| 5 Narration            | U     | `audio/narration.wav`                                                         |
| 6 Alignment + assembly | C + U | `out/alignment.json`, `out/roughcut.mp4`                                      |
| 7 Shorts               | C + U | `out/short-*.mp4`                                                             |
| 8 Publish              | U     | YouTube upload                                                                |

---

## Stage 0 — Book selection + tone tag

```
npm run new-episode <book-slug>
```

The slug is kebab-case and has no number (`ubik`, not `01-ubik`). The command creates `seed.md`,
`script.yml`, the `notes/` files below, and empty `notes/source/`, `characters/`, `audio/`, `out/`.

**Put your copy of the book** (EPUB, PDF or text) in `notes/source/`. Git ignores that folder — the
book is never committed. Claude reads it from there.

Set the tone tag in `seed.md` and `script.yml` ([PRD §6.1](../PRD.md#61-tone-system-adaptive-per-book)):

| Tag        | Runtime  | Substance : entertainment | Use for                                                       |
| ---------- | -------- | ------------------------- | ------------------------------------------------------------- |
| `light`    | 4–6 min  | ~40 : 60                  | Pulpy thrillers, comedic, fun reads                           |
| `balanced` | 4–8 min  | ~55 : 45                  | Most fiction (default)                                        |
| `heavy`    | 8–10 min | ~70 : 30                  | Philosophical, somber, dense. Humor sprinkled, never flippant |

The tag is also a scheduling lever. Read it recently and have lots to say → `heavy`. Read it ages
ago, or it was just fun → `light`. The narrator voice stays the same for every tag.

---

## Stage 1 — Your take (U)

Write your own summary, explanation, analysis and review in `seed.md`, plus the bits that must be
in the video. Rough is fine. **Write it before you read Claude's notes**: two independent takes make a
better script than one take edited by the other person.

---

## Stage 2 — Book notes (C)

Claude reads the book cover to cover and writes, **in its own words with chapter references**
(no long quotes from the book):

| File                  | Contents                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `notes/characters.md` | Everyone who may appear: role, look from the book (face, hair, age, height, weight/build, clothes, props, quirks), arc. Additions we invent are marked as ours. |
| `notes/concepts.md`   | The book's ideas and terms, how they work, and whether the viewer needs them before the story (setup) or when they appear (inline).              |
| `notes/plot.md`       | Chapter-by-chapter plot, then a short summary for the video.                                                                                     |
| `notes/analysis.md`   | Claude's own reading: open questions, themes, interpretations, review points.                                                                    |
| `notes/research.md`   | Outside sources, the critical landscape, claims to verify.                                                                                       |

The chapter references make the fact-check fast, and `characters.md` feeds the character files.

Claude does **not** read `seed.md` until its notes are done, so the two takes stay independent.

---

## Stage 2b — Merge → outline (C + U)

You read Claude's notes; Claude reads your `seed.md`. Together we merge the two takes into
`notes/outline.md`: the angle, the cast, what each section covers, and where each character and
concept is introduced.

**Review rounds:** you correct Claude's notes and the outline in place (edit the files, or tell
Claude); Claude revises; we commit after each round. The same loop applies to the script, and the
final script is `script.yml`.

**Introduce only what the story needs first** (e.g. for Ubik: psi and anti-psi, half-life, Joe and
Runciter) in the setup, about 60–90 s. Everything else is introduced **inline**, when it first
appears in the recap. A glossary up front loses viewers before the story starts.

The runtime limits the content (heavy: ~1,200–1,500 words, 40–60 beats). The notes can be
complete; the outline and script must cut.

---

## Stage 2c — Cast and looks (C + U)

- **Keep the cast small.** Main characters get an own look; everyone else is a generic figure
  ("a group of anti-psis").
- Claude writes one file per main character in `episodes/<slug>/characters/<id>.yml` from
  `notes/characters.md` (channel-wide characters, if any, live in `shared/characters/`). See
  [`shared/characters/README.md`](../shared/characters/README.md).
- Claude makes a reference set per main character (8 poses × 3 seeds, ~20 min of GPU each):
  `C:\ComfyUI\python_embeded\python.exe tools/comfyui/prompts/character_refs.py episodes/<slug>/characters/<id>.yml`
  → contact sheet in `out/refs/`. A character in `episodes/<slug>/characters/` uses that episode's
  `style.yml` automatically (if there is one); pass a style file as the second argument to override. You approve each look before it goes into the stills.
- **Episode look (optional):** an `episodes/<slug>/style.yml` replaces the channel look
  (`shared/style.yml`) for this episode only — for example a game-like style that fits the book.
  Same fields as the channel file.

---

## Stage 3 — Script draft (Edit Decision List)

Claude drafts `script.yml` from the outline, in the channel voice; we edit it together until it
is final. Each beat is one shot: narration, one image and optional tags. Full schema:
[`kit/SCRIPT.md`](../kit/SCRIPT.md).

### Sections

Use the 5-section template ([PRD §6.4](../PRD.md#64-episode-template-the-repeatable-skeleton)):

| Section                  | Purpose                                                             |
| ------------------------ | ------------------------------------------------------------------- |
| `cold-open`              | Spoiler-free hook: is this book worth your time? Source for Shorts. |
| `spoiler-warn-and-setup` | Branded spoiler warning + premise, vibe, "what you're in for".      |
| `recap`                  | The plot, compressed, with gags.                                    |
| `analysis`               | Themes + ending explained. The substance and the payoff.            |
| `verdict`                | Honest personal take + sign-off.                                    |

The parser does not read `[SECTION]` tags yet. Mark each section with a YAML comment:
`# --- SECTION: recap ---`.

### Tags

```yaml
tags: [HOLD]                   # linger on this shot (parsed; assembly does not use it yet)
tags: [ZOOM]                   # Ken Burns punch-in over the beat
tags: ["SFX:record scratch"]   # comedic sting at the beat's start
tags: [HOLD, ZOOM]             # combine freely
```

SFX names: `record scratch` · `boing` · `ding` · `whoosh` · `drum hit`. Case does not matter, and
`-` or `_` count as spaces (`record-scratch` works). Files: [`shared/assets.md`](../shared/assets.md).

**One idea per beat.** If a beat needs two ideas, split it into two beats.

### The image for each beat

Each beat has one picture. Pick one of two kinds:

- **AI still (default)** — a short image prompt and the cast list:
  ```yaml
  scene:
    image: "Joe Chip argues with his coin-operated front door, patting his empty pockets"
    cast: [joe-chip] # adds the locked description from characters/joe-chip.yml
    seed: 2041 # optional — pin it to keep a take you like
    caption: "Still can't escape the 9 to 5."
  ```
  Describe the action, expression and setting ("…; setting: …"). Do not describe the character's
  look — the character file holds it. The style prompt is fixed, so do not add style words. List
  up to 3 characters in `cast`, left to right; prefer one per image. Keep the subject in the
  middle of the frame — Shorts show only the middle third. Do not ask for dark lighting ("gloomy", "dim", "night"): the channel look is bright and
  flat. Avoid text in the image; put words in
  `caption` or a code-kit beat. `layers` and `image` cannot both be set; unknown fields and
  unknown characters are errors.
- **Code-kit scene** — for text-hero beats (a giant word, number or `?`) and diagrams. Image
  models draw text badly, so text stays code-rendered. See [`kit/README.md`](../kit/README.md).

`caption` (both kinds) shows in a bar at the top of the frame; the narration subtitles use the bottom.
Characters live in `characters/` (this episode) or `shared/characters/` (channel); the look in
`style.yml` (this episode, optional) or `shared/style.yml` (channel).

### Keeping it funny

- Lead with the straight reading, then subvert it in the same beat.
- Use `ZOOM` on the setup and an `SFX` tag on the subversion.
- If a beat has no gag, it must do essential setup work.

---

## Stage 3b — Fact-check gate ⛔

**Assembly and Shorts do not run without this step.** You read the book, so you check it.

1. Open `notes/factcheck.md`. Every claim from the script goes in the table with a verdict and a source.
2. When all checks pass, change the status line to:
   ```
   Status: ✅ approved
   ```
3. Save. `assemble` and `short` check this line before they render.

---

## Stage 4 — Scene images

If ComfyUI is not running on this PC, `generate-scenes` starts `C:\ComfyUI\run_nvidia_gpu_lan.bat`
in a new window and waits for it (set `COMFYUI_DIR` if it is installed elsewhere). Close that window
when you are done.

```
npm run generate-scenes <slug>
```

Sends each AI-still beat to the local ComfyUI (Flux) and writes one PNG per beat to
`scenes/` (gitignored). About 50 s per image, plus ~1 min to load the model on the first one: a
40-beat episode takes ~35 min, unattended. A re-run makes only what is missing or stale, so an
interrupted run simply continues. When it finishes it unloads the models, so `npm run align` gets
the VRAM. From the Mac, set `COMFY_URL=http://<desktop LAN IP>:8188` (now `192.168.0.102`; reserve
it in the router's DHCP settings).

**Review:** open `out/scenes.html` — every beat in order, with beat numbers, narration, seed and
the full prompt on hover. Name the misses (e.g. "7 has two Ubik cans, 12 has bad hands"), then:

```
npm run generate-scenes <slug> -- --reroll 7,12   # 3 new candidates per beat, shown on the page
npm run generate-scenes <slug> -- --pick 7=2,12=1 # keep a candidate: pins its seed in script.yml
```

Other options (after `--`): `--beats 2,5-7`, `--force`, `--dry-run` (prompts only, no ComfyUI),
`--prune` (delete unused PNGs: old takes and unpicked candidates — pick first), `--keep-loaded`
(leave the models in VRAM for a faster next run; then stop ComfyUI before `align`). Always put
`--` before the options; without it npm keeps them, and the command stops with a hint. Editing a beat's `image` text
also gives a new image on the next run. Adding or removing a beat's `caption` also
remakes its still (same seed), because captioned beats keep the top of the frame clear.

---

## Stage 5 — Narration recording

Record the approved script to `audio/narration.wav`, in one take (inline retakes are fine):

- Format: WAV mono, 44.1 kHz, 16-bit.
- Levels: peak −6 to −3 dBFS (headroom for the music bed). Normalizing the mix to −14 LUFS is
  planned, not built: assembly does not change loudness yet.
- Delivery: conversational, not broadcast. Dry signal — no reverb, no noise gate.

---

## Stage 6 — Alignment + assembly

### Alignment

```
npm run align <slug>
```

Reads `audio/narration.wav`, runs Whisper and writes `out/alignment.json` (word timestamps).

- **Default (`ALIGN_ENGINE=local`):** local faster-whisper from `.whisper-env/` on the GPU. No key,
  no cost. Set up once with `tools\whisper\setup.ps1`. The first run downloads the model (~1.6 GB).
- If `script.yml` exists, its opening narration goes to Whisper as a spelling hint for names.
- **Fallback (`ALIGN_ENGINE=openai`):** the OpenAI Whisper API. Requires `OPENAI_API_KEY`. Use it on a
  machine without the GPU env, such as the Mac.
- `align` first asks a local ComfyUI to unload its models (both need the 10 GB of VRAM). If
  `align` is still very slow, ComfyUI is holding the VRAM anyway (the driver moves memory to
  system RAM instead of failing): stop ComfyUI and run again.
- If Whisper finds far fewer words than the script has, `align` prints a warning. Check the WAV.

### Assembly (rough cut)

```
npm run assemble <slug>
```

Requires:

- `notes/factcheck.md` with `Status: ✅ approved`
- `script.yml`
- `out/alignment.json`
- `audio/narration.wav`
- `scenes/*.png` for the AI-still beats (missing ones stop the render with the exact
  `generate-scenes … --beats …` command; stale ones only warn)
- (optional) music and SFX files in `shared/` — see `shared/assets.md`. Missing files only warn.

Writes `out/roughcut.mp4` (16:9, Ken Burns, line-pop captions, music, SFX).

Do a **light polish pass** on comedic timing only. If a beat is early or late, adjust the
`narration:` text (extra words shift the Whisper anchor) or trim the audio.

---

## Stage 7 — Shorts

**Pipeline A (per episode):** Claude proposes 1–3 cuts (the cold open, a sharp mid-video bit, or a
hook). You pick. Then render each one:

```
npm run short <slug> <start-beat> <end-beat>
```

Beat indices are 0-based and inclusive. Aim for 30–60 s. Writes `out/short-<start>-<end>.mp4` (9:16).

**Pipeline B (standalone, `shorts/<id>/` at repo root):** not built yet. `npm run short` accepts
a directory path, so a standalone Short with the same file layout (including
`notes/factcheck.md`, because the gate applies) can render the same way.

---

## Stage 8 — Publish

Title, thumbnail, description and tags, upload, schedule. Credit CC BY music in the description.

---

## Episode directory structure

```
episodes/<slug>/
  seed.md              — your take: summary, explanation, analysis, review (+ tone tag)
  script.yml           — EDL script (source of truth for beats; the final script lives here)
  style.yml            — optional episode look (replaces shared/style.yml)
  characters/
    <id>.yml           — this book's cast: locked looks, text only
  notes/
    source/            — your copy of the book (gitignored, never committed)
    characters.md      — Claude: looks, roles, arcs (chapter refs)
    concepts.md        — Claude: the book's ideas and terms
    plot.md            — Claude: chapter-by-chapter plot + short summary
    analysis.md        — Claude's own reading
    research.md        — outside sources, critical landscape, claims to verify
    outline.md         — the merged plan for the video
    factcheck.md       — render gate (must reach "Status: ✅ approved")
  scenes/              — gitignored; reproducible from prompt + seed + pinned models
    <prompt-words>-<key>.png — one per AI-still beat (plus re-roll candidates)
    manifest.json      — prompt, seed and settings per file
  audio/
    narration.wav      — recorded narration (gitignored)
  out/                 — all gitignored
    scenes.html        — review page for the stills
    alignment.json     — Whisper word timestamps
    roughcut.mp4       — 16:9 full episode
    short-*.mp4        — 9:16 Shorts
```

`new-episode` creates the empty `notes/source/` and `characters/` folders; git does not keep empty
folders, so run `new-episode` again on a fresh clone to recreate them (existing files are skipped).
