// Command-line parsing for `npm run try-look` (kept apart from the script so it can be tested).

import { parseBeatList } from "../../render/scene-prompt";

export interface TryLookArgs {
  slug: string;
  /** Preset names, style files, or "episode" (the episode's own style.yml); repeats removed. */
  looks: string[];
  beats?: number[];
}

export const TRY_LOOK_USAGE =
  "usage: npm run try-look <slug> <preset | episode | style.yml> [...] [-- --beats 0,3]";

/** Throws with a usage line on bad input. `env` is checked for flags npm took for itself. */
export function parseTryLookArgs(argv: string[], env: NodeJS.ProcessEnv = {}): TryLookArgs {
  // Without `--`, npm keeps --beats for itself and drops it silently.
  if (env.npm_config_beats !== undefined) {
    throw new Error(
      "npm took --beats for itself. Put -- before it: npm run try-look <slug> <preset> -- --beats 0,3",
    );
  }
  const positional: string[] = [];
  let beats: number[] | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--beats") {
      const v = argv[++i];
      if (v === undefined)
        throw new Error(`--beats needs a list, e.g. --beats 0,3\n${TRY_LOOK_USAGE}`);
      beats = parseBeatList(v);
    } else if (a.startsWith("-")) {
      throw new Error(`unknown option "${a}"\n${TRY_LOOK_USAGE}`);
    } else positional.push(a);
  }
  const [slug, ...looks] = positional;
  if (!slug || looks.length === 0) throw new Error(TRY_LOOK_USAGE);
  return { slug, looks: [...new Set(looks)], beats };
}
