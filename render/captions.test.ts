import { describe, it, expect } from "vitest";
import { buildCaptionLines } from "./captions";
import type { BeatEntry } from "./timeline";

function entry(narration: string, startFrame = 0, durationFrames = 30): BeatEntry {
  return {
    narration,
    startFrame,
    durationFrames,
    scene: { layers: [] },
    zoom: false,
    hold: false,
    sfx: [],
  };
}

describe("buildCaptionLines", () => {
  it("maps 3 beats to 3 caption lines with correct timing", () => {
    const beats = [
      entry("First line of narration", 0, 45),
      entry("Second line here", 45, 30),
      entry("Third and final", 75, 60),
    ];
    const lines = buildCaptionLines(beats);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toEqual({ startFrame: 0, durationFrames: 45, text: "First line of narration" });
    expect(lines[1]).toEqual({ startFrame: 45, durationFrames: 30, text: "Second line here" });
    expect(lines[2]).toEqual({ startFrame: 75, durationFrames: 60, text: "Third and final" });
  });

  it("filters out empty narration beats", () => {
    const beats = [
      entry("real text", 0, 30),
      entry("   ", 30, 30),
      entry("", 60, 30),
      entry("more text", 90, 30),
    ];
    const lines = buildCaptionLines(beats);
    expect(lines).toHaveLength(2);
    expect(lines[0]!.text).toBe("real text");
    expect(lines[1]!.text).toBe("more text");
  });

  it("trims whitespace from narration text", () => {
    const beats = [entry("  padded text  ", 0, 30)];
    const [line] = buildCaptionLines(beats);
    expect(line!.text).toBe("padded text");
  });

  it("returns empty array for empty beat list", () => {
    expect(buildCaptionLines([])).toEqual([]);
  });
});
