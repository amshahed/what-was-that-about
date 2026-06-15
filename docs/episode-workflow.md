# Per-episode workflow

This is the standard loop for producing one video. The pipeline enforces the fact-check gate;
everything else is creative work done before running any commands.

---

## Stage 0 — Book selection + tone tag

Run:
```
npm run new-episode <book-slug>
```

Fill in `episodes/<slug>/seed.md`:
- **Angle** — your specific take, not a Wikipedia summary. One strong paragraph.
- **Tone tag** — determines runtime, joke density, and music bed:

| Tag | Runtime | Joke density | When to use |
|-----|---------|-------------|-------------|
| `light` | 4–6 min | High — every beat has a gag | Audience already knows the book; lean into comedy |
| `balanced` | 6–10 min | Mixed — laughs + insight | Most books; default choice |
| `heavy` | 10–15 min | Lower — analysis-first | Dense philosophy, dark themes, books that need unpacking |
| `balanced-heavy` | 8–12 min | Medium | Weighty material but still funny; think *Blood Meridian* |

**Heuristic:** Start with `balanced`. Upgrade to `heavy` only if the book's main value is dense
ideas (not just dark tone). Downgrade to `light` only if the book is thin and the gags carry it.

---

## Stage 1 — Research

Fill in `episodes/<slug>/notes/research.md`:
- List every factual claim you plan to make in the script.
- Find a source for each one. Move verified claims to the "Verified" section.
- Park tangents in "Cut ideas" — don't let them bloat the script.

---

## Stage 2 — Script draft (Edit Decision List)

Edit `episodes/<slug>/script.yml`. The format is an EDL: each beat is one visual shot
with narration text and optional tags.

### Tag grammar

```yaml
tags: [HOLD]                   # linger on this shot (no visual cut)
tags: [ZOOM]                   # Ken Burns punch-in (1.0→1.05 scale over beat duration)
tags: ["SFX:record scratch"]   # drop a comedic sting at this beat's start
tags: [HOLD, ZOOM]             # combine freely
```

Available SFX names (see `shared/assets.md` for files):
`record scratch` · `boing` · `ding` · `whoosh` · `drum hit`

### Script structure (the §6.4 arc)

| Section | Beat count (balanced) | Purpose |
|---------|----------------------|---------|
| Hook | 1–2 | Cold open — what is this book and why should I care? |
| Setup | 3–5 | Context, world-building, character intro |
| Body | 6–12 | Main argument / summary, interlaced with analysis |
| Twist/Analysis | 2–4 | Your actual take — the thing a Wikipedia article won't say |
| Outro | 1–2 | Callback to the hook, rating, CTA |

**One idea per beat.** If a beat needs two sentences, split it into two beats.

### Keeping it funny

- Lead with the straight reading, then subvert it in the same beat.
- Use `[ZOOM]` on the setup and `[SFX:record scratch]` on the subversion.
- If a beat has no gag, it had better be doing essential setup work.

---

## Stage 3a — Fact-check gate ⛔

**The render pipeline will not run without this step.**

Open `episodes/<slug>/notes/factcheck.md` and work through the checklist:
1. Every claim from the script must appear in the table with a source.
2. When all checks pass, change the status line to:
   ```
   Status: ✅ approved
   ```
3. Save. The `assemble` and `short` commands check this file before touching Remotion.

---

## Stage 3b — Narration recording

Record narration to `episodes/<slug>/audio/narration.wav`:
- Format: WAV mono, 44.1kHz, 16-bit.
- Levels: peak −6 to −3 dBFS (leaves headroom for the music bed).
- Delivery: conversational, not broadcast. Dry signal — no reverb, no noise gate.

---

## Stage 4 — Forced alignment

```
npm run align <slug>
```

Reads `audio/narration.wav`, calls Whisper, writes `out/alignment.json`.
Requires `OPENAI_API_KEY` environment variable.

---

## Stage 5 — Assembly (rough cut)

```
npm run assemble <slug>
```

Requires:
- `notes/factcheck.md` with `Status: ✅ approved`
- `script.yml`
- `out/alignment.json`
- `audio/narration.wav`
- (optional) `shared/music/<tone>.mp3` and `shared/sfx/*.wav` — see `shared/assets.md`

Writes: `out/roughcut.mp4`

Do a **light polish pass**: check comedic timing on key beats. If a beat is noticeably early or
late, adjust the `narration:` text (extra words shift the Whisper anchor) or trim the audio.

---

## Stage 6 — Shorts (optional)

```
npm run short <slug> <start-beat-index> <end-beat-index>
```

Pick a 30–60 second range (check frame counts: 30fps × 60s = 1800 frames). 
Writes: `out/short-<start>-<end>.mp4`

Run multiple times with different ranges to produce multiple Shorts from one episode.

---

## Episode directory structure

```
episodes/<slug>/
  seed.md              — angle + tone tag (creative brief)
  script.yml           — EDL script (source of truth for beats)
  audio/
    narration.wav      — recorded narration (gitignored)
  notes/
    research.md        — claim verification
    factcheck.md       — render gate (must reach "Status: ✅ approved")
  out/
    alignment.json     — Whisper word timestamps
    roughcut.mp4       — 16:9 full episode (gitignored)
    short-*.mp4        — 9:16 Shorts (gitignored)
```
