import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describeLook, listPresets, loadCharacters, loadLook, loadWorkflow } from "./scene-assets";

const char = (id: string) => `id: ${id}\nname: ${id}\ndescription: ${id}, a person\n`;

describe("per-episode characters and style", () => {
  let root: string;
  let shared: string;
  let episode: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "wwta-"));
    shared = path.join(root, "shared");
    episode = path.join(root, "episodes", "ubik");
    mkdirSync(shared, { recursive: true });
    mkdirSync(path.join(episode, "characters"), { recursive: true });
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("merges channel and episode characters", () => {
    writeFileSync(path.join(shared, "narrator.yml"), char("narrator"));
    writeFileSync(path.join(episode, "characters", "joe-chip.yml"), char("joe-chip"));
    expect([...loadCharacters(episode, shared).keys()].sort()).toEqual(["joe-chip", "narrator"]);
    expect([...loadCharacters(undefined, shared).keys()]).toEqual(["narrator"]);
  });

  it("rejects the same id in both places", () => {
    writeFileSync(path.join(shared, "joe-chip.yml"), char("joe-chip"));
    writeFileSync(path.join(episode, "characters", "joe-chip.yml"), char("joe-chip"));
    expect(() => loadCharacters(episode, shared)).toThrow(/"joe-chip" is defined twice/);
  });

  describe("looks", () => {
    const full = (prefix: string) =>
      `prefix: ${prefix}\nsuffix: s\nwidth: 1344\nheight: 768\nsteps: 20\nguidance: 3.5\n`;
    let styles: string;
    beforeEach(() => {
      styles = path.join(shared, "styles");
      mkdirSync(styles);
      writeFileSync(path.join(styles, "cartoon.yml"), full("cartoon"));
      writeFileSync(
        path.join(styles, "retro-pixel.yml"),
        full("pixel") + "pixelate: { factor: 4, colors: 32 }\n",
      );
    });

    it("uses the cartoon preset when the episode has no style.yml", () => {
      const look = loadLook(episode, styles);
      expect(look.name).toBe("cartoon");
      expect(look.file).toBeUndefined();
      expect(look.style.prefix).toBe("cartoon");
      expect(describeLook(look)).toBe("cartoon (default)");
      expect(listPresets(styles)).toEqual(["cartoon", "retro-pixel"]);
    });

    it("applies the episode's preset and changes", () => {
      writeFileSync(path.join(episode, "style.yml"), "preset: retro-pixel\nsuffix: night\n");
      const look = loadLook(episode, styles);
      expect(look.name).toBe("retro-pixel");
      expect(look.style).toMatchObject({
        prefix: "pixel",
        suffix: "night",
        pixelate: { factor: 4, colors: 32 },
      });
      expect(describeLook(look)).toMatch(/^retro-pixel \(.*style\.yml\) · pixelate 4×, 32 colors$/);
    });

    it("names the presets there are when the preset is unknown", () => {
      writeFileSync(path.join(episode, "style.yml"), "preset: retro-pxl\n");
      expect(() => loadLook(episode, styles)).toThrow(
        /unknown preset "retro-pxl" \(available: cartoon, retro-pixel\)/,
      );
    });

    it("takes a complete episode style without a preset as a custom look", () => {
      writeFileSync(path.join(episode, "style.yml"), full("mine"));
      expect(loadLook(episode, styles)).toMatchObject({
        name: "custom",
        style: { prefix: "mine" },
      });
    });

    it("does not let a preset name another preset", () => {
      writeFileSync(path.join(styles, "loop.yml"), "preset: cartoon\n");
      writeFileSync(path.join(episode, "style.yml"), "preset: loop\n");
      expect(() => loadLook(episode, styles)).toThrow('a preset cannot use "preset"');
    });
  });
});

describe("loadWorkflow", () => {
  it("ignores the placeholder prompt text in the hash and does not change the template", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "wwta-wf-"));
    const wf = (text: string) =>
      JSON.stringify({ "4": { class_type: "CLIPTextEncode", inputs: { text, clip: ["2", 0] } } });
    writeFileSync(path.join(dir, "a.json"), wf("one"));
    writeFileSync(path.join(dir, "b.json"), wf("two"));
    const a = loadWorkflow(path.join(dir, "a.json"));
    expect(a.hash).toBe(loadWorkflow(path.join(dir, "b.json")).hash);
    expect((a.template as Record<string, { inputs: { text: string } }>)["4"]!.inputs.text).toBe(
      "one",
    );
    rmSync(dir, { recursive: true, force: true });
  });
});
