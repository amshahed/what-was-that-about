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
| #7 | Whisper forced alignment (OpenAI Whisper API; engine now changing to local — see V1) | AFK | #5 | 🟩 merged (PR #20) |
| #8 | Assembly v1: synced rough-cut with motion | AFK | #6, #7 | 🟩 merged (PR #21) |
| #9 | Burned-in animated captions | AFK | #8 | 🟩 merged (PR #22) |
| #10 | Music bed + SFX (tone-tag-driven) | AFK | #8 | 🟩 merged (PR #23) |
| #11 | Shorts auto-cut (9:16) | AFK | #4, #8, #9 | 🟩 merged (PR #24) |
| #12 | Per-episode content workflow scaffolding | AFK | #5 | 🟩 merged (PR #25) |
| V0 | Local GPU tools: ComfyUI + Flux GGUF, faster-whisper env, `tools/` recipes, Poseidon look | **HITL** | — | 🟩 merged (PR: V0 local tools + docs) |
| V1 (#27) | Local Whisper in `align` (faster-whisper engine; OpenAI API as fallback) | AFK | V0 | 🟩 merged |
| V2 | AI scene generation: `image:` beats, character files, `generate-scenes`, assembly uses PNGs | AFK | V0 | ⬜ |
| #13 | Pilot: Ubik episode, end-to-end | **HITL** | V1, V2 (writing can start now) | ⬜ |
| #14 | Brand identity: name, mascot/persona, thumbnail style | **HITL** | — (parallel) | ⬜ Poseidon look locked "for now" |
| V3 | Poseidon LoRA trained on the approved reference set | **HITL** | V2, pilot feedback | ⬜ later |
| V4 | ControlNet pose control (+ IP-Adapter) for precise poses | AFK | V2 | ⬜ later |
| — | `[SECTION]` markers in the parser (PRD §6.4) | AFK | — | ⬜ later |
| — | Shorts Pipeline B: standalone `shorts/<id>/` (PRD §7.7) | AFK | — | ⬜ later |
| — | `HOLD` tag: extend dwell in assembly (parsed, not used yet) | AFK | — | ⬜ later |
| — | Loudness: normalize the final mix to -14 LUFS (PRD §8.3) | AFK | first Ubik rough cut | ⬜ before pilot publish |


`V*` = visual/audio-upgrade slices (2026-09 / 10). They get GitHub issue numbers when opened.

### Critical path
`#2 → #3 (spine)` then `#2 → #4 → #5 → {#6, #7} → #8 → {#9, #10, #11} → #13`
- `#12` (content workflow) needs only `#5`; can run alongside the assembly slices.
- `#14` (brand) is parallel. Poseidon's look is locked "for now" in V0; name, thumbnail style and title style remain.
- Upgrade path: `V0 → {V1, V2} → #13`. The Ubik seed, research, script and fact-check need no images, so they run in parallel with V1/V2.

### Phase mapping (PRD §19)
- **Phase 0 — pipeline skeleton:** #2–#12
- **Phase 0.5 — local visual + audio upgrade:** V0–V2 (V3, V4 after the pilot)
- **Phase 1 — Ubik pilot:** #13
- **Phase 2 — buffer & launch / Phase 3 — optimize:** post-pilot, new issues TBD.

---

## Tech stack (from PRD §8, locked)
- **Language:** TypeScript.
- **Visuals:** **AI stills, generated locally** — ComfyUI portable + **Flux.1 Dev GGUF Q5_K_S** on the RTX 3080 (PRD §8.1). Cartoon webcomic style. Character consistency via locked character files (LoRA / IP-Adapter / ControlNet later). Text-hero and diagram beats stay code-rendered from `kit/` (Rough.js). Casting doctrine — *cast existing first, custom last* (PRD §6.0).
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
12. **Palette — unified across the channel** (§9.2), not tone-driven per book.
13. **Intro / outro bumper — no default bumper on the pilot** (§9.2, §18); creative-design task deferred.
14. **Fact-check artifact** (§7 stage 3b, §8.5): `episodes/<slug>/notes/factcheck.md` must contain `Status: ✅ approved` — assembly refuses to run otherwise. Hard render gate.

### Visual + audio upgrade (2026-09-26 / 2026-10-03)
15. **Visuals — AI stills, not SVG stick figures** (§8.1). Stills only: no animation, no lip sync. Generated **locally** (no cloud API) with ComfyUI portable + Flux.1 Dev GGUF Q5_K_S. Text-hero beats stay code-rendered.
16. **Poseidon look — locked "for now"** (§8.1): stocky, barrel-chested, round belly; white beard and wild hair; pink nose; teal toga over one shoulder; all-gold trident. Refine during the pilot.
17. **Whisper engine — local faster-whisper** (§8.3), OpenAI API as fallback. Supersedes decision 1.
18. **Reproducibility — recipes in `tools/`** (§8.6): pinned versions, model checksums, setup scripts. Installs and models stay out of git; generated images are not committed.
19. **Character reference images stay out of git** (2026-10-03). They live on the GPU desktop; the prompts and seeds in `tools/comfyui/prompts/` reproduce them. Character files in `shared/characters/` hold text only. A trained LoRA file also stays local, in `C:\ComfyUI\ComfyUI\models\loras\`.

## North-star constraints (don't violate)
- **Effort is a continuation gate** (PRD §13): drive per-episode *user* effort toward zero; episode #2 must be far easier than #1.
- **Accuracy gate** (PRD §7, 3b): the `Status: ✅ approved` line in `notes/factcheck.md` is a hard render gate.
- **Tone dial, constant voice** (PRD §6.1): adapt depth per book; keep the dry narrator voice constant.
- **Images carry the message** (PRD §6.0): visual vocabulary is unbounded; the cartoon house style is the *aesthetic*, not a restriction on *what* can be on screen.

---

## Next action
**Phase 0 (pipeline skeleton) complete.** **Phase 0.5 (local upgrade) in progress.**

Next, in this order:
1. **V2 — AI scene generation.** Write `plans/<issue#>-ai-scene-generation.md`, get approval, build.
2. **#13 — Ubik pilot**, in parallel with V2 for the writing steps:
   1. `npm run new-episode ubik`.
   2. Fill in `episodes/ubik/seed.md` (angle + tone: Heavy, locked decision #10).
   3. Claude researches → `notes/research.md`; drafts `script.yml` with an image prompt per beat.
   4. Verify facts → set `Status: ✅ approved` in `notes/factcheck.md`.
   5. After V2: `npm run generate-scenes ubik` → review stills.
   6. Record narration → `audio/narration.wav`.
   7. `npm run align ubik` → `npm run assemble ubik`.
