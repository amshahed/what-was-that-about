// SceneSpec: data-only description of one shot.
// composeScene() turns it into rendered SVG elements via the registry.
// The script parser (#5) and stills batch (#6) speak this format.

import type { ReactElement } from "react";
import { get, has, ids } from "./registry";
import "./library"; // side-effect: guarantees every component is registered before composeScene is called

export interface Layer {
  /** Registered component id, e.g. "bg:cave-office", "actor:poseidon", "prop:trident". */
  component: string;
  /** Untyped props passed to the component's adapter; the adapter validates. */
  props?: Record<string, unknown>;
}

export interface SceneSpec {
  /** Optional id for debugging / registration. */
  id?: string;
  /** Layers, painted back-to-front. */
  layers: Layer[];
  /** Convenience: appends a `caption` layer with `text` if set. */
  caption?: string;
}

export class UnknownComponentError extends Error {
  constructor(id: string) {
    super(`Unknown component "${id}". Known: ${ids().join(", ")}`);
    this.name = "UnknownComponentError";
  }
}

export function composeScene(spec: SceneSpec): ReactElement {
  const layers: Layer[] = [...spec.layers];
  if (spec.caption) layers.push({ component: "caption", props: { text: spec.caption } });
  return (
    <>
      {layers.map((l, i) => {
        if (!has(l.component)) throw new UnknownComponentError(l.component);
        const fn = get(l.component)!;
        return <g key={`${i}-${l.component}`}>{fn(l.props ?? {})}</g>;
      })}
    </>
  );
}
