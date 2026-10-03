import { parseScript } from "../../kit/script-parser";

// Whisper reads only the last ~224 tokens of its prompt; ~100 words stays well inside that.
export const PROMPT_WORDS = 100;

/** The script's opening narration, as a spelling hint for Whisper. Undefined if there is no usable script. */
export function spellingPrompt(scriptYaml: string, maxWords = PROMPT_WORDS): string | undefined {
  try {
    const words = parseScript(scriptYaml)
      .beats.map((b) => b.narration)
      .join(" ")
      .split(/\s+/)
      .filter((w) => w.length > 0);
    return words.length > 0 ? words.slice(0, maxWords).join(" ") : undefined;
  } catch {
    return undefined;
  }
}
