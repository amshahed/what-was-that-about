import { describe, it, expect } from "vitest";
import rough from "roughjs";

// The whole recurring-character premise rests on seeded determinism:
// the same shape + seed must always produce identical geometry.
describe("rough determinism", () => {
  it("same seed yields identical path geometry", () => {
    const gen = rough.generator();
    const a = gen.toPaths(gen.rectangle(0, 0, 100, 50, { seed: 42 }));
    const b = gen.toPaths(gen.rectangle(0, 0, 100, 50, { seed: 42 }));
    expect(a.map((p) => p.d)).toEqual(b.map((p) => p.d));
  });

  it("different seeds yield different geometry", () => {
    const gen = rough.generator();
    const a = gen.toPaths(gen.rectangle(0, 0, 100, 50, { seed: 1 }));
    const b = gen.toPaths(gen.rectangle(0, 0, 100, 50, { seed: 2 }));
    expect(a.map((p) => p.d)).not.toEqual(b.map((p) => p.d));
  });
});
