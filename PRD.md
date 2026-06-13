# PRD — "Read It So You Don't Have To" (working title)
### A funny/casual book summary & analysis YouTube channel, powered by a code-driven production pipeline

> One-liner: **The book-analysis channel for people who actually read the book** — genuinely satisfying "ending explained" + analysis, delivered in a dry, funny, stick-figure style, produced through a near-automated pipeline so each episode is low-effort to make.

---

## 1. Background & problem

The user recently finished *Ubik* (Philip K. Dick) and went looking for a good "ending explained / analysis" video. There weren't many, and the ones that existed were either thin or "some dude talking your head off." This is a recurring frustration: for a lot of books, the available summary/analysis content is **sparse, dry, or low-effort**.

There's a gap: **smart, genuinely-entertaining analysis of books, by someone who actually read them.** The two dominant failure modes in the space are (a) content-farm summaries with robotic narration and stock footage, and (b) earnest-but-boring lecture videos.

## 2. Vision

A channel where the user — a self-described funny guy who reads — picks books he's actually read, brings his own take, and (with Claude as co-producer) turns it into a tight, funny, visually-engaging analysis video in the spirit of *Casually Explained* / *Sam O'Nella*: crude hand-drawn stick figures, recurring-character gags, meme energy, dry narration. The defining constraint: it must run as a **smooth, repeatable pipeline**, because high per-video effort = the user quits.

## 3. Goals & non-goals

**Goals**
- A **repeatable, low-effort production pipeline** (the continuation gate — see §13).
- A **polished pilot** (*Ubik*) the user is proud to show a friend.
- A consistent, ownable visual + comedic brand.
- Genuine analytical substance (the defensible wedge).

**Non-goals (v1)**
- Chasing subscriber/view targets in the first few videos (discovery is slow regardless of quality).
- Live action, face-cam, or complex animation.
- Covering books the user hasn't read (kills authenticity, the whole point).
- Full motion graphics / frame-by-frame animation (stills + light motion only).

## 4. Target audience

