import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { parseAlignmentResponse, alignAudio } from "./align";

describe("parseAlignmentResponse", () => {
  it("maps words to WordTimestamp shape", () => {
    const result = parseAlignmentResponse({
      duration: 5.2,
      words: [
        { word: "Hello", start: 0.0, end: 0.3 },
        { word: " world", start: 0.4, end: 0.8 },
      ],
    });
    expect(result.duration).toBe(5.2);
    expect(result.words).toHaveLength(2);
    expect(result.words[0]).toEqual({ word: "Hello", start: 0.0, end: 0.3 });
    // Leading-space tokens preserved as-is (Whisper's behaviour)
    expect(result.words[1]).toEqual({ word: " world", start: 0.4, end: 0.8 });
  });

  it("handles missing words array", () => {
    const result = parseAlignmentResponse({ duration: 2.0 });
    expect(result.words).toEqual([]);
    expect(result.duration).toBe(2.0);
  });

  it("handles empty words array", () => {
    const result = parseAlignmentResponse({ duration: 0.5, words: [] });
    expect(result.words).toEqual([]);
  });
});

describe("alignAudio — env guard", () => {
  const original = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    if (original !== undefined) process.env.OPENAI_API_KEY = original;
  });

  it("throws a clear error when OPENAI_API_KEY is absent", async () => {
    await expect(alignAudio("fake.wav")).rejects.toThrow("OPENAI_API_KEY is not set");
  });
});
