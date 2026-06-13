# What Was That About

A funny/casual **book summary & analysis** YouTube channel, produced through a mostly-automated, code-driven pipeline (stick-figure / hand-drawn visuals, real-voice narration, auto-synced assembly).

## Spec & process
- **[`PRD.md`](./PRD.md)** — product requirements: vision, audience, content design, the pipeline, risks, roadmap.
- **[`plan.md`](./plan.md)** — execution plan: the per-issue dev lifecycle, slice roadmap, and live status board.
- **Issues** — tracked on GitHub; parent PRD is **#1**, slices are **#2+**.
- **Per-issue plans** — live under [`plans/`](./plans), one per slice, created when work on that slice starts.

## How development works
Spec-driven, one slice at a time:
`plan → approval → build → test → PR → CI → fix → code-review (high) → fix → merge`
(See [`plan.md`](./plan.md) for the full convention.)

## Status
Phase 0 — building the pipeline skeleton. Start: issue **#2 (Foundation)**.
