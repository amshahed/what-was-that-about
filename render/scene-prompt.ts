// Pure logic for AI stills: character/style files, prompt composition, seeds, file names, cache plan.
// No file or network access here — scripts/lib/scene-assets.ts reads files; render/comfy.ts talks to ComfyUI.

import { createHash } from "node:crypto";
import { parse as parseYaml } from "yaml";
import { isImageScene, type ImageScene, type Script } from "../kit/script";

export interface Character {
  id: string;
  name: string;
  description: string;
  short?: string;
  notes?: string;
}

export interface SceneStyle {
  prefix: string;
  suffix: string;
  width: number;
  height: number;
  steps: number;
  guidance: number;
}

const CHARACTER_KEYS = new Set(["id", "name", "description", "short", "notes"]);
const STYLE_KEYS = new Set(["prefix", "suffix", "width", "height", "steps", "guidance"]);

function asRecord(raw: unknown, where: string): Record<string, unknown> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error(`${where}: expected a YAML mapping`);
  }
  return raw as Record<string, unknown>;
}

function checkKeys(obj: Record<string, unknown>, allowed: Set<string>, where: string): void {
  for (const k of Object.keys(obj)) {
    if (!allowed.has(k))
      throw new Error(`${where}: unknown field "${k}" (allowed: ${[...allowed].join(", ")})`);
  }
}

function text(
  obj: Record<string, unknown>,
  key: string,
  where: string,
  required = true,
): string | undefined {
  const v = obj[key];
  if (v === undefined && !required) return undefined;
  if (typeof v !== "string" || v.trim() === "")
    throw new Error(`${where}: "${key}" must be a non-empty string`);
  return v.trim();
}

/** Parse shared/characters/<fileId>.yml. */
export function parseCharacter(yamlText: string, fileId: string): Character {
  const where = `shared/characters/${fileId}.yml`;
  const obj = asRecord(parseYaml(yamlText), where);
  checkKeys(obj, CHARACTER_KEYS, where);
  const id = text(obj, "id", where)!;
  if (id !== fileId) throw new Error(`${where}: id "${id}" must equal the file name "${fileId}"`);
  return {
    id,
    name: text(obj, "name", where)!,
    description: text(obj, "description", where)!,
    short: text(obj, "short", where, false),
    notes: text(obj, "notes", where, false),
  };
}

/** Parse shared/style.yml. Width and height must be multiples of 64 (Flux latent grid). */
export function parseStyle(yamlText: string): SceneStyle {
  const where = "shared/style.yml";
  const obj = asRecord(parseYaml(yamlText), where);
  checkKeys(obj, STYLE_KEYS, where);
  const num = (key: string, ok: (n: number) => boolean, rule: string): number => {
    const v = obj[key];
    if (typeof v !== "number" || !ok(v)) throw new Error(`${where}: "${key}" must be ${rule}`);
    return v;
  };
  const dim = (n: number) => Number.isInteger(n) && n >= 256 && n <= 2048 && n % 64 === 0;
  return {
    prefix: text(obj, "prefix", where)!,
    suffix: text(obj, "suffix", where)!,
    width: num("width", dim, "a multiple of 64 from 256 to 2048"),
    height: num("height", dim, "a multiple of 64 from 256 to 2048"),
    steps: num(
      "steps",
      (n) => Number.isInteger(n) && n >= 1 && n <= 100,
      "an integer from 1 to 100",
    ),
    guidance: num("guidance", (n) => n > 0 && n <= 20, "a number from 0 to 20"),
  };
}

const sentence = (s: string) => s.trim().replace(/[.\s]+$/, "") + ".";
const POSITIONS: Record<number, string[]> = {
  2: ["On the left", "On the right"],
  3: ["On the left", "In the middle", "On the right"],
};

/** prefix → cast → image → suffix. One character gets its full description; 2–3 get `short` + a position. */
export function composePrompt(style: SceneStyle, cast: Character[], image: string): string {
  const parts = [sentence(style.prefix)];
  if (cast.length === 1) {
    parts.push(sentence(cast[0]!.description));
  } else if (cast.length > 1) {
    const where = POSITIONS[cast.length] ?? [];
    cast.forEach((c, i) => {
      const label = where[i] ?? `Character ${i + 1}`;
      parts.push(sentence(`${label}: ${c.short ?? c.description}`));
    });
  }
  parts.push(sentence(image), sentence(style.suffix));
  return parts.join(" ");
}

