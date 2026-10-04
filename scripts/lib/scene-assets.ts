// File access for AI stills: character/look (style preset)/workflow files, scenes/ folder, manifest, render staging.

import path from "node:path";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { parseScript } from "../../kit/script-parser";
import type { Script } from "../../kit/script";
import {
  hashText,
  parseCharacter,
  parseStyle,
  parseStyleOverride,
  planScenes,
  resolveStyle,
  type Character,
  type Manifest,
  type ScenePlan,
  type SceneStyle,
} from "../../render/scene-prompt";
import type { RenderAssets } from "./render-assets";

export const CHARACTERS_DIR = path.join("shared", "characters");
export const STYLES_DIR = path.join("shared", "styles");
export const DEFAULT_PRESET = "cartoon";
export const WORKFLOW_FILE = path.join("tools", "comfyui", "workflows", "flux-gguf.api.json");

function readCharacterDir(
  dir: string,
  out: Map<string, Character>,
  where: Map<string, string>,
): void {
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir)
    .filter((n) => n.endsWith(".yml"))
    .sort()) {
    const id = f.slice(0, -".yml".length);
    const file = path.join(dir, f);
    if (out.has(id)) {
      throw new Error(
        `character "${id}" is defined twice: ${where.get(id)} and ${file} — rename one`,
      );
    }
    out.set(id, parseCharacter(readFileSync(file, "utf8"), id, file));
    where.set(id, file);
  }
}

/**
 * Channel characters (shared/characters/) plus this episode's own cast
 * (episodes/<slug>/characters/). The same id in both places is an error.
 */
export function loadCharacters(
  episodeDir?: string,
  sharedDir = CHARACTERS_DIR,
): Map<string, Character> {
  const out = new Map<string, Character>();
  const where = new Map<string, string>();
  readCharacterDir(sharedDir, out, where);
  if (episodeDir) readCharacterDir(path.join(episodeDir, "characters"), out, where);
  return out;
}

/** Preset names in shared/styles/ (file names without .yml). */
export function listPresets(dir = STYLES_DIR): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => n.endsWith(".yml"))
    .map((n) => n.slice(0, -".yml".length))
    .sort();
}

export function presetFile(name: string, dir = STYLES_DIR): string {
  return path.join(dir, `${name}.yml`);
}

/** A preset from shared/styles/. The error lists the presets there is. */
export function loadPreset(name: string, dir = STYLES_DIR, where = "preset"): SceneStyle {
  const file = presetFile(name, dir);
  if (!existsSync(file)) {
    throw new Error(
      `${where}: unknown preset "${name}" (available: ${listPresets(dir).join(", ") || "none"})`,
    );
  }
  const text = readFileSync(file, "utf8");
  if (parseStyleOverride(text, file).preset !== undefined) {
    throw new Error(`${file}: a preset cannot use "preset"`);
  }
  return parseStyle(text, file);
}

export interface Look {
  style: SceneStyle;
  /** The preset name, or "custom" for a complete episode style.yml without `preset:`. */
  name: string;
  /** The file that chose the look, or undefined for the default. */
  file?: string;
}

/**
 * The episode's look: episodes/<slug>/style.yml (a `preset:` plus changed fields, or a complete
 * style), else the default preset.
 */
export function loadLook(episodeDir?: string, dir = STYLES_DIR): Look {
  const own = episodeDir ? path.join(episodeDir, "style.yml") : undefined;
  if (!own || !existsSync(own)) {
    return { style: loadPreset(DEFAULT_PRESET, dir), name: DEFAULT_PRESET };
  }
  const override = parseStyleOverride(readFileSync(own, "utf8"), own);
  const preset = override.preset ? loadPreset(override.preset, dir, own) : undefined;
  return {
    style: resolveStyle(preset, override, own),
    name: override.preset ?? "custom",
    file: own,
  };
}

/** "retro-pixel (episodes/ubik/style.yml) · pixelate 4×, 32 colors" */
export function describeLook(look: Look): string {
  const from = look.file ? path.relative(process.cwd(), look.file) : "default";
  const px = look.style.pixelate;
  return `${look.name} (${from})${px ? ` · pixelate ${px.factor}×, ${px.colors} colors` : ""}`;
}

