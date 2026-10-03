// Parse a YAML episode script into a typed Script. The parser is strict about
// structure and component-id existence; per-component prop validation is left to
// the registered adapters (which use kit/params.ts) at render time, so prop
// schemas have a single source of truth.

import { parse as parseYaml } from "yaml";
import { has, ids } from "./registry";
import "./library"; // populate the registry before component-id validation
import type { Layer, SceneSpec } from "./scene";
import type { Beat, BeatScene, ImageScene, KitScene, Script, Tone } from "./script";

export class ScriptParseError extends Error {
  constructor(
    public readonly path: string,
    message: string,
  ) {
    super(`${path}: ${message}`);
    this.name = "ScriptParseError";
  }
}

const TONES: readonly Tone[] = ["light", "balanced", "heavy"] as const;

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

export interface ParseOptions {
  /** Known character ids (shared/characters/*.yml). When given, unknown `cast` ids are errors. */
  characters?: ReadonlySet<string>;
}

const KIT_KEYS = new Set(["layers", "caption", "id"]);
const IMAGE_KEYS = new Set(["image", "cast", "seed", "caption"]);
const CAST_ID = /^[a-z0-9][a-z0-9-]*$/;
const MAX_CAST = 3;
const MAX_SEED = 2 ** 32 - 1;

function rejectUnknownKeys(obj: Record<string, unknown>, allowed: Set<string>, path: string): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) {
      throw new ScriptParseError(
        `${path}.${key}`,
        `unknown scene field "${key}" (allowed here: ${[...allowed].join(", ")})`,
      );
    }
  }
}

function parseCaption(caption: unknown, path: string): string | undefined {
  if (caption === undefined) return undefined;
  if (typeof caption !== "string") {
    throw new ScriptParseError(path, "caption must be a string");
  }
  if (caption.trim() === "") {
    // composeScene drops empty captions silently; surface the authoring mistake instead.
    throw new ScriptParseError(path, "caption must be non-empty (omit the field instead)");
  }
  return caption;
}

function parseImageScene(
  obj: Record<string, unknown>,
  path: string,
  opts: ParseOptions,
): ImageScene {
  rejectUnknownKeys(obj, IMAGE_KEYS, path);
  const image = reqString(obj.image, `${path}.image`, "image prompt");
  const cast: string[] = [];
  if (obj.cast !== undefined) {
    const arr = reqArray(obj.cast, `${path}.cast`, "cast");
    if (arr.length > MAX_CAST) {
      throw new ScriptParseError(
        `${path}.cast`,
        `at most ${MAX_CAST} characters per image (more ones blend together)`,
      );
    }
    arr.forEach((c, i) => {
      const p = `${path}.cast[${i}]`;
      if (typeof c !== "string" || !CAST_ID.test(c)) {
        throw new ScriptParseError(p, `character id must be lowercase kebab-case, got ${JSON.stringify(c)}`);
      }
      if (cast.includes(c)) throw new ScriptParseError(p, `"${c}" is listed twice`);
      if (opts.characters && !opts.characters.has(c)) {
        const known = [...opts.characters].sort().join(", ") || "none";
        throw new ScriptParseError(
          p,
          `unknown character "${c}" (known: ${known}) — add shared/characters/${c}.yml`,
        );
      }
      cast.push(c);
    });
  }
  let seed: number | undefined;
  if (obj.seed !== undefined) {
    const s = obj.seed;
    if (typeof s !== "number" || !Number.isInteger(s) || s < 0 || s > MAX_SEED) {
      throw new ScriptParseError(`${path}.seed`, `seed must be an integer from 0 to ${MAX_SEED}`);
    }
    seed = s;
  }
  const caption = parseCaption(obj.caption, `${path}.caption`);
  return { kind: "image", image, cast, ...(seed !== undefined && { seed }), ...(caption !== undefined && { caption }) };
}

function parseScene(raw: unknown, path: string, opts: ParseOptions): BeatScene {
  const obj = reqObject(raw, path, "scene");
  const hasLayers = obj.layers !== undefined;
  const hasImage = obj.image !== undefined;
  if (hasLayers && hasImage) {
    throw new ScriptParseError(path, 'pick one: "layers" (code-kit scene) or "image" (AI still)');
  }
  if (!hasLayers && !hasImage) {
    throw new ScriptParseError(path, 'scene needs "layers" (code-kit scene) or "image" (AI still)');
  }
  if (hasImage) return parseImageScene(obj, path, opts);
  rejectUnknownKeys(obj, KIT_KEYS, path);
  return parseKitScene(obj, path);
}

function parseKitScene(obj: Record<string, unknown>, path: string): KitScene {
  const layersRaw = reqArray(obj.layers, `${path}.layers`, "layers");
  if (layersRaw.length === 0) {
    throw new ScriptParseError(`${path}.layers`, "scene must have at least one layer");
  }
  const layers = layersRaw.map((l, i) => parseLayer(l, `${path}.layers[${i}]`));
  const caption = parseCaption(obj.caption, `${path}.caption`);
  const spec: SceneSpec = { layers, caption };
  return spec;
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

function parseBeat(raw: unknown, path: string, opts: ParseOptions): Beat {
  const obj = reqObject(raw, path, "beat");
  const narration = reqString(obj.narration, `${path}.narration`, "narration");
  const scene = parseScene(obj.scene, `${path}.scene`, opts);
  const { hold, zoom, sfx } = parseTags(obj.tags, `${path}.tags`);
  return { narration, scene, hold, zoom, sfx };
}

export function parseScript(yamlText: string, opts: ParseOptions = {}): Script {
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
  const beats = beatsRaw.map((b, i) => parseBeat(b, `$.beats[${i}]`, opts));
  return { id, tone, beats };
}
