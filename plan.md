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
| #2 | Foundation: scaffold + render-stack decision + house-style spike + CI | **HITL** | — | 🟩 tech merged · ⚠️ style sign-off pending |
| #3 | End-to-end tracer-bullet video | AFK | #2 | ⬜ |
| #4 | Component kit + composition API | AFK | #2 | 🟩 merged |
| #5 | Script / Edit-Decision-List format + parser | AFK | #4 | 🟩 merged |
| #6 | Script → stills batch render | AFK | #4, #5 | 🟩 merged |
| #7 | Whisper forced alignment (**engine locked: OpenAI Whisper API** — see PRD §8.3) | AFK | #5 | ⬜ |
| #8 | Assembly v1: synced rough-cut with motion | AFK | #6, #7 | ⬜ |
| #9 | Burned-in animated captions | AFK | #8 | ⬜ |
| #10 | Music bed + SFX (tone-tag-driven) | AFK | #8 | ⬜ |
| #11 | Shorts auto-cut (9:16) | AFK | #4, #8, #9 | ⬜ |
| #12 | Per-episode content workflow scaffolding | AFK | #5 | ⬜ |
| #13 | Pilot: Ubik episode, end-to-end | **HITL** | #8, #9, #10, #11, #12 | ⬜ |
| #14 | Brand identity: name, mascot/persona, thumbnail style | **HITL** | — (parallel) | ⬜ |

### Critical path
`#2 → #3 (spine)` then `#2 → #4 → #5 → {#6, #7} → #8 → {#9, #10, #11} → #13`
- `#12` (content workflow) needs only `#5`; can run alongside the assembly slices.
- `#14` (brand) is parallel; the mascot decision feeds `#4`, so ideally land its mascot spec before/early in `#4`.

### Phase mapping (PRD §19)
- **Phase 0 — pipeline skeleton:** #2–#12
- **Phase 1 — Ubik pilot:** #13
- **Phase 2 — buffer & launch / Phase 3 — optimize:** post-pilot, new issues TBD.

---

## Tech stack (from PRD §8, locked)
- **Language:** TypeScript.
- **Visuals:** SVG components styled with **Rough.js** (hand-drawn look); recurring-character consistency via reusable components; casting doctrine — *cast existing first, custom last* (PRD §6.0).
- **Render/assembly:** **Remotion — locked** (PRD §8.4). FFmpeg-only fallback rejected.
- **Audio sync:** **OpenAI Whisper API — locked** (PRD §8.3). Single-file boundary; swap-out to local WhisperX deferred and reversible.
- **Audio contract:** WAV mono 44.1 kHz 16-bit, peak `-6..-3` dBFS; pipeline normalizes to **-14 LUFS**.
- **Output:** 16:9 long-form + 9:16 Shorts from the same components. Two Shorts pipelines: **A** auto-suggested per episode, **B** standalone at repo root `shorts/<id>/` (PRD §7.7).
- **Episode id convention:** **slug-only** (`ubik`, not `01-ubik`).

## Locked design decisions (2026-06-15 design pass)
Captured in PRD; this is the index — see referenced PRD sections for the rationale.

1. **Whisper engine — OpenAI Whisper API** (§8.3). Swap to local WhisperX deferred.
2. **Tone tags — Light / Balanced / Heavy** (§6.1). `Balanced-Heavy` dropped.
3. **Captions — two-tier**: line-pop subtitles (always-on) + text-hero emphasis scenes (§9.1). Per-word pop rejected.
4. **§6.0 Visual storytelling principle**: images carry the message — unbounded visual vocabulary, not locked to stick-figure scenes.
5. **Casting doctrine** (§6.0): cast existing first, custom last.
6. **Audio contract** (§8.3): WAV mono 44.1 kHz 16-bit, `-6..-3` dBFS peak, normalize to -14 LUFS.
7. **Shorts — two pipelines** (§7.7): A auto-suggested per episode under `episodes/<slug>/shorts/`; B standalone at repo root `shorts/<id>/`.
8. **Channel name** — *deferred* (§18); "What Was That About" working title fine for now.
9. **Episode structure — 5-section tag-based template** (§6.4): cold-open, spoiler-warn-and-setup, recap, analysis, verdict.
10. **Pilot — Ubik** (§20), tone tag **Heavy**.
11. **Episode id convention — slug-only** (§8.5).
12. **Palette — unified across the channel** (§9.2), not tone-driven per book.
13. **Intro / outro bumper — no default bumper on the pilot** (§9.2, §18); creative-design task deferred.
14. **Fact-check artifact** (§7 stage 3b, §8.5): `episodes/<slug>/notes/factcheck.md` must contain `Status: ✅ approved` — assembly refuses to run otherwise. Hard render gate.

## North-star constraints (don't violate)
- **Effort is a continuation gate** (PRD §13): drive per-episode *user* effort toward zero; episode #2 must be far easier than #1.
- **Accuracy gate** (PRD §7, 3b): the `Status: ✅ approved` line in `notes/factcheck.md` is a hard render gate.
- **Tone dial, constant voice** (PRD §6.1): adapt depth per book; keep the dry narrator voice constant.
- **Images carry the message** (PRD §6.0): visual vocabulary is unbounded; the hand-wobble Rough.js style is the *aesthetic*, not a restriction on *what* can be on screen.

---

## Next action
Begin **#7 (Whisper forced alignment)** — engine is locked (OpenAI Whisper API). Write `plans/7-whisper-alignment.md`, get approval, then build behind the single-file boundary described in PRD §8.3.
