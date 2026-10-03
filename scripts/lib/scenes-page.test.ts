import { describe, it, expect } from "vitest";
import { renderScenesPage } from "./scenes-page";
import { parseScript } from "../../kit/script-parser";
import { planScenes } from "../../render/scene-prompt";

const script = parseScript(`id: ep
tone: light
beats:
  - narration: "A <b>kit</b> beat"
    scene: { layers: [{ component: bg:office-wall }], caption: "Big words" }
  - narration: An AI beat
    scene: { image: "a shelf & a can" }
`);
const style = { prefix: "p", suffix: "s", width: 1344, height: 768, steps: 20, guidance: 3.5 };
const plan = planScenes(script, {
  characters: new Map(),
  style,
  workflowHash: "w",
  existing: new Set(),
});

describe("renderScenesPage", () => {
  it("shows every beat in order with escaped text", () => {
    const html = renderScenesPage({
      slug: "ep",
      script,
      plan,
      manifest: { version: 1, episode: "ep", beats: {} },
      fresh: new Set(),
      scenesHref: "../scenes",
    });
    expect(html).toContain("code-kit scene");
    expect(html).toContain("Big words");
    expect(html).toContain("A &lt;b&gt;kit&lt;/b&gt; beat");
    expect(html).toContain("not generated yet");
    expect(html.indexOf("<b>0</b>")).toBeLessThan(html.indexOf("<b>1</b>"));
  });

  it("shows the image, NEW badge and re-roll candidates with the pick command", () => {
    const still = plan.stills[0]!;
    const existing = new Set([still.file, "cand-1.png"]);
    const plan2 = planScenes(script, { characters: new Map(), style, workflowHash: "w", existing });
    const manifest = {
      version: 1 as const,
      episode: "ep",
      beats: {
        "cand-1.png": {
          beat: 1,
          image: "a shelf & a can",
          cast: [],
          seed: 2,
          seedSource: "derived" as const,
          renderKey: "",
          prompt: "p",
          width: 1344,
          height: 768,
          candidateFor: 1,
          candidateNo: 1,
        },
      },
    };
    const html = renderScenesPage({
      slug: "ep",
      script,
      plan: plan2,
      manifest,
      fresh: new Set([still.file]),
      scenesHref: "../scenes",
    });
    expect(html).toContain(`src="../scenes/${still.file}"`);
    expect(html).toContain("NEW");
    expect(html).toContain(`src="../scenes/cand-1.png"`);
    expect(html).toContain("--pick 1=N");
  });
});
