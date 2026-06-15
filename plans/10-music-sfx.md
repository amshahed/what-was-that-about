# Plan — Slice #10: Music bed + SFX (tone-tag-driven)

**Issue:** #10  
**Branch:** `slice/10-music-sfx`  
**Blocked by:** #8 ✅

---

## Goal

Add a tone-appropriate royalty-free music bed (ducked under narration) and comedic SFX stings
triggered by `[SFX: name]` tags in the script. Both layers are mixed into the Remotion composition.

---

## Approach

### 1 — `render/mix.ts` — pure mixing helpers

```ts
export const MUSIC_VOLUME_FULL = 0.12;   // −18 dBFS
export const MUSIC_VOLUME_DUCK = 0.04;   // −28 dBFS

export const TONE_MUSIC: Record<Tone, string>  // tone → mp3 filename in shared/music/
export const SFX_FILES: Record<string, string> // tag name → wav filename in shared/sfx/

export interface SfxEvent { startFrame: number; src: string; }

export function buildSfxEvents(beats, resolve): SfxEvent[]
export function musicVolumeAtFrame(frame, beats): number
```

### 2 — `render/mix.test.ts` — unit tests

- `buildSfxEvents`: known name → event, unknown → skip, multi-sfx beat, no-sfx beat.
- `musicVolumeAtFrame`: full/duck at correct boundaries, empty-narration beats not ducked.
- `TONE_MUSIC`: all four tone values covered.

### 3 — `BeatEntry` update (`render/timeline.ts`)

Add `sfx: string[]` field, passed through from `Beat.sfx`.

### 4 — Update `render/remotion/compositions/RoughCut.tsx`

Add `musicSrc: string` and `sfxEvents: SfxEvent[]` to `RoughCutProps`:

```tsx
{musicSrc && <Audio src={musicSrc} volume={(f) => musicVolumeAtFrame(f, beats)} loop />}
{sfxEvents.map((sfx, i) => (
  <Sequence key={i} from={sfx.startFrame} durationInFrames={90}>
    <Audio src={sfx.src} />
  </Sequence>
))}
```

### 5 — Update `scripts/assemble.ts`

Resolve `shared/music/<file>` and `shared/sfx/<file>` to file:// URLs, warn and skip if missing.

### 6 — Asset directories + docs

- `shared/music/` — music bed MP3s (gitignored; user supplies)
- `shared/sfx/` — SFX sting WAVs (gitignored; user supplies)
- `shared/assets.md` — licensing table and recommended sources

---

## Files touched

| File | Action |
|------|--------|
| `render/timeline.ts` | add `sfx` to `BeatEntry`; pass through in `mapBeatsToTimeline` |
| `render/captions.test.ts` | add `sfx: []` to `entry()` factory |
| `render/mix.ts` | **new** — mix helpers |
| `render/mix.test.ts` | **new** — unit tests |
| `render/remotion/compositions/RoughCut.tsx` | add music + SFX audio |
| `scripts/assemble.ts` | resolve music/SFX paths |
| `shared/music/.gitkeep` | **new** — track empty dir |
| `shared/sfx/.gitkeep` | **new** — track empty dir |
| `shared/assets.md` | **new** — licensing doc |
| `plans/10-music-sfx.md` | **new** — this file |

---

## Acceptance criteria

- [ ] `render/mix.ts` exports `buildSfxEvents`, `musicVolumeAtFrame`, `TONE_MUSIC`, `SFX_FILES`.
- [ ] `BeatEntry` carries `sfx: string[]`.
- [ ] `npm test` passes (all existing + new mix tests).
- [ ] `npm run typecheck` clean.
- [ ] `npm run lint` clean.
- [ ] `assemble.ts` warns (not crashes) when music/SFX files are absent.
- [ ] `shared/assets.md` documents file names, sources, and level config.
- [ ] CI passes on the PR.

---

## Volume levels

| Layer | Volume | Approximate dBFS |
|-------|--------|-----------------|
| Narration | 1.0 | −6 to −3 dBFS (record at this level) |
| Music (full) | 0.12 | −18 dBFS |
| Music (ducked) | 0.04 | −28 dBFS |
| SFX | 1.0 | normalized at −12 dBFS in file |
