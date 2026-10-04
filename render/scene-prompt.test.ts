import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  authorKey,
  candidateSeeds,
  currentCandidates,
  composePrompt,
  deriveSeed,
  estimateTokens,
  parseBeatList,
  parseCharacter,
  parseStyle,
  parseStyleOverride,
  planScenes,
  renderKey,
  resolveStyle,
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
const RUNCITER: Character = {
  id: "runciter",
  name: "Glen Runciter",
  description: "Glen Runciter, a big gray-haired businessman",
  short: "Runciter, big gray-haired man",
};
const JOE: Character = {
  id: "joe-chip",
  name: "Joe Chip",
  description: "Joe Chip, a tired man",
  short: "Joe Chip, tired",
};

describe("composePrompt", () => {
  it("puts style first, then the character, the image, and the suffix", () => {
    expect(composePrompt(STYLE, [RUNCITER], "Runciter reads a book")).toBe(
      "Cartoon panel. Glen Runciter, a big gray-haired businessman. Runciter reads a book. No text.",
    );
  });

  it("leaves out the cast block when nobody is cast", () => {
    expect(composePrompt(STYLE, [], "an empty shelf.")).toBe(
      "Cartoon panel. an empty shelf. No text.",
    );
  });

  it("uses short descriptions and positions for 2–3 characters", () => {
    expect(composePrompt(STYLE, [RUNCITER, JOE], "they argue")).toBe(
      "Cartoon panel. On the left: Runciter, big gray-haired man. On the right: Joe Chip, tired. they argue. No text.",
    );
    expect(composePrompt(STYLE, [RUNCITER, JOE, RUNCITER], "x")).toContain(
      "In the middle: Joe Chip, tired.",
    );
  });
});

