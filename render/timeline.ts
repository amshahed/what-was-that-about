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

// Broad stop-word list; also filter words shorter than 3 chars after normalization (numbers excepted).
const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "is",
  "it",
  "of",
  "and",
  "in",
  "to",
  "i",
  "we",
  "he",
  "she",
  "they",
  "you",
  "me",
  "my",
  "his",
  "her",
  "our",
  "was",
  "are",
  "has",
  "have",
  "had",
  "will",
  "be",
  "do",
  "at",
  "on",
  "but",
  "or",
  "if",
  "so",
  "as",
  "by",
  "up",
  "no",
]);

function normalize(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Whisper writes some numbers as digits ("9 to 5") and some as words ("Nine", "Twenty -one"),
// depending on context and the spelling prompt. Both sides of the match go through numberTokens(),
// so "nine", "9", "twenty-one", "Twenty -one" and "21" all compare equal.
const UNITS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};
const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

interface Token {
  text: string;
  /** Index of the source word (transcript word or narration word). */
  index: number;
}

/** Normalized tokens; hyphenated words split; number words become digits ("twenty one" → "21"). */
function numberTokens(rawWords: string[]): Token[] {
  const parts: Token[] = [];
  rawWords.forEach((w, index) => {
    for (const piece of w.split("-")) {
      const text = normalize(piece);
      if (text) parts.push({ text, index });
    }
  });
  const out: Token[] = [];
  for (let k = 0; k < parts.length; k++) {
    const { text, index } = parts[k]!;
    const tens = TENS[text];
    const next = parts[k + 1] ? UNITS[parts[k + 1]!.text] : undefined;
    if (tens !== undefined && next !== undefined && next >= 1 && next <= 9) {
      out.push({ text: String(tens + next), index });
      k++;
    } else if (tens !== undefined) {
      out.push({ text: String(tens), index });
    } else if (UNITS[text] !== undefined) {
      out.push({ text: String(UNITS[text]), index });
    } else {
      out.push({ text, index });
    }
  }
  return out;
}

function isNumeric(w: string): boolean {
  return /^\d+$/.test(w);
}

interface Anchor {
  /** All of the beat's tokens, in order. */
  words: string[];
  /** Up to n significant tokens; targets[0] is the one searched for. */
  targets: string[];
  /** Position of targets[0] in words — how many leading (stop) words come before it. */
  lead: number;
}

function significantWords(text: string, n = 3): Anchor {
  const words = numberTokens(text.trim().split(/\s+/)).map((t) => t.text);
  const isSignificant = (w: string) => isNumeric(w) || (w.length > 2 && !STOP_WORDS.has(w));
  const significant = words.filter(isSignificant);
  // Fall back to all non-empty words if nothing survives the filter — beats with very
  // short narration (e.g. "OK.") should still attempt a match rather than always interpolating.
  const targets = (significant.length > 0 ? significant : words).slice(0, n);
  const lead = significant.length > 0 ? words.findIndex(isSignificant) : 0;
  return { words, targets, lead };
}

export function mapBeatsToTimeline(
  beats: Beat[],
  alignment: AlignmentResult,
  fps: number,
): BeatEntry[] {
  const { words, duration } = alignment;
  const tokens = numberTokens(words.map((w) => w.word));

  // Compute start seconds for each beat by sequential word matching.
  const startSecs: number[] = new Array(beats.length).fill(0);
  let cursor = 0;
  // Earliest token the next beat may start at: just past the previous beat's expected last word.
  let floor = 0;
  // prevEnd tracks the estimated END of the previous beat so the fallback can
  // place a missed beat at the correct window boundary (not at the previous start).
  let prevEnd = 0;

  for (let i = 0; i < beats.length; i++) {
    const anchor = significantWords(beats[i]!.narration);
    const { targets, lead } = anchor;

    let found = false;
    for (let j = cursor; j < tokens.length; j++) {
      if (tokens[j]!.text === targets[0]) {
        // Start the cut at the beat's first spoken word, not at the anchor ("The god…" starts at
        // "The"), but only when the transcript has exactly the same leading words.
        const first = j - lead;
        const leadMatches =
          lead > 0 &&
          first >= Math.max(cursor, floor) &&
          anchor.words.slice(0, lead).every((w, k) => tokens[first + k]!.text === w);
        startSecs[i] = words[tokens[leadMatches ? first : j]!.index]!.start;
        prevEnd = words[tokens[j]!.index]!.end;
        cursor = j + 1;
        floor = j + (anchor.words.length - lead);
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
