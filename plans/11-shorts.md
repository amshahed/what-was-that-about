# Plan — Slice #11: Shorts auto-cut (9:16)

**Issue:** #11  
**Branch:** `slice/11-shorts`  
**Blocked by:** #8 ✅, #9 ✅, #10 ✅

---

## Goal

Given a beat range (start index, end index), render a 9:16 Short (1080×1920) that reuses the
existing scene, caption, and audio layers. Multiple Shorts can be produced from one episode by
running with different ranges.

---

## Approach

### 1 — `render/remotion/compositions/Shorts.tsx` — new composition

**Dimensions:** 1080×1920 (9:16 vertical)

**Scene scaling:** Center-crop the landscape (1920×1080) scene into the vertical frame:
- Scale factor = 1920 / 1080 ≈ 1.778 (fills full height; overflows width)
- Center the scaled scene horizontally → crops equal amounts from left and right
- Visible window: center 607.5px of the 1920px source, scaled to 1080px wide

```tsx
<AbsoluteFill style={{ overflow: "hidden", backgroundColor: PALETTE.paper }}>
  {/* Center-cropped scene */}
  <div style={{
    position: "absolute", width: STAGE.w, height: STAGE.h,
    left: "50%", top: 0,
    transformOrigin: "top center",
    transform: `translateX(-50%) scale(${SHORTS_H / STAGE.h})`,
  }}>
    {beats.map((beat, i) => <Sequence ...>...</Sequence>)}
  </div>
  {/* Audio */}
  <Audio src={audioSrc} startFrom={audioStartFrame} />
  {musicSrc && <Audio src={musicSrc} volume={musicVolume} loop />}
  {sfxEvents.map(...)}
  {/* Captions overlay (native 9:16 size — not scaled with scene) */}
  <CaptionTrack lines={captionLines} />
</AbsoluteFill>
```

**Props:**
```ts
export interface ShortsProps {
  beats: BeatEntry[];       // re-timed: first beat starts at frame 0
  audioSrc: string;
  audioStartFrame: number;  // seek offset into narration audio (in frames at 30fps)
  musicSrc: string;
  sfxEvents: SfxEvent[];    // re-timed: offsets adjusted to match beats
  totalFrames: number;
}
```

### 2 — `render/remotion/Root.tsx` — add "shorts" composition

```tsx
<Composition
  id="shorts"
  component={Shorts as unknown as ComponentType<Record<string, unknown>>}
  fps={30}
  width={1080}
  height={1920}
  defaultProps={SHORTS_DEFAULT_PROPS as unknown as Record<string, unknown>}
  calculateMetadata={({ props }) => ({
    durationInFrames: (props as unknown as ShortsProps).totalFrames,
  })}
/>
```

### 3 — `scripts/short.ts` — CLI

```
npm run short <episode-slug> <start-beat-index> <end-beat-index>
```

Reads the same episode artifacts as `assemble.ts`, selects the beat range, re-times beats and
SFX events, then renders the "shorts" composition.

Re-timing:
```ts
const offset = beats[startIdx]!.startFrame;
const selectedBeats = beats.slice(startIdx, endIdx + 1).map(b => ({ ...b, startFrame: b.startFrame - offset }));
const selectedSfx = sfxEvents
  .filter(e => e.startFrame >= offset && e.startFrame < endBoundary)
  .map(e => ({ ...e, startFrame: e.startFrame - offset }));
const totalFrames = Math.max(...selectedBeats.map(b => b.startFrame + b.durationFrames));
```

Output: `episodes/<slug>/out/short-<start>-<end>.mp4`

---

## Files touched

| File | Action |
|------|--------|
| `render/remotion/compositions/Shorts.tsx` | **new** — 9:16 composition |
| `render/remotion/Root.tsx` | register "shorts" composition |
| `scripts/short.ts` | **new** — CLI |
| `package.json` | add "short" script |
| `plans/11-shorts.md` | **new** — this file |

---

## Acceptance criteria

- [ ] "shorts" Remotion composition renders at 1080×1920.
- [ ] `npm run short <slug> <start> <end>` produces `episodes/<slug>/out/short-<start>-<end>.mp4`.
- [ ] Scene content is center-cropped (not letter-boxed) from the landscape source.
- [ ] Captions render at native 9:16 resolution (not scaled with scene).
- [ ] Running with different beat ranges from the same episode produces independent Shorts.
- [ ] `npm run typecheck` clean, `npm run lint` clean, CI passes.
