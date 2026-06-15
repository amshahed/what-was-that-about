import { describe, it, expect } from "vitest";
import { mapBeatsToTimeline } from "./timeline";
import type { Beat } from "../kit/script";
import type { AlignmentResult } from "./align";

const FPS = 30;

function beat(narration: string, opts: Partial<Beat> = {}): Beat {
  return {
    narration,
    scene: { layers: [] },
    hold: false,
    zoom: false,
    sfx: [],
    ...opts,
  };
}

function alignment(words: Array<{ word: string; start: number; end: number }>, duration = 10): AlignmentResult {
  return { words, duration };
}

describe("mapBeatsToTimeline", () => {
  it("maps three beats to correct start frames", () => {
    const beats = [beat("Hello world"), beat("this is great"), beat("goodbye now")];
    const aln = alignment([
      { word: "Hello", start: 0.0, end: 0.3 },
      { word: "world", start: 0.4, end: 0.7 },
      { word: "this", start: 1.0, end: 1.2 },
      { word: "is", start: 1.3, end: 1.4 },
      { word: "great", start: 1.5, end: 1.8 },
      { word: "goodbye", start: 2.0, end: 2.4 },
      { word: "now", start: 2.5, end: 2.8 },
    ], 3.0);

    const entries = mapBeatsToTimeline(beats, aln, FPS);
    expect(entries).toHaveLength(3);
    expect(entries[0]!.startFrame).toBe(0);           // 0.0s
    expect(entries[1]!.startFrame).toBe(30);           // 1.0s
    expect(entries[2]!.startFrame).toBe(60);           // 2.0s
    expect(entries[2]!.durationFrames).toBe(30);       // 2.0s → 3.0s = 1.0s = 30 frames
  });

  it("last beat runs to alignment.duration", () => {
    const beats = [beat("only one beat here today")];
    const aln = alignment([
      { word: "only", start: 0.5, end: 0.8 },
    ], 5.0);

    const [entry] = mapBeatsToTimeline(beats, aln, FPS);
    expect(entry!.startFrame).toBe(15);                // 0.5s
    expect(entry!.durationFrames).toBe(135);           // 5.0s - 0.5s = 4.5s = 135 frames
  });

  it("HOLD adds 1.5s (45 frames at 30fps) to durationFrames", () => {
    const beats = [beat("punch line here", { hold: true }), beat("next beat follows")];
    const aln = alignment([
      { word: "punch", start: 0.0, end: 0.3 },
      { word: "line", start: 0.4, end: 0.6 },
      { word: "here", start: 0.7, end: 0.9 },
      { word: "next", start: 1.0, end: 1.2 },
      { word: "beat", start: 1.3, end: 1.5 },
      { word: "follows", start: 1.6, end: 1.9 },
    ], 3.0);  // duration=3.0 so hold bonus isn't capped

    const entries = mapBeatsToTimeline(beats, aln, FPS);
    // Natural duration beat[0]: 1.0 - 0.0 = 1.0s = 30 frames; +45 hold = 75 frames total
    expect(entries[0]!.durationFrames).toBe(75);
  });

  it("ZOOM flag is preserved", () => {
    const beats = [beat("zoom in please", { zoom: true })];
    const aln = alignment([{ word: "zoom", start: 0.0, end: 0.3 }], 2.0);
    const [entry] = mapBeatsToTimeline(beats, aln, FPS);
    expect(entry!.zoom).toBe(true);
  });

  it("falls back to interpolation when beat words not in transcript", () => {
    const beats = [beat("xylophone quasar nebula"), beat("hello world")];
    const aln = alignment([
      { word: "hello", start: 1.0, end: 1.3 },
      { word: "world", start: 1.4, end: 1.7 },
    ], 2.0);

    // First beat words not found → interpolated; second beat found at 1.0s
    const entries = mapBeatsToTimeline(beats, aln, FPS);
    expect(entries).toHaveLength(2);
    // Second beat must start at 1.0s = 30 frames
    expect(entries[1]!.startFrame).toBe(30);
  });

  it("single beat gets full alignment duration", () => {
    const beats = [beat("everything in one beat")];
    const aln = alignment([{ word: "everything", start: 0.1, end: 0.5 }], 8.0);
    const [entry] = mapBeatsToTimeline(beats, aln, FPS);
    expect(entry!.durationFrames).toBe(Math.round((8.0 - 0.1) * 30));
  });
});
