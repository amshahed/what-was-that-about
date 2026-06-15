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
  // Accept either the slug ("ubik") or a full/relative path to the episode dir.
  // path.resolve discards earlier segments when it hits an absolute component, so
  // avoid probing the same path twice when arg is already absolute.
  const asDirect = path.resolve(arg);
  const asSlug = path.resolve("episodes", arg);
  const candidates = asDirect === asSlug ? [asDirect] : [asSlug, asDirect];

  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isDirectory()) return candidate;
  }

  const tried = candidates.join(" and ");
  console.error(`episode directory not found: tried ${tried}`);
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
  console.error(err);
  process.exit(1);
});
