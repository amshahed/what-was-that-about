import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { composeScene, UnknownComponentError, type SceneSpec } from "./scene";
import { heroFontSize } from "./primitives/TextHero";
import "./library";

const officeSpec: SceneSpec = {
  layers: [
    { component: "bg:office-wall" },
    { component: "prop:desk", props: { x: 600, y: 620, w: 720, h: 200 } },
  ],
  caption: "test",
};

describe("composeScene", () => {
  it("is deterministic across renders of the same spec", () => {
    const a = renderToStaticMarkup(composeScene(officeSpec));
    const b = renderToStaticMarkup(composeScene(officeSpec));
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(100);
  });

  it("throws on unknown component id with a helpful message", () => {
    const bad: SceneSpec = { layers: [{ component: "actor:nobody" }] };
    expect(() => renderToStaticMarkup(composeScene(bad))).toThrow(UnknownComponentError);
    expect(() => renderToStaticMarkup(composeScene(bad))).toThrow(/Known:/);
  });

  it("appends a caption layer when spec.caption is set", () => {
    const withCap = renderToStaticMarkup(composeScene(officeSpec));
    expect(withCap).toContain("test");
  });
});

describe("text:hero", () => {
  it("renders the word, the optional sub line and the colour", () => {
    const html = renderToStaticMarkup(
      composeScene({
        layers: [
          { component: "bg:paper" },
          {
            component: "text:hero",
            props: { text: "HALF-LIFE", sub: "(it is not a game)", color: "red" },
          },
        ],
      }),
    );
    expect(html).toContain("HALF-LIFE");
    expect(html).toContain("(it is not a game)");
    expect(html).toContain("#b23b3b");
  });

  it("shrinks long phrases to fit", () => {
    expect(heroFontSize("?")).toBe(260);
    expect(heroFontSize("Safe when used as directed")).toBeLessThan(120);
    expect(heroFontSize("x".repeat(200))).toBe(72);
  });
});
