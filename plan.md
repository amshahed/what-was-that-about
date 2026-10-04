# Project Plan — *What Was That About*

> **Companion to [`PRD.md`](./PRD.md).** The PRD is the **what & why**. This plan is the **how, the sequence, and the process**. It is the living status board for the build.

GitHub repo: `amshahed/what-was-that-about` · Parent PRD: **#1**

---

## How we work (per-issue lifecycle)

Every slice issue goes through this loop, one at a time:

1. **Plan** — write `plans/<issue#>-<slug>.md` (approach, files to touch, test strategy, how each acceptance criterion is met).
2. **Approval** — user reviews and approves the per-issue plan before any code.
3. **Build** — implement on a branch `slice/<issue#>-<slug>`.
4. **Test** — unit/integration tests; verify every acceptance criterion.
5. **PR** — open a PR with `Closes #<issue#>` and a link to the per-issue plan.
6. **CI** — GitHub Actions must pass (install + lint + build + test).
7. **Fix** — address any CI failures.
8. **Code review (high)** — run `/code-review high` (and/or human review); address findings.
9. **Fix** — apply review fixes.
10. **Merge** — squash-merge to `main`; the issue auto-closes.

### Conventions
- **Branch:** `slice/<issue#>-<slug>` (e.g. `slice/4-script-edl-parser`).
- **Per-issue plan:** `plans/<issue#>-<slug>.md`, committed as part of that slice's PR.
- **PR body:** `Closes #<issue#>`, link the plan, check off acceptance criteria.
- **CI gate:** no merge on red CI.
- **Review gate:** `/code-review high` clean (or findings resolved) before merge.
- **One slice at a time** unless slices are independent and explicitly parallelized.

---

## Slice roadmap & status

Legend — Status: ⬜ todo · 🟦 planning · 🟨 in progress · 🟩 merged · Type: **HITL** (needs a person) / **AFK** (autonomous).

