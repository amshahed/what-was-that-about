# ADR 0003 — Alignment engine: local faster-whisper

- **Status:** Accepted — implemented in slice V1 (#27)
- **Date:** 2026-10-03
- **Deciders:** project owner + Claude
- **Relates to:** PRD §8.3, §8.6; changes the engine chosen in slice #7

## Context

Slice #7 chose the OpenAI Whisper API for zero install and Mac portability. ADR 0002 moved image
generation to the Windows GPU desktop, so the pipeline runs there anyway. The API needs a key
and a paid account.

## Decision

Use **faster-whisper** (`large-v3-turbo`, CUDA, float16) locally.

- Env: Python 3.12 venv at `<repo>/.whisper-env` (gitignored), built by `tools/whisper/setup.ps1`
  from `tools/whisper/requirements.lock.txt`. The model downloads to `.whisper-env/models`.
- `av` is pinned to 14.x: faster-whisper 1.2.1 breaks with `av` 15 or later.
- `render/align.ts` stays the only engine boundary. A setting selects the engine; the OpenAI API
  stays as a fallback.

## Consequences

- **+** No key, no cost, offline. Measured: 13 s of audio in 0.5 s; model load 2 s.
- **−** Another local env to maintain (recipe in `tools/whisper/`).
- **−** Cannot run while ComfyUI is generating (10 GB of VRAM).
- **−** Whisper writes numbers as digits ("9 to 5"); beat matching must normalize numbers.

## Revisit if

Word timing is not accurate enough for comedic cuts. Then consider WhisperX (forced alignment
against the known script text).