/** Rough T5 token count (Flux was trained at 512 tokens). */
export function estimateTokens(prompt: string): number {
  return Math.ceil(prompt.split(/\s+/).filter(Boolean).length * 1.4);
}
export const TOKEN_WARNING = 400;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Seed when none is pinned: from the beat's own text, never its position, so inserting beats changes nothing. */
export function deriveSeed(image: string, cast: string[]): number {
  return parseInt(sha256(`${image}\0${cast.join(",")}`).slice(0, 8), 16);
}

export function effectiveSeed(scene: ImageScene): { seed: number; source: "pinned" | "derived" } {
  return scene.seed !== undefined
    ? { seed: scene.seed, source: "pinned" }
    : { seed: deriveSeed(scene.image, scene.cast), source: "derived" };
}

/** Changes when the script changes what this beat shows (image, cast, seed). */
export function authorKey(image: string, cast: string[], seed: number): string {
  return sha256(JSON.stringify({ v: 1, image, cast, seed })).slice(0, 8);
}

/** Changes when anything that affects the pixels changes (prompt, seed, settings, workflow). */
export function renderKey(
  prompt: string,
  seed: number,
  style: SceneStyle,
  workflowHash: string,
): string {
  const { width, height, steps, guidance } = style;
  return sha256(JSON.stringify({ prompt, seed, width, height, steps, guidance, workflowHash }));
}

export function hashText(s: string): string {
  return sha256(s);
}

/** "Poseidon facepalming at a desk…" + key → "poseidon-facepalming-at-a-desk-3fa91c2e.png". */
export function stillFileName(image: string, key: string): string {
  const slug =
    image
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9\s-]/g, "")
      .split(/[\s-]+/)
      .filter(Boolean)
      .slice(0, 5)
      .join("-")
      .slice(0, 40)
      .replace(/-+$/, "") || "scene";
  return `${slug}-${key}.png`;
}

export interface ManifestEntry {
  beat: number;
  image: string;
  cast: string[];
  seed: number;
  seedSource: "pinned" | "derived";
  renderKey: string;
  prompt: string;
  width: number;
  height: number;
  seconds?: number;
  generatedAt?: string;
  /** Set for --reroll candidates: the beat they were made for, and their number (1–3). */
  candidateFor?: number;
  candidateNo?: number;
}

export interface Manifest {
  version: 1;
  episode: string;
  beats: Record<string, ManifestEntry>;
}

export type StillStatus = "fresh" | "stale" | "missing";

export interface PlannedStill {
  beat: number;
  scene: ImageScene;
  file: string;
  seed: number;
  seedSource: "pinned" | "derived";
  prompt: string;
  renderKey: string;
  tokens: number;
  status: StillStatus;
}

export interface ScenePlan {
  stills: PlannedStill[];
  /** PNG files in scenes/ that no beat uses. */
  orphans: string[];
}

export interface PlanContext {
  characters: ReadonlyMap<string, Character>;
  style: SceneStyle;
  workflowHash: string;
  /** PNG file names currently in scenes/. */
  existing: ReadonlySet<string>;
  manifest?: Manifest;
}

export function planScenes(script: Script, ctx: PlanContext): ScenePlan {
  const stills: PlannedStill[] = [];
  script.beats.forEach((beat, i) => {
    const scene = beat.scene;
    if (!isImageScene(scene)) return;
    const cast = scene.cast.map((id) => {
      const c = ctx.characters.get(id);
      if (!c) throw new Error(`beat ${i}: unknown character "${id}"`);
      return c;
    });
    const { seed, source } = effectiveSeed(scene);
    const file = stillFileName(scene.image, authorKey(scene.image, scene.cast, seed));
    const prompt = composePrompt(ctx.style, cast, scene.image);
    const key = renderKey(prompt, seed, ctx.style, ctx.workflowHash);
    const status: StillStatus = !ctx.existing.has(file)
      ? "missing"
      : ctx.manifest?.beats[file]?.renderKey === key
        ? "fresh"
        : "stale";
    stills.push({
      beat: i,
      scene,
      file,
      seed,
      seedSource: source,
      prompt,
      renderKey: key,
      tokens: estimateTokens(prompt),
      status,
    });
  });
  const used = new Set(stills.map((s) => s.file));
  const orphans = [...ctx.existing].filter((f) => !used.has(f)).sort();
  return { stills, orphans };
}

/** "2,5-7" → [2, 5, 6, 7]. */
export function parseBeatList(spec: string): number[] {
  const out = new Set<number>();
  for (const part of spec
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(part);
    if (!m) throw new Error(`bad beat list "${spec}" (use e.g. 2,5-7)`);
    const a = Number(m[1]);
    const b = m[2] !== undefined ? Number(m[2]) : a;
    if (b < a) throw new Error(`bad range "${part}"`);
    for (let n = a; n <= b; n++) out.add(n);
  }
  return [...out].sort((x, y) => x - y);
}
