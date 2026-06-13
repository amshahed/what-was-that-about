import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { composeScene, UnknownComponentError, type SceneSpec } from "./scene";
import "./library";

const officeSpec: SceneSpec = {
  layers: [
    { component: "bg:cave-office" },
    { component: "actor:poseidon", props: { x: 760, y: 430, pose: "sitting" } },
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

  it("renders the same actor identically across scenes (recurring-character invariant)", () => {
    const sceneA: SceneSpec = {
      layers: [{ component: "actor:poseidon", props: { x: 500, y: 400, pose: "glory" } }],
    };
    const sceneB: SceneSpec = {
      layers: [{ component: "actor:poseidon", props: { x: 500, y: 400, pose: "glory" } }],
    };
    expect(renderToStaticMarkup(composeScene(sceneA))).toEqual(
      renderToStaticMarkup(composeScene(sceneB)),
    );
  });

  it("appends a caption layer when spec.caption is set", () => {
    const withCap = renderToStaticMarkup(composeScene(officeSpec));
    expect(withCap).toContain("test");
  });
});