| Issue | Slice | Type | Blocked by | Status |
|------:|-------|------|-----------|:------:|
| **#1** | *Parent PRD* | — | — | 📋 spec |
| #2 | Foundation: scaffold + render-stack decision + house-style spike + CI | **HITL** | — | 🟩 merged · style sign-off superseded by V0 (AI stills) |
| #3 | End-to-end tracer-bullet video | AFK | #2 | 🟩 superseded by #8 |
| #4 | Component kit + composition API | AFK | #2 | 🟩 merged (PR #16) |
| #5 | Script / Edit-Decision-List format + parser | AFK | #4 | 🟩 merged (PR #17) |
| #6 | Script → stills batch render | AFK | #4, #5 | 🟩 merged (PR #18) |
| #7 | Whisper forced alignment (OpenAI Whisper API; replaced by local faster-whisper in V1) | AFK | #5 | 🟩 merged (PR #20) |
| #8 | Assembly v1: synced rough-cut with motion | AFK | #6, #7 | 🟩 merged (PR #21) |
| #9 | Burned-in animated captions | AFK | #8 | 🟩 merged (PR #22) |
| #10 | Music bed + SFX (tone-tag-driven) | AFK | #8 | 🟩 merged (PR #23) |
| #11 | Shorts auto-cut (9:16) | AFK | #4, #8, #9 | 🟩 merged (PR #24) |
| #12 | Per-episode content workflow scaffolding | AFK | #5 | 🟩 merged (PR #25) |
| V0 | Local GPU tools: ComfyUI + Flux GGUF, faster-whisper env, `tools/` recipes | **HITL** | — | 🟩 merged (PR #26) |
| V1 (#27) | Local Whisper in `align` (faster-whisper engine; OpenAI API as fallback) | AFK | V0 | 🟩 merged (PR #28) |
| V2 (#29) | AI scene generation: `image:` beats, character files, `generate-scenes`, assembly uses PNGs | AFK | V0 | 🟩 merged (PR #30) |
| #13 | Pilot: Ubik episode, end-to-end | **HITL** | V1, V2 ✅ | ⬜ unblocked |
| #14 | Brand identity: name, mascot/persona, thumbnail style | **HITL** | — (parallel) | ⬜ |
| #31 | Book-first episode workflow; per-episode characters and style; remove Poseidon | AFK | V2 | 🟩 merged (PR #32) |
| #33 | Look presets (`shared/styles/`: cartoon, retro-pixel, vintage), `pixelate`, `try-look` | AFK | #31 | 🟩 merged (PR #34) |
| V3 | Character LoRA trained on an approved reference set | **HITL** | V2, pilot feedback | ⬜ later |
| V4 | ControlNet pose control (+ IP-Adapter) for precise poses | AFK | V2 | ⬜ later |
| — | `[SECTION]` markers in the parser (PRD §6.4) | AFK | — | ⬜ later |
| — | Shorts Pipeline B: standalone `shorts/<id>/` (PRD §7.7) | AFK | — | ⬜ later |
| — | `HOLD` tag: extend dwell in assembly (parsed, not used yet) | AFK | — | ⬜ later |
| — | Loudness: normalize the final mix to -14 LUFS (PRD §8.3) | AFK | first Ubik rough cut | ⬜ before pilot publish |


`V*` = visual/audio-upgrade slices (2026-09 / 10). They get GitHub issue numbers when opened.

### Critical path
`#2 → #3 (spine)` then `#2 → #4 → #5 → {#6, #7} → #8 → {#9, #10, #11} → #13`
- `#12` (content workflow) needs only `#5`; can run alongside the assembly slices.
- `#14` (brand) is parallel: name, thumbnail style and title style. No mascot for now.
- Upgrade path: `V0 → {V1, V2} → #13`. The Ubik seed, research, script and fact-check need no images, so they run in parallel with V1/V2.

### Phase mapping (PRD §19)
- **Phase 0 — pipeline skeleton:** #2–#12
- **Phase 0.5 — local visual + audio upgrade:** V0–V2 (V3, V4 after the pilot)
- **Phase 1 — Ubik pilot:** #13
- **Phase 2 — buffer & launch / Phase 3 — optimize:** post-pilot, new issues TBD.

---

## Tech stack (from PRD §8, locked)
- **Language:** TypeScript.
- **Visuals:** **AI stills, generated locally** — ComfyUI portable + **Flux.1 Dev GGUF Q5_K_S** on the RTX 3080 (PRD §8.1). Look per book from presets in `shared/styles/` (cartoon default; decision 22). Character consistency via locked character files (LoRA / IP-Adapter / ControlNet later). Text-hero and diagram beats stay code-rendered from `kit/` (Rough.js). Casting doctrine — *cast existing first, custom last* (PRD §6.0).
- **Render/assembly:** **Remotion — locked** (PRD §8.4). FFmpeg-only fallback rejected.
- **Audio sync:** **local faster-whisper** (`large-v3-turbo`, CUDA) — locked 2026-10-03 (PRD §8.3). Single-file boundary; OpenAI Whisper API kept as fallback.
- **Local tools:** recipes in `tools/` (PRD §8.6). ComfyUI at `C:\ComfyUI`; Whisper venv at `.whisper-env/`.
- **Audio contract:** WAV mono 44.1 kHz 16-bit, peak `-6..-3` dBFS; pipeline is to normalize to **-14 LUFS** (not built yet — see roadmap).
- **Output:** 16:9 long-form + 9:16 Shorts from the same components. Two Shorts pipelines: **A** auto-suggested per episode, **B** standalone at repo root `shorts/<id>/` (PRD §7.7).
- **Episode id convention:** **slug-only** (`ubik`, not `01-ubik`).

## Locked design decisions (2026-06-15 design pass)
Captured in PRD; this is the index — see referenced PRD sections for the rationale.

1. ~~**Whisper engine — OpenAI Whisper API**~~ → **superseded by decision 17** (local faster-whisper).
2. **Tone tags — Light / Balanced / Heavy** (§6.1). `Balanced-Heavy` dropped (removed from the code 2026-10-03).
3. **Captions — two-tier**: line-pop subtitles (always-on) + text-hero emphasis scenes (§9.1). Per-word pop rejected.
4. **§6.0 Visual storytelling principle**: images carry the message — unbounded visual vocabulary, not locked to character scenes.
5. **Casting doctrine** (§6.0): cast existing first, custom last.
6. **Audio contract** (§8.3): WAV mono 44.1 kHz 16-bit, `-6..-3` dBFS peak, normalize to -14 LUFS (normalization not built yet).
7. **Shorts — two pipelines** (§7.7): A auto-suggested per episode under `episodes/<slug>/shorts/` (today `npm run short` writes to `out/`); B standalone at repo root `shorts/<id>/`.
8. **Channel name** — *deferred* (§18); "What Was That About" working title fine for now.
9. **Episode structure — 5-section tag-based template** (§6.4): cold-open, spoiler-warn-and-setup, recap, analysis, verdict.
10. **Pilot — Ubik** (§20), tone tag **Heavy**.
11. **Episode id convention — slug-only** (§8.5).
12. ~~**Palette — unified across the channel**~~ → **superseded by decision 22** (looks per book, from presets).
13. **Intro / outro bumper — no default bumper on the pilot** (§9.2, §18); creative-design task deferred.
14. **Fact-check artifact** (§7 stage 3b, §8.5): `episodes/<slug>/notes/factcheck.md` must have a line reading exactly `Status: ✅ approved` — assembly refuses to run otherwise. Hard render gate.

### Visual + audio upgrade (2026-09-26 / 2026-10-03)
15. **Visuals — AI stills, not SVG stick figures** (§8.1). Stills only: no animation, no lip sync. Generated **locally** (no cloud API) with ComfyUI portable + Flux.1 Dev GGUF Q5_K_S. Text-hero beats stay code-rendered.
16. ~~**Poseidon look**~~ → **removed (2026-10-04).** Poseidon was only the proof of concept for the tools; no mascot for now.
17. **Whisper engine — local faster-whisper** (§8.3), OpenAI API as fallback. Supersedes decision 1.
18. **Reproducibility — recipes in `tools/`** (§8.6): pinned versions, model checksums, setup scripts. Installs and models stay out of git; generated images are not committed.
19. **Character reference images stay out of git** (2026-10-03). They live on the GPU desktop; the prompts and seeds in `tools/comfyui/prompts/` reproduce them. Character files in `episodes/<slug>/characters/` and `shared/characters/` hold text only. A trained LoRA file also stays local, in `C:\ComfyUI\ComfyUI\models\loras\`.
20. **Book-first episode workflow** (2026-10-04): user writes their own take (seed.md); Claude reads the book (user's copy in `notes/source/`, gitignored) and writes characters/concepts/plot/analysis notes in its own words with chapter refs; the takes are merged into `notes/outline.md`, then the script. Setup introduces only the essentials; the rest is introduced inline.
21. **Per-episode cast and look** (2026-10-04): a book's characters live in `episodes/<slug>/characters/`; `episodes/<slug>/style.yml` sets the episode's look (decision 22). Keep the cast small; main characters get approved reference sets.
22. **Look presets per book** (2026-10-04): one look does not fit every book. Looks are reusable presets in `shared/styles/<name>.yml` (`cartoon` = default, `retro-pixel` for Ubik, `vintage` e.g. for Babel). An episode's `style.yml` names a `preset:` and may change fields; a complete file without `preset:` is a one-off look. Optional `pixelate` makes real pixel art (shrink, fewer colours, hard-edged enlarge). Choose with `npm run try-look`. **The brand is the frame, not the picture:** narrator voice, captions, text-hero kit, thumbnail layout and title treatment stay the same in every episode. Supersedes decision 12; amends 21.

## North-star constraints (don't violate)
- **Effort is a continuation gate** (PRD §13): drive per-episode *user* effort toward zero; episode #2 must be far easier than #1.
- **Accuracy gate** (PRD §7, 3b): the `Status: ✅ approved` line in `notes/factcheck.md` is a hard render gate.
- **Tone dial, constant voice** (PRD §6.1): adapt depth per book; keep the dry narrator voice constant.
- **Images carry the message** (PRD §6.0): visual vocabulary is unbounded; the episode's look preset is the *aesthetic*, not a restriction on *what* can be on screen.

---

## Next action
**Phase 0 and Phase 0.5 complete.** Next: **#13 — Ubik pilot** (book-first workflow, decision 20;
steps in `docs/episode-workflow.md`):

1. `npm run new-episode ubik`; user puts their copy of the book in `episodes/ubik/notes/source/`.
2. User writes their take in `seed.md` (tone: Heavy, decision 10) — independently.
3. Claude reads the book → `notes/characters.md`, `concepts.md`, `plot.md`, `analysis.md`, `research.md`.
4. Merge → `notes/outline.md` (setup: psi/anti-psi, half-life, Joe, Runciter; the rest inline).
5. Look: `retro-pixel` (decision 22; compare with `npm run try-look ubik …`). Cast files `episodes/ubik/characters/*.yml` + reference sets in that look.
6. Script draft → edits → final; fact-check → `Status: ✅ approved`.
7. `npm run generate-scenes ubik` → review → re-roll/pick; record narration.
8. `npm run align ubik` → `npm run assemble ubik` → polish → loudness slice before publish.
