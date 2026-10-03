import { describe, it, expect } from "vitest";
import { lowCoverageWarning, spellingPrompt } from "./spelling-prompt";

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

describe("lowCoverageWarning", () => {
  it("is silent when the transcript covers most of the script", () => {
    expect(lowCoverageWarning(90, 100)).toBeUndefined();
    expect(lowCoverageWarning(5, 0)).toBeUndefined();
  });

  it("warns when the transcript has far fewer words", () => {
    expect(lowCoverageWarning(2, 100)).toMatch(/found 2 words, but the script has 100/);
  });
});
