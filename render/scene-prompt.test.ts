import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  authorKey,
  composePrompt,
  deriveSeed,
  estimateTokens,
  parseBeatList,
  parseCharacter,
  parseStyle,
  planScenes,
  renderKey,
  stillFileName,
  type Character,
  type SceneStyle,
} from "./scene-prompt";
import { parseScript } from "../kit/script-parser";

const STYLE: SceneStyle = {
  prefix: "Cartoon panel",
  suffix: "No text.",
  width: 1344,
  height: 768,
  steps: 20,
  guidance: 3.5,
};
const POSEIDON: Character = {
  id: "poseidon",
  name: "Poseidon",
  description: "Poseidon, a stocky god",
  short: "Poseidon, stocky",
};
const JOE: Character = {
  id: "joe-chip",
  name: "Joe Chip",
  description: "Joe Chip, a tired man",
  short: "Joe Chip, tired",
};

describe("composePrompt", () => {
  it("puts style first, then the character, the image, and the suffix", () => {
    expect(composePrompt(STYLE, [POSEIDON], "Poseidon reads a book")).toBe(
      "Cartoon panel. Poseidon, a stocky god. Poseidon reads a book. No text.",
    );
  });

  it("leaves out the cast block when nobody is cast", () => {
    expect(composePrompt(STYLE, [], "an empty shelf.")).toBe(
      "Cartoon panel. an empty shelf. No text.",
    );
  });

  it("uses short descriptions and positions for 2–3 characters", () => {
    expect(composePrompt(STYLE, [POSEIDON, JOE], "they argue")).toBe(
      "Cartoon panel. On the left: Poseidon, stocky. On the right: Joe Chip, tired. they argue. No text.",
    );
    expect(composePrompt(STYLE, [POSEIDON, JOE, POSEIDON], "x")).toContain(
      "In the middle: Joe Chip, tired.",
    );
  });
});

describe("seeds and keys", () => {
  it("derives a stable seed from the text, not the position", () => {
    expect(deriveSeed("Poseidon reads", ["poseidon"])).toBe(
      deriveSeed("Poseidon reads", ["poseidon"]),
    );
    expect(deriveSeed("Poseidon reads", ["poseidon"])).not.toBe(deriveSeed("Poseidon reads", []));
    const s = deriveSeed("x", []);
    expect(Number.isInteger(s) && s >= 0 && s <= 2 ** 32 - 1).toBe(true);
  });

  it("authorKey follows image/cast/seed; renderKey follows prompt and settings", () => {
    expect(authorKey("a", [], 1)).not.toBe(authorKey("a", [], 2));
    expect(authorKey("a", [], 1)).toHaveLength(8);
    expect(renderKey("p", 1, STYLE, "w")).not.toBe(renderKey("p", 1, { ...STYLE, steps: 30 }, "w"));
    expect(renderKey("p", 1, STYLE, "w")).not.toBe(renderKey("p", 1, STYLE, "w2"));
  });

  it("makes readable file names", () => {
    expect(stillFileName("Poseidon facepalming at a desk, again!", "3fa91c2e")).toBe(
      "poseidon-facepalming-at-a-desk-3fa91c2e.png",
    );
    expect(stillFileName('"…" ???', "00000000")).toBe("scene-00000000.png");
    expect(stillFileName("Café naïve résumé", "k")).toBe("cafe-naive-resume-k.png");
  });

  it("estimates tokens", () => {
    expect(estimateTokens("one two three four five")).toBe(7);
  });
});

