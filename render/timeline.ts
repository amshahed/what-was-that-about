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
  sfx: string[];
}

// Broad stop-word list; also filter words shorter than 3 chars after normalization.
const STOP_WORDS = new Set([
  "a", "an", "the", "is", "it", "of", "and", "in", "to", "i",
  "we", "he", "she", "they", "you", "me", "my", "his", "her", "our",
  "was", "are", "has", "have", "had", "will", "be", "do", "at",
  "on", "but", "or", "if", "so", "as", "by", "up", "no",
]);

function normalize(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function significantWords(text: string, n = 3): string[] {
  const words = text.trim().split(/\s+/).map(normalize).filter((w) => w.length > 0);
  const significant = words.filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  // Fall back to all non-empty words if nothing survives the filter — beats with very
  // short narration (e.g. "OK.") should still attempt a match rather than always interpolating.
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
  // prevEnd tracks the estimated END of the previous beat so the fallback can
  // place a missed beat at the correct window boundary (not at the previous start).
  let prevEnd = 0;

  for (let i = 0; i < beats.length; i++) {
    const targets = significantWords(beats[i]!.narration);

    let found = false;
    for (let j = cursor; j < normWords.length; j++) {
      if (normWords[j] === targets[0]) {
        startSecs[i] = words[j]!.start;
        prevEnd = words[j]!.end;
        cursor = j + 1;
        found = true;
        break;
      }
    }

    if (!found) {
      // Distribute remaining time proportionally by character count among the
      // unmatched beats. Beat starts at prevEnd; its estimated end advances prevEnd.
      const remaining = duration - prevEnd;
      const totalChars = beats.slice(i).reduce((s, b) => s + b.narration.length, 0);
      const thisChars = beats[i]!.narration.length;
      const thisShare = totalChars > 0 ? thisChars / totalChars : 1 / (beats.length - i);
      startSecs[i] = prevEnd;
      prevEnd = prevEnd + remaining * thisShare;
    }
  }

  return beats.map((beat, i) => {
    const startSec = startSecs[i]!;
    const endSec = i + 1 < beats.length ? startSecs[i + 1]! : duration;
    // HOLD flag is preserved for downstream use (#9 captions, #10 SFX).
    // Visual hold (keeping the image on screen extra frames) would cause the next
    // Sequence to overlap and paint on top, so we don't extend durationFrames here.
    const durationSec = Math.max(endSec - startSec, 1 / fps);

    return {
      startFrame: Math.round(startSec * fps),
      durationFrames: Math.max(1, Math.round(durationSec * fps)),
      scene: beat.scene,
      zoom: beat.zoom,
      hold: beat.hold,
      narration: beat.narration,
      sfx: beat.sfx,
    };
  });
}
