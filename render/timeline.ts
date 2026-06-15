import type { Beat } from "../kit/script";
import type { SceneSpec } from "../kit/scene";
import type { AlignmentResult } from "./align";

export interface BeatEntry {
  startFrame: number;
  durationFrames: number;
  scene: SceneSpec;
  zoom: boolean;
  hold: boolean;
  narration: string;
}

const STOP_WORDS = new Set(["a", "the", "is", "of", "and", "in", "to", "it", "i"]);
const HOLD_BONUS_SEC = 1.5;

function normalize(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function significantWords(text: string, n = 3): string[] {
  const words = text.trim().split(/\s+/).map(normalize).filter((w) => w.length > 0);
  const significant = words.filter((w) => !STOP_WORDS.has(w));
  return (significant.length > 0 ? significant : words).slice(0, n);
}

export function mapBeatsToTimeline(
  beats: Beat[],
  alignment: AlignmentResult,
  fps: number,
): BeatEntry[] {
  const { words, duration } = alignment;
  const normWords = words.map((w) => normalize(w.word));

  // Compute start seconds for each beat by sequential word matching.
  const startSecs: number[] = new Array(beats.length).fill(0);
  let cursor = 0;

  for (let i = 0; i < beats.length; i++) {
    const targets = significantWords(beats[i]!.narration);

    let found = false;
    for (let j = cursor; j < normWords.length; j++) {
      if (normWords[j] === targets[0]) {
        startSecs[i] = words[j]!.start;
        cursor = j + 1;
        found = true;
        break;
      }
    }

    if (!found) {
      // Fall back: interpolate from prior beat's start based on character share.
      const prevStart = i === 0 ? 0 : startSecs[i - 1]!;
      const remaining = duration - prevStart;
      const totalChars = beats.slice(i).reduce((s, b) => s + b.narration.length, 0);
      const thisChars = beats[i]!.narration.length;
      const share = totalChars > 0 ? thisChars / totalChars : 1 / (beats.length - i);
      startSecs[i] = prevStart + remaining * (1 - share);
    }
  }

  return beats.map((beat, i) => {
    const startSec = startSecs[i]!;
    const naturalEndSec = i + 1 < beats.length ? startSecs[i + 1]! : duration;
    const holdBonus = beat.hold ? HOLD_BONUS_SEC : 0;
    const endSec = Math.min(naturalEndSec + holdBonus, duration);
    const durationSec = Math.max(endSec - startSec, 1 / fps);

    return {
      startFrame: Math.round(startSec * fps),
      durationFrames: Math.max(1, Math.round(durationSec * fps)),
      scene: beat.scene,
      zoom: beat.zoom,
      hold: beat.hold,
      narration: beat.narration,
    };
  });
}
