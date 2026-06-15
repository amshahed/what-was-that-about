# Plan — Slice #7: Whisper Forced Alignment

**Issue:** #7  
**Branch:** `slice/7-whisper-alignment`  
**Blocked by:** #5 (script parser, merged) ✅

---

## Goal

Give the pipeline a typed `audio → word-timestamps` function backed by the OpenAI Whisper API (engine locked, PRD §8.3). This is the alignment step that later lets assembly (#8) snap visual cuts to when the narrator *actually* said each line.

The boundary is the single commitment in the PRD: **no other file imports the OpenAI SDK or knows what engine produced the timestamps.** Swapping to local WhisperX later means changing one file only.

---

## Approach

### 1 — New package dependency

Add the official `openai` npm package (the only file that touches it is `render/align.ts`).

### 2 — `render/align.ts` — the boundary module

Exports one public function and the shared types:

```ts
export interface WordTimestamp {
  word: string;   // token as transcribed (may include leading space)
  start: number;  // seconds from audio start
  end: number;    // seconds
}

export interface AlignmentResult {
  words: WordTimestamp[];
  duration: number;  // total audio duration in seconds
}

/** Single public entry-point. Reads the WAV file at `audioPath`,
 *  calls OpenAI Whisper with word-level granularity, returns typed result. */
export async function alignAudio(audioPath: string): Promise<AlignmentResult>
```

Implementation details:
- Reads the file from disk, posts to `/v1/audio/transcriptions` via the openai SDK.
- Model: `whisper-1`. `response_format: "verbose_json"`. `timestamp_granularities: ["word"]`.
- API key from `process.env.OPENAI_API_KEY` (throws a clear error if absent).
- No retry logic in v1 (the SDK handles one attempt; network errors surface to the CLI).

The module also exports a `parseAlignmentResponse` helper (pure function, no I/O) so tests can exercise the response→result mapping without an API call.

### 3 — `scripts/align.ts` — CLI runner

```
tsx scripts/align.ts <episode-slug>
tsx scripts/align.ts <episode-dir>
```

- Resolves `episodes/<slug>/audio/narration.wav`.
- Guards: file must exist; warns but continues if it's not WAV (checks extension only — we trust the user's audio contract).
- Calls `alignAudio(...)`.
- Writes result to `episodes/<slug>/out/alignment.json` (creates `out/` if absent).
- Prints word count + duration to stdout on success.

Why JSON? It's the hand-off artifact that assembly (#8) will read. Storing it means we don't re-call the API on every render iteration.

### 4 — `render/align.test.ts` — tests (no live API call)

Tests cover:
1. `parseAlignmentResponse` round-trips a fixture response into the expected `AlignmentResult` shape.
2. Word tokens with leading spaces are preserved as-is (Whisper's behaviour).
3. `alignAudio` throws a legible error when `OPENAI_API_KEY` is missing (unit-level env check).

No live network calls in CI — the SDK isn't mocked at the module level; the env-key check fires before any HTTP.

### 5 — `package.json` script

```json
"align": "tsx scripts/align.ts"
```

Usage: `npm run align ubik`

---

## Files touched

| File | Action |
|------|--------|
| `package.json` | add `openai` dep + `"align"` script |
| `package-lock.json` | updated by npm install |
| `render/align.ts` | **new** — boundary module |
| `render/align.test.ts` | **new** — unit tests |
| `scripts/align.ts` | **new** — CLI runner |
| `plans/7-whisper-alignment.md` | **new** — this file |

Nothing in `kit/` or `render/remotion/` is touched. The `openai` import appears in exactly one file.

---

## Acceptance criteria

- [ ] `render/align.ts` exports `alignAudio`, `parseAlignmentResponse`, `WordTimestamp`, `AlignmentResult`.
- [ ] Only `render/align.ts` imports from `openai` (grep verifiable).
- [ ] `npm run align ubik` with a real WAV + `OPENAI_API_KEY` set writes `episodes/ubik/out/alignment.json`.
- [ ] `npm test` passes (all existing tests + new alignment tests).
- [ ] `npm run typecheck` clean.
- [ ] `npm run lint` clean.
- [ ] CI passes on the PR.