export function loadWorkflow(file = WORKFLOW_FILE): { template: unknown; hash: string } {
  const template: unknown = JSON.parse(readFileSync(file, "utf8"));
  // Hash the parsed JSON, so reformatting the file does not mark every still stale; leave out the
  // placeholder prompt (node 4), which generate-scenes replaces for every beat anyway.
  const forHash = structuredClone(template) as Record<string, { inputs?: Record<string, unknown> }>;
  if (forHash["4"]?.inputs) delete forHash["4"].inputs.text;
  return { template, hash: hashText(JSON.stringify(forHash)) };
}

export function scenesDir(episodeDir: string): string {
  return path.join(episodeDir, "scenes");
}

export function readManifest(episodeDir: string, episode: string): Manifest {
  const file = path.join(scenesDir(episodeDir), "manifest.json");
  if (!existsSync(file)) return { version: 1, episode, beats: {} };
  const m = JSON.parse(readFileSync(file, "utf8")) as Manifest;
  return m.version === 1 && m.beats ? m : { version: 1, episode, beats: {} };
}

/** Write via a temp file + rename, so an interrupted run never leaves a half-written manifest. */
export function writeManifest(episodeDir: string, manifest: Manifest): void {
  const dir = scenesDir(episodeDir);
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "manifest.json");
  writeFileSync(`${file}.tmp`, JSON.stringify(manifest, null, 2) + "\n");
  renameSync(`${file}.tmp`, file);
}

export function existingStills(episodeDir: string): Set<string> {
  const dir = scenesDir(episodeDir);
  if (!existsSync(dir)) return new Set();
  return new Set(readdirSync(dir).filter((f) => f.endsWith(".png")));
}

export interface EpisodeScenes {
  script: Script;
  plan: ScenePlan;
  characters: Map<string, Character>;
  style: SceneStyle;
  look: Look;
  workflow: { template: unknown; hash: string };
  manifest: Manifest;
}

/** Parse the script (cast ids checked against the known characters) and plan its AI stills. */
export function loadEpisodeScenes(episodeDir: string, scriptPath: string): EpisodeScenes {
  const characters = loadCharacters(episodeDir);
  const script = parseScript(readFileSync(scriptPath, "utf8"), {
    characters: new Set(characters.keys()),
  });
  const look = loadLook(episodeDir);
  const style = look.style;
  const workflow = loadWorkflow();
  const manifest = readManifest(episodeDir, script.id);
  const plan = planScenes(script, {
    characters,
    style,
    workflowHash: workflow.hash,
    existing: existingStills(episodeDir),
    manifest,
  });
  return { script, plan, characters, style, look, workflow, manifest };
}

/**
 * Stage the stills for beats [from, to] into the render's public folder.
 * Missing stills stop the render with the exact command to run; stale ones only warn.
 * Returns beat index → staticFile() name.
 */
export function stageStills(
  episodeDir: string,
  slug: string,
  plan: ScenePlan,
  assets: RenderAssets,
  from = 0,
  to = Number.MAX_SAFE_INTEGER,
): Map<number, string> {
  const inRange = plan.stills.filter((s) => s.beat >= from && s.beat <= to);
  const missing = inRange.filter((s) => s.status === "missing");
  if (missing.length > 0) {
    const lines = missing.map(
      (s) => `  beat ${s.beat} "${s.scene.image.slice(0, 60)}" → scenes/${s.file}`,
    );
    console.error(`missing AI stills for ${missing.length} beat(s):\n${lines.join("\n")}`);
    console.error(
      `Run: npm run generate-scenes ${slug} -- --beats ${missing.map((s) => s.beat).join(",")}`,
    );
    process.exit(2);
  }
  const stale = inRange.filter((s) => s.status === "stale");
  if (stale.length > 0) {
    console.warn(
      `${stale.length} still(s) were made with an older style, character or workflow (beats ${stale
        .map((s) => s.beat)
        .join(", ")}). Using them anyway; run generate-scenes to refresh.`,
    );
  }
  const out = new Map<number, string>();
  for (const s of inRange) {
    out.set(s.beat, assets.add(path.join(scenesDir(episodeDir), s.file), `scenes/${s.file}`));
  }
  return out;
}
