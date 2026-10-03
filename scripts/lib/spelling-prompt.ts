import { parseScript } from "../../kit/script-parser";

// Whisper reads only the last ~224 tokens of its prompt; ~100 words stays well inside that.
export const PROMPT_WORDS = 100;
// Below this share of the script's words, the transcript probably misses audio (or the WAV is wrong).
export const MIN_COVERAGE = 0.6;

/** Every narration word in the script, in order. Undefined if the script does not parse. */
export function narrationWords(scriptYaml: string): string[] | undefined {
  try {
    return parseScript(scriptYaml)
      .beats.map((b) => b.narration)
      .join(" ")
      .split(/\s+/)
      .filter((w) => w.length > 0);
  } catch {
    return undefined;
  }
}

/** The script's opening narration, as a spelling hint for Whisper. Undefined if there is no usable script. */
export function spellingPrompt(scriptYaml: string, maxWords = PROMPT_WORDS): string | undefined {
  const words = narrationWords(scriptYaml);
  return words && words.length > 0 ? words.slice(0, maxWords).join(" ") : undefined;
}

/** A warning when the transcript has far fewer words than the script, else undefined. */
export function lowCoverageWarning(
  transcriptWords: number,
  scriptWords: number,
): string | undefined {
  if (scriptWords === 0 || transcriptWords >= scriptWords * MIN_COVERAGE) return undefined;
  return (
    `Whisper found ${transcriptWords} words, but the script has ${scriptWords}. ` +
    "Check that audio/narration.wav is the full, current recording; beat timing will be off."
  );
}
