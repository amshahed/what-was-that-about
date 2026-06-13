import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseScript, ScriptParseError } from "./script-parser";

const VALID = `
id: sample
tone: balanced
beats:
  - narration: |
      Hello world.
    scene:
      layers:
        - component: bg:office-wall
        - component: actor:poseidon
          props: { x: 800, y: 400, pose: tie, tie: true }
      caption: "Just a 3pm sync."
    tags: [HOLD, ZOOM, "SFX:record-scratch", "SFX:boing"]
  - narration: "Another beat."
    scene:
      layers:
        - component: bg:sea-glory
`;

describe("parseScript — happy path", () => {
  it("parses a complete script into a typed Script", () => {
    const s = parseScript(VALID);
    expect(s.id).toBe("sample");
    expect(s.tone).toBe("balanced");
    expect(s.beats).toHaveLength(2);

    const b0 = s.beats[0]!;
    expect(b0.narration).toContain("Hello world.");
    expect(b0.scene.layers).toHaveLength(2);
    expect(b0.scene.caption).toBe("Just a 3pm sync.");
    expect(b0.hold).toBe(true);
    expect(b0.zoom).toBe(true);
    expect(b0.sfx).toEqual(["record-scratch", "boing"]);

    const b1 = s.beats[1]!;
    expect(b1.hold).toBe(false);
    expect(b1.zoom).toBe(false);
    expect(b1.sfx).toEqual([]);
    expect(b1.scene.caption).toBeUndefined();
  });

  it("preserves layer order", () => {
    const s = parseScript(VALID);
    expect(s.beats[0]!.scene.layers.map((l) => l.component)).toEqual([
      "bg:office-wall",
      "actor:poseidon",
    ]);
  });

  it("defaults empty props to {}", () => {
    const s = parseScript(VALID);
    expect(s.beats[1]!.scene.layers[0]!.props).toEqual({});
  });
});

describe("parseScript — errors", () => {
  const expectThrow = (yaml: string, pathFragment: string, msgFragment: string) => {
    let err: unknown;
    try {
      parseScript(yaml);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(ScriptParseError);
    const e = err as ScriptParseError;
    expect(e.path).toContain(pathFragment);
    expect(e.message).toContain(msgFragment);
  };

  it("rejects invalid YAML", () => {
    // Unclosed flow mapping — yaml lib raises a parse error.
    expectThrow("id: x\ntone: light\nbeats: [{ unterminated", "$", "invalid YAML");
  });

  it("requires id", () => {
    expectThrow("tone: balanced\nbeats: [{narration: x, scene: {layers: [{component: bg:office-wall}]}}]", "$.id", "missing");
  });

  it("rejects unknown tone", () => {
    expectThrow(
      "id: x\ntone: spicy\nbeats: [{narration: x, scene: {layers: [{component: bg:office-wall}]}}]",
      "$.tone",
      "unknown tone",
    );
  });

  it("requires beats array", () => {
    expectThrow("id: x\ntone: light\nbeats: []", "$.beats", "at least one beat");
  });

  it("requires beat.narration non-empty", () => {
    expectThrow(
      "id: x\ntone: light\nbeats: [{narration: '   ', scene: {layers: [{component: bg:office-wall}]}}]",
      "$.beats[0].narration",
      "non-empty",
    );
  });

  it("rejects scene with no layers", () => {
    expectThrow(
      "id: x\ntone: light\nbeats: [{narration: x, scene: {layers: []}}]",
      "$.beats[0].scene.layers",
      "at least one layer",
    );
  });

  it("rejects unknown component id with list of registered ids", () => {
    let err: unknown;
    try {
      parseScript(
        "id: x\ntone: light\nbeats: [{narration: x, scene: {layers: [{component: actor:nobody}]}}]",
      );
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(ScriptParseError);
    const e = err as ScriptParseError;
    expect(e.message).toContain("unknown component");
    expect(e.message).toContain("registered:");
    expect(e.message).toContain("actor:poseidon"); // proves library is loaded
  });

  it("rejects unknown tag", () => {
    expectThrow(
      "id: x\ntone: light\nbeats: [{narration: x, scene: {layers: [{component: bg:office-wall}]}, tags: [SPIN]}]",
      "$.beats[0].tags[0]",
      "unknown tag",
    );
  });

  it("rejects SFX tag without name", () => {
    expectThrow(
      'id: x\ntone: light\nbeats: [{narration: x, scene: {layers: [{component: bg:office-wall}]}, tags: ["SFX:"]}]',
      "$.beats[0].tags[0]",
      "SFX tag missing name",
    );
  });

  it("rejects a manual caption layer (composeScene auto-appends from scene.caption)", () => {
    expectThrow(
      "id: x\ntone: light\nbeats: [{narration: x, scene: {layers: [{component: bg:office-wall}, {component: caption, props: {text: hi}}]}}]",
      "$.beats[0].scene.layers[1].component",
      "top-level",
    );
  });

  it("rejects empty caption (would be silently dropped by composeScene)", () => {
    expectThrow(
      'id: x\ntone: light\nbeats: [{narration: x, scene: {layers: [{component: bg:office-wall}], caption: "   "}}]',
      "$.beats[0].scene.caption",
      "non-empty",
    );
  });
});

describe("parseScript — sample episode", () => {
  it("parses episodes/sample/script.yml end-to-end (docs match parser)", () => {
    const samplePath = fileURLToPath(new URL("../episodes/sample/script.yml", import.meta.url));
    const script = parseScript(readFileSync(samplePath, "utf8"));
    expect(script.id).toBe("sample-episode");
    expect(script.beats).toHaveLength(3);
    expect(script.beats[0]!.hold).toBe(true);
    expect(script.beats[1]!.zoom).toBe(true);
    expect(script.beats[2]!.sfx).toEqual(["record-scratch"]);
  });
});
