# What Was That About

A funny/casual **book summary & analysis** YouTube channel, produced through a mostly-automated, code-driven pipeline.

## How an episode is made

```
seed → research → script.yml → fact-check gate → scene images → narration → alignment → assembly → Shorts
```

| Step                | Tool                                                                       | Runs on            |
| ------------------- | -------------------------------------------------------------------------- | ------------------ |
| Script (beats, EDL) | `episodes/<slug>/script.yml`                                               | any machine        |
| Scene images        | ComfyUI + Flux.1 Dev GGUF (local), cartoon style; code kit for text scenes | Windows GPU (3080) |
| Narration timing    | faster-whisper (local)                                                     | Windows GPU        |
| Video (16:9 + 9:16) | Remotion: Ken Burns, captions, music, SFX                                  | Windows desktop    |

Per-episode steps: [`docs/episode-workflow.md`](./docs/episode-workflow.md).
Design decisions: [`docs/adr/`](./docs/adr).

## Setup after cloning

**Needs:** Windows, an NVIDIA GPU (tested on an RTX 3080, 10 GB), Node 22, Python 3.12, Git.

1. Install the Node packages and check the code:
   ```powershell
   npm ci
   npm test
   ```
2. Install ComfyUI and the image models (about 14 GB of downloads) to `C:\ComfyUI`:
   ```powershell
   powershell -ExecutionPolicy Bypass -File tools\comfyui\setup.ps1
   ```
3. Install local Whisper to `.whisper-env\`:
   ```powershell
   powershell -ExecutionPolicy Bypass -File tools\whisper\setup.ps1
   ```
4. Optional: put the music and SFX files in `shared\`. See [`shared/assets.md`](./shared/assets.md).
5. Start ComfyUI before you generate images: `C:\ComfyUI\run_nvidia_gpu_lan.bat`.
6. Start an episode: `npm run new-episode <slug>`. See [`docs/episode-workflow.md`](./docs/episode-workflow.md).

Until `npm run align` uses local Whisper, it needs `OPENAI_API_KEY`.
See [`tools/README.md`](./tools/README.md) for the pins and the details of each tool.

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

- **Phase 0 — pipeline skeleton:** done (slices #2–#12).
- **Phase 0.5 — local upgrade:** in progress. Done: ComfyUI + Flux, Poseidon look, Whisper env,
  `tools/` recipes. Next: local Whisper in `align` (V1), AI scene generation (V2).
- **Phase 1 — Ubik pilot (#13):** writing can start now; rendering waits for V1 and V2.

Live status: [`plan.md`](./plan.md).
