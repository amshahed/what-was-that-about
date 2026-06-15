# Plan — Slice #8: Assembly v1 — Synced Rough-Cut with Motion

**Issue:** #8  
**Branch:** `slice/8-assembly-v1`  
**Blocked by:** #6 (stills batch) ✅, #7 (Whisper alignment) ✅

---

## Goal

Produce a synced rough-cut MP4 from a script.yml + alignment.json + narration.wav, with Ken Burns zoom on [ZOOM] beats and a hard factcheck render gate. No captions (#9) or music (#10) yet — those layer in on top.

---

## Approach

### 1 — `render/timeline.ts` — beat timing (pure, testable)

Maps `Beat[]` + `AlignmentResult` to `BeatEntry[]` ready for the Remotion composition.

```ts
export interface BeatEntry {
  startFrame: number;      // first frame of this beat
  durationFrames: number;  // how many frames to hold the image
  scene: SceneSpec;
  zoom: boolean;
  hold: boolean;
  narration: string;
}

export function mapBeatsToTimeline(
  beats: Beat[],
  alignment: AlignmentResult,
  fps: number,
): BeatEntry[]
```

**Word-matching algorithm:**
1. Normalize each transcript word: `w.toLowerCase().replace(/[^a-z0-9]/g, "")`.
2. Walk beats in order, maintaining a `cursor` into the word list.
3. For each beat: extract the first 1–3 significant words from its narration (skip stop-words: `a the is of and in to it`). Search forward from `cursor` for the first match.
4. If found at index `j`: `beatStartSec = words[j].start`, advance `cursor` to `j + 1`.
5. If not found: linearly interpolate from the previous beat's end based on character share of remaining text.
6. Beat `i`'s `endSec` = beat `i+1`'s `startSec` (last beat ends at `alignment.duration`).
7. `durationFrames = Math.round((endSec - startSec) * fps)`, minimum 1.

**HOLD:** Add `Math.round(fps * 1.5)` bonus frames to the beat's `durationFrames`. The `<Sequence>` for the following beat starts at its natural timing regardless — the hold just means the previous image lingers during potential silence. The composition stacks sequences by frame position so the later sequence covers the held image when the next beat begins.

### 2 — `render/timeline.test.ts` — unit tests (no I/O)

- Happy path: 3-beat fixture → correct startFrames and durationFrames.
- HOLD: adds 45 frames (1.5s at 30fps) to durationFrames.
- ZOOM flag preserved.
- Fall-back interpolation: beat whose first words don't appear in transcript gets a proportional slice.
- Edge case: single beat → gets full alignment.duration.

### 3 — `render/remotion/compositions/RoughCut.tsx` — new composition

```tsx
interface RoughCutProps {
  beats: BeatEntry[];
  audioSrc: string;   // absolute path — rendered as file://<audioSrc> in headless Chromium
  totalFrames: number;
}
```

Structure:
```tsx
<AbsoluteFill>
  <Audio src={`file://${props.audioSrc}`} />
  {beats.map((beat, i) => (
    <Sequence key={i} from={beat.startFrame} durationInFrames={beat.durationFrames}>
      {beat.zoom
        ? <ZoomedScene spec={beat.scene} durationFrames={beat.durationFrames} />
        : <AbsoluteFill><SceneCanvas spec={beat.scene} /></AbsoluteFill>}
    </Sequence>
  ))}
</AbsoluteFill>
```

`ZoomedScene` interpolates `scale` from `1.0` → `1.05` over `durationFrames` using `useCurrentFrame` + `interpolate`, applied via CSS `transform: scale()` with `transformOrigin: 'center'`. Subtle — just enough motion to feel alive.

### 4 — Update `render/remotion/Root.tsx`

Add the `roughcut` composition with `calculateMetadata` so `durationInFrames` is dynamic:

```tsx
<Composition
  id="roughcut"
  component={RoughCut}
  fps={30}
  width={STAGE.w}
  height={STAGE.h}
  defaultProps={{ beats: [], audioSrc: "", totalFrames: 30 }}
  calculateMetadata={({ props }) => ({ durationInFrames: props.totalFrames })}
/>
```

### 5 — `scripts/assemble.ts` — CLI runner

```
tsx scripts/assemble.ts <episode-slug-or-dir>
```

Flow:
1. **Factcheck gate** — read `episodes/<slug>/notes/factcheck.md`, fail with a clear error if it doesn't contain `Status: ✅ approved`.
2. Read `episodes/<slug>/script.yml` → `Script` (via `parseScript`).
3. Read `episodes/<slug>/out/alignment.json` → `AlignmentResult`. Error if missing (run `npm run align` first).
4. Resolve `episodes/<slug>/audio/narration.wav`. Error if missing.
5. Call `mapBeatsToTimeline(script.beats, alignment, 30)` → `BeatEntry[]`.
6. `totalFrames = Math.ceil(alignment.duration * 30)`.
7. `bundle(...)` → `serveUrl`.
8. `selectComposition(roughcut, inputProps)` → composition (inherits `totalFrames` via `calculateMetadata`).
9. `renderMedia({ codec: "h264", outputLocation: episodes/<slug>/out/roughcut.mp4 })`.
10. Print duration + frame count on success.

### 6 — `package.json`

Add `"assemble": "tsx scripts/assemble.ts"`.

---

## Files touched

| File | Action |
|------|--------|
| `render/timeline.ts` | **new** — beat timing pure function |
| `render/timeline.test.ts` | **new** — unit tests |
| `render/remotion/compositions/RoughCut.tsx` | **new** — Remotion composition |
| `render/remotion/Root.tsx` | add `roughcut` composition |
| `scripts/assemble.ts` | **new** — CLI runner |
| `package.json` | add `"assemble"` script |
| `plans/8-assembly-v1.md` | **new** — this file |

---

## Acceptance criteria

- [ ] `render/timeline.ts` exports `mapBeatsToTimeline` and `BeatEntry`.
- [ ] `npm test` passes (all existing + new timeline tests).
- [ ] `npm run typecheck` clean.
- [ ] `npm run lint` clean.
- [ ] `npm run assemble ubik` without a factcheck file exits non-zero with a clear message.
- [ ] `npm run assemble ubik` with a real WAV + alignment.json + `Status: ✅ approved` produces `episodes/ubik/out/roughcut.mp4`.
- [ ] CI passes on the PR.
