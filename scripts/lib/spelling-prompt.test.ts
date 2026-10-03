import { describe, it, expect } from "vitest";
import { spellingPrompt } from "./spelling-prompt";

const SCRIPT = `id: x
tone: heavy
beats:
  - narration: Joe Chip works for Runciter.
    scene: { layers: [{ component: bg:office-wall }] }
  - narration: Then there is Ubik.
    scene: { layers: [{ component: bg:office-wall }] }
`;

describe("spellingPrompt", () => {
  it("joins the opening narration across beats", () => {
    expect(spellingPrompt(SCRIPT)).toBe("Joe Chip works for Runciter. Then there is Ubik.");
  });

  it("caps the number of words", () => {
    expect(spellingPrompt(SCRIPT, 3)).toBe("Joe Chip works");
  });

  it("returns undefined for a script that does not parse", () => {
    expect(spellingPrompt("not: [valid")).toBeUndefined();
  });
});
