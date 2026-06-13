// Parse a YAML episode script into a typed Script. The parser is strict about
// structure and component-id existence; per-component prop validation is left to
// the registered adapters (which use kit/params.ts) at render time, so prop
// schemas have a single source of truth.

import { parse as parseYaml } from "yaml";
import { has, ids } from "./registry";
import "./library"; // populate the registry before component-id validation
import type { Layer, SceneSpec } from "./scene";
import type { Beat, Script, Tone } from "./script";

export class ScriptParseError extends Error {
  constructor(
    public readonly path: string,
    message: string,
  ) {
    super(`${path}: ${message}`);
    this.name = "ScriptParseError";
  }
}

const TONES: readonly Tone[] = ["light", "balanced", "heavy", "balanced-heavy"] as const;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function req<T>(v: T | undefined, path: string, what: string): T {
  if (v === undefined || v === null) throw new ScriptParseError(path, `missing ${what}`);
  return v;
}

function reqString(v: unknown, path: string, what: string): string {
  const s = req(v, path, what);
  if (typeof s !== "string") throw new ScriptParseError(path, `${what} must be a string`);
  if (s.trim() === "") throw new ScriptParseError(path, `${what} must be non-empty`);
  return s;
}

function reqArray(v: unknown, path: string, what: string): unknown[] {
  const a = req(v, path, what);
  if (!Array.isArray(a)) throw new ScriptParseError(path, `${what} must be an array`);
  return a;
}

function reqObject(v: unknown, path: string, what: string): Record<string, unknown> {
  const o = req(v, path, what);
  if (!isPlainObject(o)) throw new ScriptParseError(path, `${what} must be an object`);
  return o;
}

function parseTone(v: unknown, path: string): Tone {
  const s = reqString(v, path, "tone");
  if (!(TONES as readonly string[]).includes(s)) {
    throw new ScriptParseError(path, `unknown tone "${s}" (expected one of: ${TONES.join(", ")})`);
  }
  return s as Tone;
}

function parseLayer(raw: unknown, path: string): Layer {
  const obj = reqObject(raw, path, "layer");
  const component = reqString(obj.component, `${path}.component`, "component id");
  // Caption is an internal layer auto-appended by composeScene from scene.caption.
  // Allowing a manual caption layer alongside scene.caption would render it twice.
  if (component === "caption") {
    throw new ScriptParseError(
      `${path}.component`,
      `caption is set via the scene's top-level "caption" field, not a manual layer`,
    );
  }
  if (!has(component)) {
    throw new ScriptParseError(
      `${path}.component`,
      `unknown component "${component}" (registered: ${ids().join(", ")})`,
    );
  }
  const props = obj.props;
  if (props !== undefined && !isPlainObject(props)) {
    throw new ScriptParseError(`${path}.props`, "props must be an object");
  }
  return { component, props: (props as Record<string, unknown> | undefined) ?? {} };
}

function parseScene(raw: unknown, path: string): SceneSpec {
  const obj = reqObject(raw, path, "scene");
  const layersRaw = reqArray(obj.layers, `${path}.layers`, "layers");
  if (layersRaw.length === 0) {
    throw new ScriptParseError(`${path}.layers`, "scene must have at least one layer");
  }
  const layers = layersRaw.map((l, i) => parseLayer(l, `${path}.layers[${i}]`));
  const caption = obj.caption;
  if (caption !== undefined) {
    if (typeof caption !== "string") {
      throw new ScriptParseError(`${path}.caption`, "caption must be a string");
    }
    if (caption.trim() === "") {
      // composeScene drops empty captions silently; surface the authoring mistake instead.
      throw new ScriptParseError(`${path}.caption`, "caption must be non-empty (omit the field instead)");
    }
  }
  return { layers, caption: caption as string | undefined };
}

const SFX_PREFIX = "SFX:";

function parseTags(raw: unknown, path: string): { hold: boolean; zoom: boolean; sfx: string[] } {
  if (raw === undefined) return { hold: false, zoom: false, sfx: [] };
  const arr = reqArray(raw, path, "tags");
  let hold = false;
  let zoom = false;
  const sfx: string[] = [];
  for (let i = 0; i < arr.length; i++) {
    const t = arr[i];
    if (typeof t !== "string") {
      throw new ScriptParseError(`${path}[${i}]`, `tag must be a string, got ${JSON.stringify(t)}`);
    }
    if (t === "HOLD") {
      hold = true;
    } else if (t === "ZOOM") {
      zoom = true;
    } else if (t.startsWith(SFX_PREFIX)) {
      const name = t.slice(SFX_PREFIX.length).trim();
      if (name === "") throw new ScriptParseError(`${path}[${i}]`, `SFX tag missing name`);
      sfx.push(name);
    } else {
      throw new ScriptParseError(
        `${path}[${i}]`,
        `unknown tag "${t}" (expected HOLD, ZOOM, or SFX:<name>)`,
      );
    }
  }
  return { hold, zoom, sfx };
}

function parseBeat(raw: unknown, path: string): Beat {
  const obj = reqObject(raw, path, "beat");
  const narration = reqString(obj.narration, `${path}.narration`, "narration");
  const scene = parseScene(obj.scene, `${path}.scene`);
  const { hold, zoom, sfx } = parseTags(obj.tags, `${path}.tags`);
  return { narration, scene, hold, zoom, sfx };
}

export function parseScript(yamlText: string): Script {
  let raw: unknown;
  try {
    raw = parseYaml(yamlText);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new ScriptParseError("$", `invalid YAML — ${msg}`);
  }
  const root = reqObject(raw, "$", "script root");
  const id = reqString(root.id, "$.id", "script id");
  const tone = parseTone(root.tone, "$.tone");
  const beatsRaw = reqArray(root.beats, "$.beats", "beats");
  if (beatsRaw.length === 0) {
    throw new ScriptParseError("$.beats", "script must have at least one beat");
  }
  const beats = beatsRaw.map((b, i) => parseBeat(b, `$.beats[${i}]`));
  return { id, tone, beats };
}
