# Per-episode workflow

The standard loop for one video. Stage numbers match the pipeline table in
[PRD §7](../PRD.md#7-the-production-pipeline-the-system). **C** = Claude, **U** = User.

The pipeline enforces one gate: assembly and Shorts do not run until the fact-check is approved.

| Stage                  | Owner | Output                                       |
| ---------------------- | ----- | -------------------------------------------- |
| 0 Book + tone tag      | U     | `seed.md` tone line                          |
| 1 Seed / brain-dump    | U     | `seed.md`                                    |
| 2 Research             | C     | `notes/research.md`                          |
| 3 Script (EDL)         | C     | `script.yml`                                 |
| 3b Fact-check gate ⛔  | U     | `notes/factcheck.md` → `Status: ✅ approved` |
| 4 Scene images         | C + U | `scenes/*.png` _(planned: slice V2)_         |
| 5 Narration            | U     | `audio/narration.wav`                        |
| 6 Alignment + assembly | C + U | `out/alignment.json`, `out/roughcut.mp4`     |
| 7 Shorts               | C + U | `out/short-*.mp4`                            |
| 8 Publish              | U     | YouTube upload                               |

---

## Stage 0 — Book selection + tone tag

```
npm run new-episode <book-slug>
```

The slug is kebab-case and has no number (`ubik`, not `01-ubik`). The command creates
`seed.md`, `script.yml`, `notes/research.md` and `notes/factcheck.md`.

Set the tone tag in `seed.md` and `script.yml` ([PRD §6.1](../PRD.md#61-tone-system-adaptive-per-book)):

| Tag        | Runtime  | Substance : entertainment | Use for                                                       |
| ---------- | -------- | ------------------------- | ------------------------------------------------------------- |
| `light`    | 4–6 min  | ~40 : 60                  | Pulpy thrillers, comedic, fun reads                           |
| `balanced` | 4–8 min  | ~55 : 45                  | Most fiction (default)                                        |
| `heavy`    | 8–10 min | ~70 : 30                  | Philosophical, somber, dense. Humor sprinkled, never flippant |

The tag is also a scheduling lever. Read it recently and have lots to say → `heavy`. Read it ages
ago, or it was just fun → `light`. The narrator voice stays the same for every tag.

---

## Stage 1 — Seed / brain-dump

Fill in `seed.md`: your angle (one strong paragraph), the gags you want and what to cut.
Dump your take — the bits that struck you and anything that must be in the video.

---

## Stage 2 — Research

Claude researches (own knowledge + a web pass) and writes `notes/research.md`:
claims to verify, verified facts with sources, cut ideas and sources. Claude synthesizes and
never copies. You review the angle; you do not do the research.

---

## Stage 3 — Script draft (Edit Decision List)

Claude drafts `script.yml` in the channel voice. Each beat is one shot: narration, one image and
optional tags. Full schema: [`kit/SCRIPT.md`](../kit/SCRIPT.md).

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

- **AI still (default after slice V2)** — a short image prompt and the cast list:
  ```yaml
  scene:
    image: "Poseidon facepalming at a desk buried in paperwork"
    cast: [poseidon] # adds the locked character description from shared/characters/
    seed: 2041 # optional — pin it to keep a take you like
    caption: "Still can't escape the 9 to 5."
  ```
  Describe the action, expression and setting. Do not describe the character's look — the
  character file holds it. The style prompt is fixed, so do not add style words.
- **Code-kit scene** — for text-hero beats (a giant word, number or `?`) and diagrams. Image
  models draw text badly, so text stays code-rendered. See [`kit/README.md`](../kit/README.md).

Until V2 ships, every beat needs code-kit `layers`. The parser ignores `image`, `cast` and `seed`
without a warning, so they do nothing yet.

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

## Stage 4 — Scene images _(planned: slice V2)_

Start ComfyUI first: `C:\ComfyUI\run_nvidia_gpu_lan.bat`.

```
npm run generate-scenes <slug>
```

Sends each AI-still beat to the local ComfyUI (Flux) and writes one PNG per beat to
`scenes/`. About 45–60 s per image. A re-run regenerates only the beats whose prompt, cast or
seed changed. From the Mac, set `COMFY_URL=http://<desktop LAN IP>:8188` (now `192.168.0.102`; reserve it in
the router's DHCP settings).

Review the stills. For a bad image, change the prompt or the seed, then run the command again.

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

- **Now:** calls the OpenAI Whisper API. Requires the `OPENAI_API_KEY` environment variable.
- **After slice V1:** runs local faster-whisper from `.whisper-env/` on the GPU. No key, no
  cost. Set up once with `tools\whisper\setup.ps1`. The OpenAI API stays as a fallback.
- Do not run it while ComfyUI generates images — both need the 10 GB of VRAM.

### Assembly (rough cut)

```
npm run assemble <slug>
```

Requires:

- `notes/factcheck.md` with `Status: ✅ approved`
- `script.yml`
- `out/alignment.json`
- `audio/narration.wav`
- `scenes/*.png` for the AI-still beats _(after V2)_
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
  seed.md              — angle + tone tag (creative brief)
  script.yml           — EDL script (source of truth for beats)
  notes/
    research.md        — research + claims to verify
    factcheck.md       — render gate (must reach "Status: ✅ approved")
  scenes/
    <beat>.png         — generated stills (gitignored; reproducible from prompt + seed)
  audio/
    narration.wav      — recorded narration (gitignored)
  out/                 — all gitignored
    alignment.json     — Whisper word timestamps
    roughcut.mp4       — 16:9 full episode
    short-*.mp4        — 9:16 Shorts
```
