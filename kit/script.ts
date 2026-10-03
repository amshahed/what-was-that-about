// The canonical episode script shape. The parser (script-parser.ts) emits this;
// downstream slices (#6 stills batch, #8 assembly, #10 SFX/music) consume it.

import type { SceneSpec } from "./scene";

export type Tone = "light" | "balanced" | "heavy";

/** A code-kit scene (text-hero, diagrams): Rough.js layers. `kind` is optional so plain SceneSpecs fit. */
export type KitScene = SceneSpec & { kind?: "kit" };

/** An AI still made by `npm run generate-scenes` (local ComfyUI + Flux). */
export interface ImageScene {
  kind: "image";
  /** What the image shows: action, expression, setting. Not the characters' looks. */
  image: string;
  /** Character ids (files in shared/characters/), left to right. */
  cast: string[];
  /** Pinned seed; when absent the seed is derived from image + cast. */
  seed?: number;
  caption?: string;
}

export type BeatScene = KitScene | ImageScene;

export function isImageScene(scene: BeatScene): scene is ImageScene {
  return scene.kind === "image";
}

export interface Beat {
  /** Narration text the narrator will read. The script-as-EDL spine. */
  narration: string;
  /** Visual shown during this beat: code-kit layers or an AI still. */
  scene: BeatScene;
  /** [HOLD] tag — linger on this beat (assembly extends dwell). */
  hold: boolean;
  /** [ZOOM] tag — Ken Burns punch-in during this beat. */
  zoom: boolean;
  /** [SFX:name] tags — sound stings to drop at this beat (in order). */
  sfx: string[];
}

export interface Script {
  /** Stable id for the episode (used for output paths, etc.). */
  id: string;
  /** Tone tag — sets joke density, runtime band, music bed (slice #10). */
  tone: Tone;
  /** Ordered beat list. */
  beats: Beat[];
}
