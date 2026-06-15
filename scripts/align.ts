// `npm run align <episode-slug-or-dir>` — runs forced alignment on the
// episode's narration WAV and writes word timestamps to out/alignment.json.
//
// Reads:  episodes/<slug>/audio/narration.wav
// Writes: episodes/<slug>/out/alignment.json

import path from "node:path";
import { mkdirSync, writeFileSync, existsSync, statSync } from "node:fs";
import { alignAudio } from "../render/align";

function usage(): never {
  console.error("usage: tsx scripts/align.ts <episode-slug-or-dir>");
  process.exit(2);
}

function resolveEpisodeDir(arg: string): string {
  // Accept either the slug ("ubik") or a full path to the episode dir.
  const asSlug = path.resolve("episodes", arg);
  const asDirect = path.resolve(arg);

  for (const candidate of [asSlug, asDirect]) {
    if (existsSync(candidate) && statSync(candidate).isDirectory()) return candidate;
  }

  // Not found as a directory — try treating arg as a slug that doesn't exist yet.
  console.error(`episode directory not found: tried ${asSlug} and ${asDirect}`);
  process.exit(2);
}

async function main() {
  const arg = process.argv[2];
  if (!arg) usage();

  const episodeDir = resolveEpisodeDir(arg);
  const audioPath = path.join(episodeDir, "audio", "narration.wav");

  if (!existsSync(audioPath)) {
    console.error(`audio file not found: ${audioPath}`);
    console.error(
      "Record narration and place it at episodes/<slug>/audio/narration.wav (WAV mono 44.1k 16-bit, peak -6..-3 dBFS).",
    );
    process.exit(2);
  }

  if (!audioPath.endsWith(".wav")) {
    console.warn(
      `warning: expected a .wav file (audio contract §8.3) but got ${path.basename(audioPath)} — proceeding anyway`,
    );
  }

  console.log(`aligning: ${path.relative(process.cwd(), audioPath)}`);

  const result = await alignAudio(audioPath);

  const outDir = path.join(episodeDir, "out");
  mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, "alignment.json");
  writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n");

  console.log(
    `done: ${result.words.length} words, ${result.duration.toFixed(1)}s → ${path.relative(process.cwd(), outPath)}`,
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
