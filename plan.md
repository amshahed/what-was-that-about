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
| #2 | Foundation: scaffold + render-stack decision + house-style spike + CI | **HITL** | — | ⬜ |
| #3 | End-to-end tracer-bullet video | AFK | #2 | ⬜ |
| #4 | Component kit + composition API | AFK | #2 | ⬜ |
| #5 | Script / Edit-Decision-List format + parser | AFK | #4 | ⬜ |
| #6 | Script → stills batch render | AFK | #4, #5 | ⬜ |
| #7 | Whisper forced alignment | AFK | #5 | ⬜ |
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

## Tech stack (from PRD §8)
- **Language:** TypeScript.
- **Visuals:** SVG components styled with **Rough.js** (hand-drawn look); recurring-character consistency via reusable components.
- **Render/assembly:** **Remotion** (lead candidate) or SVG→PNG + **FFmpeg** — decided in #2.
- **Audio sync:** **Whisper** forced alignment (WhisperX / stable-ts).
- **Output:** 16:9 long-form + 9:16 Shorts from the same components.

## North-star constraints (don't violate)
- **Effort is a continuation gate** (PRD §13): drive per-episode *user* effort toward zero; episode #2 must be far easier than #1.
- **Accuracy gate** (PRD §7, 3b): user fact-check is required before any episode ships.
- **Tone dial, constant voice** (PRD §6.1): adapt depth per book; keep the dry narrator voice constant.

---

## Next action
Begin **#2 (Foundation)** → write `plans/2-foundation.md`, get approval, then build.
