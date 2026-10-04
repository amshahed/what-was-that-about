# ADR 0002 — Visuals: local AI stills (ComfyUI + Flux GGUF)

- **Status:** Accepted — pipeline integration implemented in slice V2 (#29)
- **Date:** 2026-09-26
- **Deciders:** project owner + Claude
- **Relates to:** PRD §6.0, §8.1, §8.6; supersedes the stick-figure character approach of slices #4 / #6

## Context

The code-drawn SVG stick figures (Rough.js kit, #4) worked technically but looked too primitive.
The target look is expressive cartoon characters with real bodies and varied poses
(Crayon Capital, Clever Crack, Cyanide & Happiness). Recurring characters must look
the same in every shot (and, for channel characters, every episode). Per-episode effort must stay low (PRD §13).

## Options considered

1. **Keep the SVG kit** and draw better characters in code — very high effort per pose.
2. **Cloud image API** — per-image cost, less control, prompts leave the machine.
3. **Local generation on the RTX 3080 (10 GB)** with ComfyUI + Flux.1 Dev.

## Decision

**Option 3.** Stills only — no animation, no lip sync.

- **ComfyUI Windows portable build** at `C:\ComfyUI`. A manual venv install failed on PyTorch
  version conflicts; use only the portable build.
- **Flux.1 Dev, GGUF Q5_K_S** (~8 GB) to fit 10 GB of VRAM, with T5-XXL fp8 + CLIP-L and the
  Flux VAE. Nodes: ComfyUI-GGUF, ComfyUI-Manager.
- **Consistency:** a locked character description per recurring character, added to every prompt
  that casts it. Later: character LoRA → IP-Adapter → ControlNet (pose). (Poseidon was the proof
  of concept for the tools; he was removed on 2026-10-04 and is not part of any episode.)
- **Text-hero and diagram beats stay in the code kit**, because image models draw text badly.
- **Reproducibility:** pinned versions, node commits and model checksums in `tools/comfyui/`.

## Consequences

- **+** Much better look; zero per-image cost; full control; private.
- **+** Measured: 1024×1024 in ~45–60 s; build, hair, outfit and props stay consistent across
  shots with prompt-only consistency.
- **−** Precise hand poses (facepalm, raised finger) fail from prompts alone → needs ControlNet.
- **−** Occasional artifacts (extra props, stray signature marks) → user review + re-roll.
- **−** The pipeline now depends on the NVIDIA desktop. The Mac can call it over the LAN.
- **−** Flux.1 Dev weights use a non-commercial license; output terms must be checked before
  monetization. Fallback: a commercially licensed model in the same workflow.
- **−** Generated PNGs are not committed; they are reproducible from prompt + seed + pinned models.

## Revisit if

Character drift stays high after LoRA + ControlNet, the Flux license blocks monetized use, or
generation time per episode gets too long for the effort budget.