People who **have read the book** (or are reading it / don't mind spoilers) and want the "what did I just read?" payoff — the satisfying analysis + ending explained — but want it to be *entertaining*, not a lecture. Secondary: the curious-but-unread, served by a short spoiler-free cold open.

## 5. Positioning / the wedge

> "Finally, a book analysis that's actually *good* **and** actually *funny* — from someone who read the thing."

- vs. content farms: real opinions, real voice, real analysis, original art (not stock footage + TTS).
- vs. boring lecture channels: dry humor, visual gags, tight pacing, meme literacy.
- The moat is the **combination**: substance + comedy + a consistent hand-drawn world with recurring characters. Each is copyable; together they're a brand.

## 6. Content design

### 6.1 Tone system (adaptive, per book)
Every book gets a **tone tag** in pre-production that sets joke density, runtime, and visual-gag frequency:

| Tag | Use for | Substance : Entertainment | Notes |
|-----|---------|---------------------------|-------|
| **Light** | pulpy thrillers, comedic, fun reads | ~40 : 60 | comedy-forward, gags frequent |
| **Balanced** | most fiction | ~55 : 45 | default |
| **Heavy** | philosophical, somber, dense | ~70 : 30 | analysis-forward, humor sprinkled, never flippant about serious content |

**Constant across all tags:** the *voice* — dry, casual, "funny guy" delivery. The dial moves; the personality doesn't. That consistency is what people subscribe to.

**Setting the tag — recency + how much you have to say:** the tag is also a practical scheduling lever, not just a judgment of the book's weight. Read it recently / lots of opinions → **Heavy** (analysis-forward). Read it ages ago / it was just fun → **Light** (funny-recap-forward, lighter take). Same single-video format every time; you turn the dial to match your actual energy and material. Crucially, **the analysis *research* is Claude's job, not yours** — author background, critical landscape, common interpretations, flagged ambiguities. You supply the *take + reactions + fact-check*, which you have for free from having read it. So a deeper-analysis episode is **not** a research tax on you; the dial mostly changes how much I tee up and how much you riff.

> *Ubik* pilot tag: **Balanced, leaning Heavy** (metaphysical head-trip, but PKD is pulpy and funny — room to play).

### 6.2 Runtime
**Anchor 4–8 min, flex up to ~10** for Heavy books. Light books can be 4–6. Script ~700–1,500 words; ~25–60 stills. (Heavy episodes still cross YouTube's 8-min mid-roll threshold.) Pilot target: **~8–10 min.**

### 6.3 Spoiler posture
**Read-it / spoiler-positive.** Full spoilers including the ending, with:
- a loud, on-brand **spoiler warning**, and
- a short **spoiler-free cold open** ("is this worth your time?") so the unread aren't excluded.

### 6.4 Episode template (the repeatable skeleton)
1. **Cold open / hook** (spoiler-free) — a sharp, funny entry point. Source of the Short(s).
2. **Spoiler warning** (branded bit).
3. **Setup** — premise, vibe, "what you're in for."
4. **Summary beats** — the plot, compressed, with gags.
5. **Analysis / themes** — the substance; the "why this book messes with you."
6. **Ending explained** — the payoff.
7. **Verdict / outro** — the honest personal take + sign-off.

### 6.5 Summary vs. analysis: one integrated video per book
**Default: one video per book that integrates summary + analysis** (the §6.4 arc). The recap is the setup that *earns* the analysis — splitting them creates redundant re-summarizing (you can't explain an ending without restating it), so integrating is strictly more efficient. Depth flexes via the tone tag (§6.1), not via a separate format.

**Rejected: routine summary-only or two-video (summary-vs-analysis) splits.** A standalone summary under-delivers for the read-it audience (they already read it) and drops into the commodity content-farm lane for the haven't-read crowd — the exact thing we differentiate against. The light, recappy, meme-y appetite is already served by **Shorts** (§7 stage 7), which are the discovery vehicle.

**Exception — the 2-parter (a series):** for a genuine *monster book* (huge/dense, clearly more than ~10 min of real material), split into **Part 1: setup + recap** and **Part 2: analysis + ending** as a deliberate series. Runtime-driven; the exception, not the norm.

## 7. The production pipeline (the system)

Stages flow **seed → research → script → visuals → audio → assembly → shorts → publish.** Ownership: **C** = Claude, **U** = User.

| # | Stage | Owner | What happens |
|---|-------|-------|--------------|
| 0 | **Book selection** | U | Pick a book the user has read. Assign tone tag. |
| 1 | **Seed / brain-dump** | U | User dumps his take: summary, hot-takes, the bits that struck him, anything that *must* be in there. |
| 2 | **Research & synthesis** | C | Claude combines own knowledge + a web research pass (Wikipedia, study guides, essays, Reddit, YouTube) to map the "landscape take" and spot angles others missed. Synthesizes — never copies. |
| 3 | **Script draft** | C | Draft in our voice, structured to the §6.4 template, written as an **Edit Decision List** (see §8.2) with `[HOLD]`/`[ZOOM]`/`[SFX]` tags and one image-beat per shot. |
| 3b | **Fact-check** | **U** | User (who read the book) verifies plot & analysis accuracy. **Required gate** — accuracy is do-or-die for an analysis channel. |
| 4 | **Visual generation** | C | Compose each beat from the code component kit → render to PNG (see §8). |
| 5 | **Audio recording** | U | User records himself reading the approved script (basic mic, quiet room). |
| 6 | **Assembly** | C + U | Forced-alignment syncs cuts to actual delivery; FFmpeg/render builds the rough cut (Ken Burns, burned-in captions, music, SFX). User does a **light polish** pass only on comedic-timing beats. |
| 7 | **Shorts** | C + U | Auto-cut 1–3 vertical clips from the punchiest/most meme-recognizable beats. User picks which. |
| 8 | **Publish** | U | Title, thumbnail, description/tags, upload, schedule. |

## 8. Technical architecture (the software to build)

The visual + assembly layers are **real code living in this workspace** (`/Users/sh/workspace/book-summary`). This is what makes the pipeline repeatable and pushes the user's effort toward zero.

### 8.1 Visual component kit
- **Substrate:** code-defined SVG components, not a Canva library.
- **Aesthetic:** rendered with **Rough.js** so output looks hand-wobbled / "drawn in MS Paint," not sterile-vector. This *is* the brand look.
- **Library structure:**
  - **Actors** — stick-figure characters with swappable **pose** + **expression** variants. Recurring characters (e.g. a narrator/mascot, per-book figures like "office Poseidon") are defined once and reused → recurring-character gags actually work.
  - **Props** — trident, tie, desk, coffee, etc.
  - **Backgrounds** — ocean cave, corporate office, void, etc.
  - **Meme templates** — meme *formats* redrawn in house style as reusable components (see §10).
- **Composition:** each script beat → a small scene composition (actor + pose + props + background + caption) that Claude emits from the script and renders to PNG.

### 8.2 Script-as-Edit-Decision-List
The script is the single source of truth for the edit. Each beat carries: narration text, the image composition, and optional tags:
- `[HOLD]` — linger (e.g. on a punchline)
- `[ZOOM]` — Ken Burns punch-in
- `[SFX: record scratch]` — sound sting
This lets assembly be comedic-timing-aware *automatically*, without manual editing.

### 8.3 Audio sync
User records reading the script → **forced alignment** (Whisper word-level timestamps, e.g. WhisperX / stable-ts) maps each beat to *when he actually said it* → cut points snap to real delivery.

### 8.4 Rendering / assembly — recommended stack
- **Primary recommendation: Remotion** (React-based programmatic video). Our SVG/Rough.js components drop straight in; it natively handles Ken Burns, burned-in animated captions, audio track, and SFX, and produces the final MP4 via headless Chrome + FFmpeg. Best fit for "videos defined in code." Both 16:9 (long-form) and 9:16 (Shorts) render from the same components → near-free vertical reframe.
- **Lighter-weight fallback:** static SVG→PNG (resvg/sharp) + **FFmpeg** (`zoompan` for Ken Burns, `drawtext`/subtitle burn for captions, `amix` for music/SFX). Less elegant, fewer deps.
- *(Stack choice is Claude's call at build time; Remotion is the lead candidate.)*

### 8.5 Repo shape (proposed)
```
book-summary/
  PRD.md
  kit/            # SVG component library (actors, props, backgrounds, memes) + Rough.js styling
  episodes/
    ubik/
      seed.md     # user brain-dump
      research.md # Claude's synthesis + sources
      script.md   # narration + EDL tags + per-beat compositions
      audio/      # user recordings
      out/        # rendered stills, rough cut, shorts
  render/         # Remotion project (or ffmpeg scripts) + alignment step
  shared/         # tone presets, caption styles, music/SFX, brand tokens
```

## 9. Captions, music & SFX (defaults — adjustable)
- **Captions:** burned-in, animated, keyword-emphasis style (strong retention lever, on-brand). Generated from the script for free.
- **Music:** royalty-free bed, mood-matched to the tone tag.
- **SFX:** small comedic library (boings, record scratches, dings) triggered by `[SFX]` tags.

## 10. Meme strategy
- **Default:** redraw meme **formats** in house style (safer on copyright, monetization-friendly, on-brand, reusable).
- **Experiment phase:** where the *expression/visual itself is the meme* and a redraw can't replace it, also try the **real image**. Produce both, A/B them in the review/polish step, keep what lands.
- **Converge:** after a few episodes, codify a rule per meme-type.
- **Watch:** real-meme usage can ding monetization — monitor that signal while testing.

## 11. Division of labor

| Claude (C) | User (U) |
|------------|----------|
| Research & synthesis | Pick book + tone tag |
| Script draft (in voice, EDL-tagged) | Seed brain-dump / take |
| Build & maintain component kit | **Fact-check script (required)** |
| Compose & render all stills | Record audio |
| Build & run assembly pipeline | Light comedic-timing polish |
| Auto-cut Shorts candidates | Pick Short(s) |
| — | Titles, thumbnails, upload, community |

**Net:** Claude does production engineering & drafting; User does taste, comedy, voice, and accuracy. Per-episode User effort target: **~2–4 hrs** (excluding reading, which he does for fun).

## 12. Cadence & launch strategy
- **Cadence:** biweekly (~every 2 weeks).
- **Launch:** bank a **2–3 episode buffer** before going public, so an early flop doesn't kill momentum and so the format gets dialed in private first.

## 13. Effort budget = continuation gate
The user has stated plainly: **if every video is high-effort, he stops.** Therefore "drive per-episode User effort toward zero" is a **first-class requirement**, not a nice-to-have. Every pipeline decision is evaluated against it. Episode #2 must be dramatically easier than episode #1.

## 14. Success metrics (staged)
| Phase | When | Success = |
|-------|------|-----------|
| **1 — Proof** | Pilot + buffer | (a) Proud to show the Ubik video to a friend; (b) pipeline ran end-to-end and ep #2 is much easier than ep #1. **Not** judged on views. |
| **2 — Signal** | Several episodes in | Retention / watch-time (e.g. >50% avg view duration; flat-ish retention curve). |
| **3 — Growth** | Long term | Subscribers / views. (Views are the ultimate point — just not the *early* yardstick.) |

## 15. Costs & tools
- **Pipeline:** free / open-source (Rough.js, Remotion or FFmpeg, Whisper, royalty-free assets).
- **One-time:** a decent USB mic (~$50–100) for clean narration. *(Open item: confirm mic situation.)*
- **Ongoing:** ~$0 mandatory. Optional later: paid music library, thumbnail tooling.

## 16. Legal / copyright / monetization
- **Book content:** summary + analysis = transformative / fair use. We synthesize, never reproduce the text.
- **Images:** original, code-generated → fully owned, monetization-safe.
- **Memes:** house-style redraws are safe; real images are the risk surface (see §10).
- **Music/SFX:** royalty-free / licensed only.
- **AI disclosure:** visuals are code-generated (not gen-AI imagery); narration is a real human → minimal "AI content" exposure. Disclose per YouTube policy where applicable.

## 17. Risks & mitigations
| Risk | Mitigation |
|------|------------|
| **Factual errors** tank credibility | Required user fact-check gate (§7, 3b); cross-check vs. sources in research. |
| **Pipeline too high-effort** → user quits | Effort-as-gate (§13); automate aggressively; measure ep#1 vs ep#2 effort. |
| **SVG too clean / not charming** | Rough.js hand-wobble; deliberately crude kit; taste review. |
| **Organic scenes hard in code** | Reframe as stick-figure-able compositions; accept crude charm; rare AI-assist only if needed. |
| **Comedic timing flat from auto-cut** | EDL tags + light manual polish pass. |
| **Tone misfire on Heavy books** | Tone-tag system; constant-voice rule; never flippant about somber content. |
| **Early metrics demoralize** | Staged metrics (§14); buffer before launch. |
| **Meme copyright/monetization** | House-style default; monitor real-meme usage. |

## 18. Open items / deferred (not blocking)
- **Channel name & handle** (working title above — brainstorm separately).
- **Narrator mascot / persona** design (affects kit; the recurring "narrator" stick figure).
- **Thumbnail & title style** guide (SEO + click-through; best-practice defaults for now).
- **Mic check** — confirm recording setup.

## 19. Roadmap

**Phase 0 — Build the pipeline skeleton** *(Claude-heavy)*
- Repo scaffold; Rough.js component kit (a few actors/poses/props/backgrounds); rendering layer (Remotion or FFmpeg); script→render path; forced-alignment + assembly; caption/music/SFX wiring; vertical Shorts render.
- Exit: a throwaway 60-sec test renders end-to-end from a fake script + scratch audio.

**Phase 1 — Ubik pilot** *(full pipeline dry-run)*
- User seed → research → script (Balanced-Heavy) → fact-check → render → record → assemble → polish → 1–3 Shorts.
- Exit: a video the user is proud of; effort logged.

**Phase 2 — Buffer & launch**
- Produce 2–3 more episodes; converge meme rule; lock tone presets & template; measure ep#1→ep#2 effort drop.
- Exit: buffer banked → go public on biweekly cadence.

**Phase 3 — Optimize**
- Watch retention; iterate hooks/length/thumbnails; expand kit; tighten automation; reduce User effort further.

## 20. Pilot spec — *Ubik*
- **Tone tag:** Balanced, leaning Heavy.
- **Angle candidates (to refine from user's seed):** the half-life / reality-decay as the hook; "who's actually dead?"; Ubik-as-product (the spray-can savior) as satire of consumerism/faith; the entropy-as-villain read; the ending's ambiguity (Joe vs. Glen Runciter coins). Cold open plays the corporate-mundane-vs-cosmic gag (very on-brand for the Poseidon-style bit).
- **Deliverable:** ~8–10 min long-form + 1–3 Shorts.

---

*Decisions in this PRD were resolved via a structured interview. Defaults marked "adjustable" can change without reopening the core design.*
