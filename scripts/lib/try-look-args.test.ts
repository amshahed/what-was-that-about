import { describe, it, expect } from "vitest";
import { parseTryLookArgs } from "./try-look-args";

describe("parseTryLookArgs", () => {
  it("takes the slug, the looks (repeats removed) and --beats", () => {
    expect(
      parseTryLookArgs(["ubik", "cartoon", "retro-pixel", "cartoon", "--beats", "0,3-4"]),
    ).toEqual({ slug: "ubik", looks: ["cartoon", "retro-pixel"], beats: [0, 3, 4] });
    expect(parseTryLookArgs(["ubik", "episode"]).beats).toBeUndefined();
  });

  it("needs a slug and at least one look", () => {
    expect(() => parseTryLookArgs(["ubik"])).toThrow("usage");
    expect(() => parseTryLookArgs([])).toThrow("usage");
  });

  it("rejects unknown options and a missing beat list", () => {
    expect(() => parseTryLookArgs(["ubik", "cartoon", "--force"])).toThrow(
      'unknown option "--force"',
    );
    expect(() => parseTryLookArgs(["ubik", "cartoon", "--beats"])).toThrow("--beats needs a list");
  });

  it("explains when npm took --beats for itself", () => {
    expect(() =>
      parseTryLookArgs(["ubik", "cartoon", "0,3"], { npm_config_beats: "true" }),
    ).toThrow("Put -- before it");
  });
});
