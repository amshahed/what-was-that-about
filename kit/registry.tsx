// Tiny component registry: string id -> render function.
// Components register themselves on import of kit/library.

import type { ReactElement } from "react";

export type ComponentProps = Record<string, unknown>;
export type ComponentFn = (props: ComponentProps) => ReactElement;

const registry = new Map<string, ComponentFn>();

export function register(id: string, fn: ComponentFn): void {
  if (registry.has(id)) throw new Error(`component "${id}" is already registered`);
  registry.set(id, fn);
}

export function get(id: string): ComponentFn | undefined {
  return registry.get(id);
}

export function has(id: string): boolean {
  return registry.has(id);
}

export function ids(): string[] {
  return [...registry.keys()].sort();
}

/** Test-only: clear the registry. Not exported in normal use. */
export function _reset(): void {
  registry.clear();
}