describe("planScenes", () => {
  const script = parseScript(`id: ep
tone: light
beats:
  - narration: a
    scene: { layers: [{ component: bg:office-wall }] }
  - narration: b
    scene: { image: "Poseidon reads", cast: [poseidon] }
  - narration: c
    scene: { image: "a shelf", seed: 5 }
`);
  const characters = new Map([["poseidon", POSEIDON]]);
  const base = { characters, style: STYLE, workflowHash: "w", existing: new Set<string>() };

  it("plans only AI beats, with derived and pinned seeds", () => {
    const plan = planScenes(script, base);
    expect(plan.stills.map((s) => [s.beat, s.seedSource, s.status])).toEqual([
      [1, "derived", "missing"],
      [2, "pinned", "missing"],
    ]);
    expect(plan.stills[1]!.seed).toBe(5);
  });

  it("is fresh when the file exists and the manifest key matches, stale otherwise", () => {
    const first = planScenes(script, base).stills[1]!;
    const existing = new Set([first.file, "old-take-12345678.png"]);
    const manifest = {
      version: 1 as const,
      episode: "ep",
      beats: {
        [first.file]: {
          beat: 2,
          image: "a shelf",
          cast: [],
          seed: 5,
          seedSource: "pinned" as const,
          renderKey: first.renderKey,
          prompt: first.prompt,
          width: 1344,
          height: 768,
        },
      },
    };
    const fresh = planScenes(script, { ...base, existing, manifest });
    expect(fresh.stills[1]!.status).toBe("fresh");
    expect(fresh.orphans).toEqual(["old-take-12345678.png"]);
    const stale = planScenes(script, {
      ...base,
      existing,
      manifest,
      style: { ...STYLE, prefix: "New look" },
    });
    expect(stale.stills[1]!.status).toBe("stale");
    expect(stale.stills[1]!.file).toBe(first.file); // style edits keep the file name
  });

  it("keeps the same file when a beat is inserted before it", () => {
    const moved = parseScript(`id: ep
tone: light
beats:
  - narration: new
    scene: { image: "something new" }
  - narration: c
    scene: { image: "a shelf", seed: 5 }
`);
    const before = planScenes(script, base).stills.find((s) => s.scene.image === "a shelf")!;
    const after = planScenes(moved, base).stills.find((s) => s.scene.image === "a shelf")!;
    expect(after.file).toBe(before.file);
    expect(after.beat).toBe(1);
  });
});

describe("character and style files", () => {
  it("parses a character and checks id against the file name", () => {
    const yaml = "id: poseidon\nname: Poseidon\ndescription: Poseidon, a god\n";
    expect(parseCharacter(yaml, "poseidon").description).toBe("Poseidon, a god");
    expect(() => parseCharacter(yaml, "zeus")).toThrow('must equal the file name "zeus"');
    expect(() => parseCharacter(yaml + "pose: sitting\n", "poseidon")).toThrow(
      'unknown field "pose"',
    );
    expect(() => parseCharacter("id: poseidon\nname: P\n", "poseidon")).toThrow('"description"');
  });

  it("parses the style and rejects sizes that are not multiples of 64", () => {
    const yaml = "prefix: a\nsuffix: b\nwidth: 1344\nheight: 768\nsteps: 20\nguidance: 3.5\n";
    expect(parseStyle(yaml)).toEqual({
      prefix: "a",
      suffix: "b",
      width: 1344,
      height: 768,
      steps: 20,
      guidance: 3.5,
    });
    expect(() => parseStyle(yaml.replace("768", "770"))).toThrow("multiple of 64");
  });

  it("loads the committed shared/ files", () => {
    const style = parseStyle(readFileSync(new URL("../shared/style.yml", import.meta.url), "utf8"));
    const poseidon = parseCharacter(
      readFileSync(new URL("../shared/characters/poseidon.yml", import.meta.url), "utf8"),
      "poseidon",
    );
    expect(style.width % 64).toBe(0);
    expect(poseidon.description).toMatch(/^Poseidon, a stocky barrel-chested/);
    expect(
      estimateTokens(
        composePrompt(style, [poseidon], "Poseidon reads a long book; setting: a cave office"),
      ),
    ).toBeLessThan(400);
  });
});

describe("parseBeatList", () => {
  it("expands ranges and sorts", () => {
    expect(parseBeatList("7, 2,5-6")).toEqual([2, 5, 6, 7]);
  });
  it.each(["a", "5-2", "1,,x"])("rejects %s", (spec) => {
    expect(() => parseBeatList(spec)).toThrow();
  });
});
