// `npm run align <episode-slug-or-dir>` — runs forced alignment on the
// episode's narration WAV and writes word timestamps to out/alignment.json.
//
// Reads:  episodes/<slug>/audio/narration.wav
//         episodes/<slug>/script.yml   (optional — its opening narration helps Whisper spell names)
// Writes: episodes/<slug>/out/alignment.json
//
// Engine: ALIGN_ENGINE=local (default, faster-whisper on the GPU) or openai (needs OPENAI_API_KEY).

import path from "node:path";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { alignAudio, resolveEngine } from "../render/align";
import { resolveEpisodeDir } from "./lib/episode";
import { lowCoverageWarning, narrationWords, spellingPrompt } from "./lib/spelling-prompt";

function usage(): never {
  console.error("usage: tsx scripts/align.ts <episode-slug-or-dir>");
  process.exit(2);
}

async function main() {
  const arg = process.argv[2];
  if (!arg) usage();

  const engine = resolveEngine();
  const episodeDir = resolveEpisodeDir(arg);
  const audioPath = path.join(episodeDir, "audio", "narration.wav");

  if (!existsSync(audioPath)) {
    console.error(`audio file not found: ${audioPath}`);
    console.error(
      "Record narration and place it at episodes/<slug>/audio/narration.wav (WAV mono 44.1k 16-bit, peak -6..-3 dBFS).",
    );
    process.exit(2);
  }

  const scriptPath = path.join(episodeDir, "script.yml");
  const scriptYaml = existsSync(scriptPath) ? readFileSync(scriptPath, "utf8") : undefined;
  const prompt = scriptYaml !== undefined ? spellingPrompt(scriptYaml) : undefined;
  if (scriptYaml !== undefined && !prompt) {
    console.warn("script.yml did not parse; aligning without a spelling hint.");
  }

  console.log(`aligning (${engine}): ${path.relative(process.cwd(), audioPath)}`);

  const result = await alignAudio(audioPath, { engine, prompt });

  const outDir = path.join(episodeDir, "out");
  mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, "alignment.json");
  writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n");

  console.log(
    `done: ${result.words.length} words, ${result.duration.toFixed(1)}s → ${path.relative(process.cwd(), outPath)}`,
  );

  const scriptWords = scriptYaml !== undefined ? (narrationWords(scriptYaml)?.length ?? 0) : 0;
  const warning = lowCoverageWarning(result.words.length, scriptWords);
  if (warning) console.warn(warning);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
