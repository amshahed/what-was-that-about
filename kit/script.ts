// The canonical episode script shape. The parser (script-parser.ts) emits this;
// downstream slices (#6 stills batch, #7 assembly, #9 SFX/music) consume it.

import type { SceneSpec } from "./scene";

export type Tone = "light" | "balanced" | "heavy" | "balanced-heavy";

export interface Beat {
  /** Narration text the narrator will read. The script-as-EDL spine. */
  narration: string;
  /** Visual composition shown during this beat. */
  scene: SceneSpec;
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
  /** Tone tag — sets joke density, runtime band, music bed (Slice 9). */
  tone: Tone;
  /** Ordered beat list. */
  beats: Beat[];
}
