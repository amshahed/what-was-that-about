import { describe, it, expect } from "vitest";
import { setSceneSeed } from "./script-edit";

const BLOCK = `id: ep
tone: light
beats:
  # the opener
  - narration: hi
    scene:
      image: "Poseidon reads"   # keep this comment
      cast: [poseidon]
    tags: [ZOOM]
`;

describe("setSceneSeed", () => {
  it("adds a seed line under image and changes nothing else", () => {
    const out = setSceneSeed(BLOCK, 0, 42);
    expect(out).toBe(
      BLOCK.replace("# keep this comment\n", "# keep this comment\n      seed: 42\n"),
    );
  });

  it("replaces an existing seed in place", () => {
    const withSeed = setSceneSeed(BLOCK, 0, 42);
    expect(setSceneSeed(withSeed, 0, 7)).toBe(withSeed.replace("seed: 42", "seed: 7"));
  });

  it("handles flow-style scenes", () => {
    const flow = `id: ep\ntone: light\nbeats:\n  - narration: hi\n    scene: { image: "x", cast: [poseidon] }\n`;
    expect(setSceneSeed(flow, 0, 5)).toContain(`scene: { image: "x", seed: 5, cast: [poseidon] }`);
  });

  it("keeps CRLF line endings", () => {
    const crlf = BLOCK.replace(/\n/g, "\r\n");
    const out = setSceneSeed(crlf, 0, 1);
    expect(out).toContain("\r\n      seed: 1\r\n");
    expect(out.replace(/\r\n/g, "")).not.toContain("\n");
  });

  it("fails on a beat without an image", () => {
    const kit = `id: ep\ntone: light\nbeats:\n  - narration: hi\n    scene:\n      layers: []\n`;
    expect(() => setSceneSeed(kit, 0, 1)).toThrow("no image field");
  });
});
