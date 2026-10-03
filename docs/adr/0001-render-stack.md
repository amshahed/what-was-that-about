# ADR 0001 — Render stack: Remotion

- **Status:** Accepted
- **Date:** 2026-06-13
- **Deciders:** project owner + Claude
- **Relates to:** Issue #2, PRD §8.4
- **Note (2026-09-26):** still in force. Character images now come from local AI stills
  ([ADR 0002](./0002-visuals-local-ai-stills.md)); Remotion renders them as images. Rough.js
  components remain for text-hero and diagram beats.

## Context
The pipeline turns code-defined, hand-drawn-style (Rough.js) scenes into video: long-form 16:9 plus 9:16 Shorts, with motion (Ken Burns / `[ZOOM]` / `[HOLD]`), burned-in captions, music, and SFX, synced to recorded narration. The North-star constraint (PRD §13) is **minimal per-episode effort** — maximize reuse and automation.

## Options considered
1. **Remotion** — React components → video (headless Chrome + bundled FFmpeg).
2. **SVG→PNG + FFmpeg** — render scenes to PNG (resvg/sharp), then stitch/animate/caption/mix by hand with FFmpeg.

## Decision
**Remotion.** One framework expresses components, motion, captions, audio, and both aspect ratios. It collapses slices #8 (assembly), #9 (captions), #10 (music/SFX), and #11 (Shorts) into a single programmatic surface and reuses the exact components we draw for stills — the strongest lever on the low-effort goal. Rough.js output (SVG paths) embeds directly in Remotion components. Licensing is free at our (solo) scale.

## Consequences
- **+** Maximum component reuse across stills, long-form, and Shorts; great preview DX (`npm run studio`).
- **+** `npm run build` bundles the project as a Chrome-free compile check (CI-safe).
- **−** Heavier dependency; rendering needs a headless Chrome shell (downloaded on first local render). CI therefore runs lint/typecheck/build/test only — **no rendering in CI** (rendering is a local/desktop step).
- **−** Tied to React; contributors need basic React familiarity.

## Revisit if
Rendering proves too slow/heavy on the target machine, or licensing terms change for our scale — at which point the SVG→PNG + FFmpeg fallback is reconsidered.
