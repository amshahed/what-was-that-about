import type { BeatEntry } from "./timeline";

export interface CaptionLine {
  startFrame: number;
  durationFrames: number;
  text: string;
}

export function buildCaptionLines(beats: BeatEntry[]): CaptionLine[] {
  return beats
    .filter((b) => b.narration.trim().length > 0)
    .map((b) => ({
      startFrame: b.startFrame,
      durationFrames: b.durationFrames,
      text: b.narration.trim(),
    }));
}