describe("seeds and keys", () => {
  it("derives a stable seed from the text, not the position", () => {
    expect(deriveSeed("Runciter reads", ["runciter"])).toBe(
      deriveSeed("Runciter reads", ["runciter"]),
    );
    expect(deriveSeed("Runciter reads", ["runciter"])).not.toBe(deriveSeed("Runciter reads", []));
    const s = deriveSeed("x", []);
    expect(Number.isInteger(s) && s >= 0 && s <= 2 ** 32 - 1).toBe(true);
  });

  it("keeps the old renderKey for looks without pixelate, and changes it with pixelate", () => {
    const old = createHash("sha256")
      .update(
        JSON.stringify({
          prompt: "p",
          seed: 1,
          width: 1344,
          height: 768,
          steps: 20,
          guidance: 3.5,
          workflowHash: "w",
        }),
      )
      .digest("hex");
    expect(renderKey("p", 1, STYLE, "w")).toBe(old);
    const px = { ...STYLE, pixelate: { factor: 4, colors: 32 } };
    expect(renderKey("p", 1, px, "w")).not.toBe(old);
    expect(renderKey("p", 1, px, "w")).not.toBe(
      renderKey("p", 1, { ...px, pixelate: { factor: 4, colors: 16 } }, "w"),
    );
  });

  it("authorKey follows image/cast/seed; renderKey follows prompt and settings", () => {
    expect(authorKey("a", [], 1)).not.toBe(authorKey("a", [], 2));
    expect(authorKey("a", [], 1)).toHaveLength(8);
    expect(renderKey("p", 1, STYLE, "w")).not.toBe(renderKey("p", 1, { ...STYLE, steps: 30 }, "w"));
    expect(renderKey("p", 1, STYLE, "w")).not.toBe(renderKey("p", 1, STYLE, "w2"));
  });

  it("makes readable file names", () => {
    expect(stillFileName("Joe Chip argues with his door, again!", "3fa91c2e")).toBe(
      "joe-chip-argues-with-his-3fa91c2e.png",
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
    scene: { image: "Runciter reads", cast: [runciter] }
  - narration: c
    scene: { image: "a shelf", seed: 5 }
`);
  const characters = new Map([["runciter", RUNCITER]]);
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
    const yaml = "id: runciter\nname: Runciter\ndescription: Runciter, a big man\n";
    expect(parseCharacter(yaml, "runciter").description).toBe("Runciter, a big man");
    expect(() => parseCharacter(yaml, "zeus")).toThrow('must equal the file name "zeus"');
    expect(() => parseCharacter(yaml + "pose: sitting\n", "runciter")).toThrow(
      'unknown field "pose"',
    );
    expect(() => parseCharacter("id: runciter\nname: R\n", "runciter")).toThrow('"description"');
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

  it("loads every committed look preset", () => {
    const dir = new URL("../shared/styles/", import.meta.url);
    const names = readdirSync(dir).filter((n) => n.endsWith(".yml"));
    expect(names).toEqual(
      expect.arrayContaining(["cartoon.yml", "retro-pixel.yml", "vintage.yml"]),
    );
    for (const n of names) {
      const style = parseStyle(readFileSync(new URL(n, dir), "utf8"), n);
      if (style.pixelate) {
        expect(style.width % style.pixelate.factor).toBe(0);
        expect(style.height % style.pixelate.factor).toBe(0);
      }
      const prompt = composePrompt(
        style,
        [RUNCITER],
        "Runciter talks to Ella; setting: a quiet moratorium",
        { caption: true },
      );
      expect(estimateTokens(prompt)).toBeLessThan(400);
    }
  });

  it("checks pixelate", () => {
    const base = "prefix: a\nsuffix: b\nwidth: 1344\nheight: 768\nsteps: 20\nguidance: 3.5\n";
    expect(parseStyle(base + "pixelate: { factor: 4, colors: 32 }\n").pixelate).toEqual({
      factor: 4,
      colors: 32,
    });
    expect(() => parseStyle(base + "pixelate: { factor: 3, colors: 32 }\n")).toThrow("factor");
    expect(() => parseStyle(base + "pixelate: { factor: 4, colors: 300 }\n")).toThrow("colors");
    expect(() => parseStyle(base + "pixelate: { factor: 4 }\n")).toThrow("colors");
    expect(() => parseStyle(base + "pixelate: { factor: 4, colors: 8, dither: x }\n")).toThrow(
      'unknown field "dither"',
    );
  });
});

describe("look presets and episode overrides", () => {
  const PRESET: SceneStyle = {
    ...STYLE,
    captionSpace: "Top empty.",
    pixelate: { factor: 4, colors: 32 },
  };

  it("uses the preset as it is when the episode changes nothing", () => {
    expect(resolveStyle(PRESET, parseStyleOverride("preset: retro-pixel\n"))).toEqual(PRESET);
  });

  it("replaces only the fields the episode sets; pixelate as a whole", () => {
    const o = parseStyleOverride(
      "preset: retro-pixel\nsuffix: Night.\npixelate: { factor: 8, colors: 16 }\n",
    );
    expect(o.preset).toBe("retro-pixel");
    expect(resolveStyle(PRESET, o)).toEqual({
      ...PRESET,
      suffix: "Night.",
      pixelate: { factor: 8, colors: 16 },
    });
  });

  it("removes optional fields with false or null", () => {
    const o = parseStyleOverride("preset: retro-pixel\npixelate: false\ncaptionSpace: null\n");
    const s = resolveStyle(PRESET, o);
    expect(s.pixelate).toBeUndefined();
    expect(s.captionSpace).toBeUndefined();
  });

  it("needs a complete file without a preset, and checks names and fields", () => {
    expect(() => resolveStyle(undefined, parseStyleOverride("suffix: x\n"))).toThrow('"prefix"');
    expect(() => parseStyleOverride("preset: Retro Pixel\n")).toThrow("preset name");
    expect(() => parseStyleOverride("preset: cartoon\nlook: x\n")).toThrow('unknown field "look"');
    expect(() => resolveStyle(PRESET, parseStyleOverride("preset: x\nsteps: 0\n"))).toThrow(
      '"steps"',
    );
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

describe("re-roll rounds", () => {
  const entry = (seed: number, extra: object = {}) => ({
    beat: 3,
    image: "img",
    cast: [],
    seed,
    seedSource: "derived" as const,
    renderKey: "",
    prompt: "p",
    width: 1344,
    height: 768,
    ...extra,
  });

  it("starts after the highest seed tried, so a second round gives new images", () => {
    const manifest = {
      version: 1 as const,
      episode: "ep",
      beats: {
        a: entry(10),
        b: entry(11, { candidateFor: 3, candidateNo: 1 }),
        c: entry(13, { candidateFor: 3, candidateNo: 3 }),
        other: { ...entry(99), beat: 4 },
      },
    };
    expect(candidateSeeds(manifest, 3, "img", 10, 3)).toEqual([14, 15, 16]);
    expect(candidateSeeds({ version: 1, episode: "ep", beats: {} }, 3, "img", 10, 2)).toEqual([
      11, 12,
    ]);
  });

  it("lists only the current round's candidates for the beat and image", () => {
    const manifest = {
      version: 1 as const,
      episode: "ep",
      beats: {
        a: entry(1),
        b: entry(2, { candidateFor: 3, candidateNo: 1 }),
        c: { ...entry(3, { candidateFor: 3, candidateNo: 2 }), image: "old" },
      },
    };
    expect(currentCandidates(manifest, 3, "img").map((e) => e.seed)).toEqual([2]);
  });
});

describe("caption space", () => {
  it("is added only for beats with a caption", () => {
    const style = { ...STYLE, captionSpace: "Keep the top clear." };
    expect(composePrompt(style, [], "x", { caption: true })).toBe(
      "Cartoon panel. x. No text. Keep the top clear.",
    );
    expect(composePrompt(style, [], "x")).toBe("Cartoon panel. x. No text.");
  });
});
