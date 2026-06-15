# Plan — Slice #9: Burned-in Animated Captions

**Issue:** #9  
**Branch:** `slice/9-captions`  
**Blocked by:** #8 (assembly) ✅

---

## Goal

Add always-on line-pop subtitles to the rough-cut composition. One beat's narration = one subtitle line, popping in at the beat's start frame. No per-word pop (rejected in PRD §9.1). The caption track is an HTML overlay on top of the scene SVG — independent of individual scene compositions.

---

## Approach

### 1 — `render/captions.ts` — pure timing function

```ts
export interface CaptionLine {
  startFrame: number;
  durationFrames: number;
  text: string;  // trimmed narration, may be long
}

export function buildCaptionLines(beats: BeatEntry[]): CaptionLine[]
```

Filters out empty narration beats. Passes `startFrame` / `durationFrames` straight from `BeatEntry`. CSS word-wrap handles long lines inside the overlay component.

### 2 — `render/captions.test.ts` — unit tests

- 3 beats → 3 lines with matching timing.
- Empty narration beats are filtered out.
- Narration text is trimmed.

### 3 — `render/remotion/compositions/CaptionTrack.tsx` — Remotion component

`CaptionOverlay` — pop-in animation:
- Opacity: 0 → 1 over frames 0–3.
- Scale: 0.97 → 1.0 over frames 0–6.
- Applied via inline `style` — no external CSS needed.

Visual style (matches house palette from `kit/rough/style.ts`):
- Background: `rgba(255,254,246,0.92)` (warm paper with slight transparency)
- Border: `3px solid #1b1b1b`
- Border-radius: 10px
- Font: `"Comic Sans MS", "Marker Felt", "Chalkboard SE", cursive` (matches existing `Caption` component)
- Font size: 42px (slightly smaller than the static `Caption`'s 46px to accommodate longer lines)
- Color: `#1b1b1b` (ink)
- Positioned at the bottom of the frame via `AbsoluteFill` flex layout

`CaptionTrack` wraps each line in `<Sequence from=... durationInFrames=...>`:
```tsx
export const CaptionTrack: FC<{ lines: CaptionLine[] }> = ({ lines }) => (
  <>
    {lines.map((line, i) => (
      <Sequence key={i} from={line.startFrame} durationInFrames={line.durationFrames}>
        <CaptionOverlay text={line.text} />
      </Sequence>
    ))}
  </>
);
```

### 4 — Update `render/remotion/compositions/RoughCut.tsx`

Add `CaptionTrack` as the last child of the outer `<AbsoluteFill>` (renders on top of scenes). Derive lines inside the component to keep `RoughCutProps` unchanged:

```tsx
import { CaptionTrack } from "./CaptionTrack";
import { buildCaptionLines } from "../../captions";

export const RoughCut: FC<RoughCutProps> = ({ beats, audioSrc }) => {
  const captionLines = buildCaptionLines(beats);
  return (
    <AbsoluteFill>
      <Audio src={audioSrc} />
      {beats.map(...)}
      <CaptionTrack lines={captionLines} />
    </AbsoluteFill>
  );
};
```

No change to `RoughCutProps` — the caption data is derived from `beats` that are already there.

---

## Files touched

| File | Action |
|------|--------|
| `render/captions.ts` | **new** — timing pure function |
| `render/captions.test.ts` | **new** — unit tests |
| `render/remotion/compositions/CaptionTrack.tsx` | **new** — Remotion component |
| `render/remotion/compositions/RoughCut.tsx` | add `<CaptionTrack>` overlay |
| `plans/9-captions.md` | **new** — this file |

No changes to `scripts/`, `kit/`, or `Root.tsx`.

---

## Acceptance criteria

- [ ] `render/captions.ts` exports `buildCaptionLines` and `CaptionLine`.
- [ ] `npm test` passes (all existing + new caption tests).
- [ ] `npm run typecheck` clean.
- [ ] `npm run lint` clean.
- [ ] CI passes on the PR.
