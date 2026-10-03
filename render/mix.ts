import type { Tone } from "../kit/script";
import type { BeatEntry } from "./timeline";

export const MUSIC_VOLUME_FULL = 0.12;
export const MUSIC_VOLUME_DUCK = 0.04;
export const SFX_DURATION_FRAMES = 90;

// Tone tag → music bed filename (placed in shared/music/).
export const TONE_MUSIC: Record<Tone, string> = {
  light: "light-funk.mp3",
  balanced: "balanced-groove.mp3",
  heavy: "heavy-ambient.mp3",
};

// SFX name (normalized by sfxKey) → sting filename (placed in shared/sfx/).
export const SFX_FILES: Record<string, string> = {
  "record scratch": "record-scratch.wav",
  boing: "boing.wav",
  ding: "ding.wav",
  whoosh: "whoosh.wav",
  "drum hit": "drum-hit.wav",
};

export interface SfxEvent {
  startFrame: number;
  src: string;
}

/** Normalize an SFX tag name: case-insensitive; "-" and "_" count as spaces ("record-scratch" → "record scratch"). */
export function sfxKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[-_\s]+/g, " ")
    .trim();
}

/** Sting filename for an SFX tag name, or undefined if unknown. Own keys only (no `constructor` etc.). */
export function sfxFile(name: string): string | undefined {
  const key = sfxKey(name);
  return Object.prototype.hasOwnProperty.call(SFX_FILES, key) ? SFX_FILES[key] : undefined;
}

/**
 * Build SFX events from a beat list.
 * @param resolve - gets the tag name as written in the script; returns the src (a staticFile() name), or null to skip.
 */
export function buildSfxEvents(
  beats: BeatEntry[],
  resolve: (name: string) => string | null,
): SfxEvent[] {
  const events: SfxEvent[] = [];
  for (const beat of beats) {
    for (const name of beat.sfx) {
      const src = resolve(name);
      if (src !== null) events.push({ startFrame: beat.startFrame, src });
    }
  }
  return events;
}

export function musicVolumeAtFrame(frame: number, beats: BeatEntry[]): number {
  for (const b of beats) {
    if (
      b.narration.trim().length > 0 &&
      frame >= b.startFrame &&
      frame < b.startFrame + b.durationFrames
    ) {
      return MUSIC_VOLUME_DUCK;
    }
  }
  return MUSIC_VOLUME_FULL;
}
