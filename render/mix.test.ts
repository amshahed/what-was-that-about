import { describe, it, expect } from "vitest";
import {
  buildSfxEvents,
  musicVolumeAtFrame,
  MUSIC_VOLUME_FULL,
  MUSIC_VOLUME_DUCK,
  SFX_FILES,
  TONE_MUSIC,
} from "./mix";
import type { BeatEntry } from "./timeline";

function beat(
  narration: string,
  startFrame: number,
  durationFrames: number,
  sfx: string[] = [],
): BeatEntry {
  return { narration, startFrame, durationFrames, sfx, scene: { layers: [] }, zoom: false, hold: false };
}

describe("buildSfxEvents", () => {
  it("maps sfx names to events using the resolve callback", () => {
    const beats = [
      beat("first", 0, 30, ["record scratch"]),
      beat("second", 30, 30, ["ding"]),
    ];
    const resolve = (name: string) => SFX_FILES[name] ? `/sfx/${SFX_FILES[name]}` : null;
    const events = buildSfxEvents(beats, resolve);
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ startFrame: 0, src: "/sfx/record-scratch.wav" });
    expect(events[1]).toEqual({ startFrame: 30, src: "/sfx/ding.wav" });
  });

  it("skips unknown sfx names (resolve returns null)", () => {
    const beats = [beat("text", 0, 30, ["unknown-sound"])];
    const events = buildSfxEvents(beats, () => null);
    expect(events).toHaveLength(0);
  });

  it("emits multiple events for a single beat with multiple sfx tags", () => {
    const beats = [beat("text", 15, 30, ["boing", "whoosh"])];
    const resolve = (name: string) => SFX_FILES[name] ? `/sfx/${SFX_FILES[name]}` : null;
    const events = buildSfxEvents(beats, resolve);
    expect(events).toHaveLength(2);
    expect(events[0]!.startFrame).toBe(15);
    expect(events[1]!.startFrame).toBe(15);
  });

  it("returns empty array for beats with no sfx", () => {
    const beats = [beat("no sfx", 0, 60)];
    const events = buildSfxEvents(beats, () => "/sfx/whatever.wav");
    expect(events).toHaveLength(0);
  });
});

describe("musicVolumeAtFrame", () => {
  const beats = [
    beat("narration", 10, 20),
    beat("", 40, 10),    // empty narration — treated as non-narration for ducking
    beat("more", 60, 15),
  ];

  it("returns full volume outside narration beats", () => {
    expect(musicVolumeAtFrame(0, beats)).toBe(MUSIC_VOLUME_FULL);
    expect(musicVolumeAtFrame(9, beats)).toBe(MUSIC_VOLUME_FULL);
    expect(musicVolumeAtFrame(30, beats)).toBe(MUSIC_VOLUME_FULL);
  });

  it("returns duck volume during narration beats", () => {
    expect(musicVolumeAtFrame(10, beats)).toBe(MUSIC_VOLUME_DUCK);
    expect(musicVolumeAtFrame(15, beats)).toBe(MUSIC_VOLUME_DUCK);
    expect(musicVolumeAtFrame(29, beats)).toBe(MUSIC_VOLUME_DUCK);
  });

  it("does not duck on empty-narration beats", () => {
    // beat at frame 40-49 has empty narration — no ducking
    expect(musicVolumeAtFrame(40, beats)).toBe(MUSIC_VOLUME_FULL);
    expect(musicVolumeAtFrame(49, beats)).toBe(MUSIC_VOLUME_FULL);
  });

  it("ducks again when next narration beat starts", () => {
    expect(musicVolumeAtFrame(60, beats)).toBe(MUSIC_VOLUME_DUCK);
    expect(musicVolumeAtFrame(74, beats)).toBe(MUSIC_VOLUME_DUCK);
    expect(musicVolumeAtFrame(75, beats)).toBe(MUSIC_VOLUME_FULL);
  });
});

describe("TONE_MUSIC", () => {
  it("covers all tone values", () => {
    const tones = ["light", "balanced", "heavy", "balanced-heavy"] as const;
    for (const tone of tones) {
      expect(TONE_MUSIC[tone]).toMatch(/\.mp3$/);
    }
  });
});
