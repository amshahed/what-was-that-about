# Plan — Slice V1: local Whisper in `npm run align`

**Issue:** #27 (V1 in `plan.md`)
**Branch:** `slice/27-local-whisper`
**Blocked by:** V0 (merged, PR #26) ✅
**Decision record:** [ADR 0003](../docs/adr/0003-alignment-local-whisper.md)

---

## Goal

`npm run align <slug>` gets word timestamps from **local faster-whisper** on the RTX 3080. No API key, no cost.
The OpenAI Whisper API stays as a fallback engine. The output format (`out/alignment.json`) does not change,
so assembly, captions, SFX and Shorts need no change.

## Approach

### 1 — `tools/whisper/align.py` (new)

A small Python script that runs in `.whisper-env`:

- Input: the WAV path. Output: JSON on stdout, `{ "words": [{word, start, end}], "duration" }` — the same shape as `AlignmentResult`.
- Registers the CUDA DLL folders from the pip `nvidia-*` packages (needed on Windows).
- Model `large-v3-turbo`, `device="cuda"`, `compute_type="float16"`, `language="en"`, `word_timestamps=True`.
  The model downloads to `.whisper-env/models` the first time.
- Optional `--prompt <text>`: passes the script's opening narration as `initial_prompt`, so names such as
  "Runciter" and "Ubik" are spelled right. Whisper uses only the last ~224 tokens of the prompt, so the text is short.
- Errors go to stderr with a clear message and a non-zero exit code. CUDA out-of-memory → "Stop ComfyUI and run again."

### 2 — `render/align.ts` (the engine boundary)

- `alignAudio(audioPath, { engine?, prompt? })`. The engine comes from `ALIGN_ENGINE` (`local` | `openai`), default `local`.
- `local`: spawn `.whisper-env/Scripts/python.exe tools/whisper/align.py <wav>`, read stdout, validate the JSON
  (`parseLocalAlignment`), and return `AlignmentResult`.
  - Env missing → error: "Local Whisper is not set up. Run tools\whisper\setup.ps1, or set ALIGN_ENGINE=openai."
- `openai`: the current code, without changes.
- No other file knows which engine ran. `scripts/align.ts` prints the engine name only.

### 3 — `scripts/align.ts`

- Read `script.yml` if it exists, and pass the first beats' narration as the `prompt`.
- Use `resolveEpisodeDir` from `scripts/lib/episode.ts`. Today `align.ts` has its own copy.

### 4 — Number words (from ADR 0003)

> *Superseded in review round 1:* skipping number words made cuts late when Whisper writes
> words. The final code converts number words to digits on both sides — see § Review round 1.

Whisper writes "nine to five" as "9 to 5". Beat matching (`render/timeline.ts`) anchors each beat on its
first significant word. A beat that starts with a number would miss its anchor and fall back to estimated timing.
Fix: treat digits and number words (zero–twenty, tens, hundred, thousand, million, billion) as stop words in
`significantWords`. Then the anchor is always a normal word.

### 5 — Docs

- Remove the "planned"/"today" split for alignment: README, PRD §7 stage 6, §8.3, §8.5, §15, the workflow (Stage 6), and `tools/README.md`.
- ADR 0003 status → "Accepted (implemented)". `plan.md`: V1 merged, next action = V2.
- The 2-line "character references stay out of git" change from 2026-10-03 rides in this PR.

## Tests (run in CI, no GPU)

- `parseLocalAlignment`: valid JSON; missing `words`; bad types → clear error.
- Engine selection: default is `local`; `ALIGN_ENGINE=openai` uses the API path; an unknown value → error.
- Local engine with the child process mocked: success; non-zero exit → its stderr in the error; env missing → the setup hint.
- `timeline`: a beat that starts with "Nine" or "9" anchors on its next significant word.
- Existing OpenAI tests stay green.

## Manual acceptance (on the GPU desktop)

1. Make a test narration of `episodes/sample/script.yml` with the Windows speech voice (`System.Speech`), saved as `audio/narration.wav`.
2. `npm run align sample` → `out/alignment.json`, with no `OPENAI_API_KEY` set.
3. Check that each beat's start time in the rough cut matches the audio: add a temporary approved
   `notes/factcheck.md`, run `npm run assemble sample`, and watch `out/roughcut.mp4`. Remove the temp files after.
4. `ALIGN_ENGINE=openai` without a key → the existing "OPENAI_API_KEY is not set" error.

## Acceptance criteria

- [ ] `npm run align <slug>` works with no API key, on the local GPU.
- [ ] `out/alignment.json` keeps the same format; assembly works on it unchanged.
- [ ] `ALIGN_ENGINE=openai` still works as before.
- [ ] Clear errors: env not set up, GPU out of memory, missing WAV.
- [ ] Number-first beats anchor correctly.
- [ ] CI green; docs no longer call local Whisper "planned".

## Out of scope

- Loudness normalization (separate slice, after the first Ubik rough cut).
- WhisperX / forced alignment against the script text (ADR 0003 "revisit if").
- Mac support for the local engine (the Mac uses `ALIGN_ENGINE=openai`).

## Scope addition found during manual acceptance

`npm run assemble` and `npm run short` failed at render time: Remotion cannot load `file://` URLs
("Can only download URLs starting with http:// or https://"). The rough cut had never rendered.
Fix (needed for the "assembly works unchanged" criterion):

- `scripts/lib/render-assets.ts` stages the narration, music and SFX into `out/.render-public/`
  (gitignored with `out/`), before `bundle({ publicDir })`.
- `RoughCut` and `Shorts` load media with `staticFile(name)`; props carry names, not URLs.

Verified: the sample episode renders (13.8 s, H.264 + AAC); beat cuts land on the spoken anchor
words (7.4 s, 10.2 s); `npm run short sample 1 2` renders 6.4 s.

## Review round 1 (technical + functional) — fixes

- **Number words:** with the spelling hint, Whisper often writes numbers as words ("Nine",
  "Twenty -one"), so skipping them made cuts up to 1.5 s late. Now both sides convert number words to
  digits and split hyphens, so "nine", "9", "twenty-one", "Twenty -one" and "21" all match.
- **Leading stop words:** a cut starts at the beat's first spoken word ("The god…" at "The"), only when
  the transcript has the same leading words, and never inside the previous beat.
- align.py: `vad_filter=True` (silence no longer yields "Thank you."), cuBLAS alloc failures count as OOM,
  ASCII JSON, first-run download note.
- align.ts: absolute paths in the setup errors, signal + stdout in failure messages, UTF-8-safe stream
  reading, PowerShell syntax in hints; `runProcess` tests.
- `npm run align` warns when the transcript has < 60% of the script's words.
- Render folders are per command (`.render-public-roughcut`, `.render-public-short-<a>-<b>`) and are
  deleted after the render.
- Docs: README status, slow-not-OOM note when ComfyUI holds the VRAM, zsh form for the Mac, ADR 0003.

## Verification on the GPU desktop (after review fixes)

- `npm run align` with `OPENAI_API_KEY` unset, on a 4-beat test episode (12.5 s): beats start at 0.00,
  3.03, 7.07, 10.07 s — on the first spoken word of each ("The", "Nine", "Twenty", "Then").
- `npm run assemble` (12.5 s, video + audio) and `npm run short <dir> 1 2` (7.0 s) render; the staged
  render folders are removed afterwards. One run logged a Remotion "Target closed" message at browser
  shutdown with exit 0 and a complete file; a re-run did not repeat it.
- Error paths: unknown `ALIGN_ENGINE`, `ALIGN_ENGINE=openai` without a key, missing env — all clear.
- Not tested: a real OpenAI key; a music bed `.mp3` (none in `shared/music/` yet).

## Review round 2 (final reviewer) — fixes

- A tens word no longer joins a number in the next clause ("thirty. Two" stays 30, 2).
- `assemble` and `short` delete Remotion's bundle folder in %TEMP% after the render (it holds a copy of
  the narration WAV).
- PRD §8.3 and ADR 0003 describe the number matching as built, including its limit (numbers above 99).
