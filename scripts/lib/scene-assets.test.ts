import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadCharacters, loadWorkflow, styleFile, STYLE_FILE } from "./scene-assets";

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

  it("uses the episode style when it has one", () => {
    expect(styleFile(episode)).toBe(STYLE_FILE);
    writeFileSync(path.join(episode, "style.yml"), "prefix: x\n");
    expect(styleFile(episode)).toBe(path.join(episode, "style.yml"));
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
