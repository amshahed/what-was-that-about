// `npm run short <episode-slug-or-dir> <start-beat> <end-beat>` — renders a 9:16 Short.
//
// Reads:  episodes/<slug>/notes/factcheck.md  (must contain "Status: ✅ approved")
//         episodes/<slug>/script.yml
//         episodes/<slug>/out/alignment.json
//         episodes/<slug>/audio/narration.wav
// Writes: episodes/<slug>/out/short-<start>-<end>.mp4

import path from "node:path";
import { pathToFileURL } from "node:url";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia } from "@remotion/renderer";
import { parseScript } from "../kit/script-parser";
import { mapBeatsToTimeline } from "../render/timeline";
import { TONE_MUSIC, SFX_FILES, buildSfxEvents } from "../render/mix";
import type { AlignmentResult } from "../render/align";
import type { ShortsProps } from "../render/remotion/compositions/Shorts";

const FPS = 30;

function usage(): never {
  console.error("usage: tsx scripts/short.ts <episode-slug-or-dir> <start-beat> <end-beat>");
  console.error("  start-beat, end-beat: 0-based indices into the script's beat list");
  process.exit(2);
}

function resolveEpisodeDir(arg: string): string {
  const asDirect = path.resolve(arg);
  const asSlug = path.resolve("episodes", arg);
  const candidates = asDirect === asSlug ? [asDirect] : [asSlug, asDirect];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isDirectory()) return candidate;
  }
  console.error(`episode directory not found: tried ${candidates.join(" and ")}`);
  process.exit(2);
}

function requireFile(p: string, hint: string): string {
  if (!existsSync(p)) {
    console.error(`missing: ${p}`);
    console.error(hint);
    process.exit(2);
  }
  return p;
}

function checkFactgate(episodeDir: string): void {
  const factcheckPath = path.join(episodeDir, "notes", "factcheck.md");
  requireFile(
    factcheckPath,
    'Create episodes/<slug>/notes/factcheck.md containing "Status: ✅ approved" once you have verified the script.',
  );
  const content = readFileSync(factcheckPath, "utf8");
  if (!content.includes("Status: ✅ approved")) {
    console.error("Render gate: factcheck.md does not contain 'Status: ✅ approved'.");
    process.exit(2);
  }
}

async function main() {
  const [, , slugArg, startArg, endArg] = process.argv;
  if (!slugArg || !startArg || !endArg) usage();

  const startIdx = parseInt(startArg!, 10);
  const endIdx = parseInt(endArg!, 10);
  if (isNaN(startIdx) || isNaN(endIdx) || startIdx < 0 || endIdx < startIdx) {
    console.error("start-beat and end-beat must be non-negative integers with start <= end");
    process.exit(2);
  }

  const episodeDir = resolveEpisodeDir(slugArg!);
  checkFactgate(episodeDir);

  const scriptPath = requireFile(path.join(episodeDir, "script.yml"), "Write the episode script to episodes/<slug>/script.yml");
  const alignmentPath = requireFile(path.join(episodeDir, "out", "alignment.json"), "Run: npm run align <slug>");
  const audioPath = requireFile(path.join(episodeDir, "audio", "narration.wav"), "Place narration WAV at episodes/<slug>/audio/narration.wav");

  const script = parseScript(readFileSync(scriptPath, "utf8"));
  const alignment = JSON.parse(readFileSync(alignmentPath, "utf8")) as AlignmentResult;

  const allBeats = mapBeatsToTimeline(script.beats, alignment, FPS);

  if (endIdx >= allBeats.length) {
    console.error(`end-beat ${endIdx} out of range (episode has ${allBeats.length} beats)`);
    process.exit(2);
  }

  const musicFile = TONE_MUSIC[script.tone];
  const musicPath = path.resolve("shared", "music", musicFile);
  const musicSrc = existsSync(musicPath) ? pathToFileURL(musicPath).href : "";
  if (!musicSrc) console.warn(`music bed not found: ${musicPath} (skipping)`);

  const sfxDir = path.resolve("shared", "sfx");
  const allSfxEvents = buildSfxEvents(allBeats, (name) => {
    const file = SFX_FILES[name];
    if (!file) { console.warn(`unknown SFX "${name}" (skipping)`); return null; }
    const p = path.join(sfxDir, file);
    if (!existsSync(p)) { console.warn(`SFX file not found: ${p} (skipping)`); return null; }
    return pathToFileURL(p).href;
  });

  // Re-time selected beats to start at frame 0.
  const offset = allBeats[startIdx]!.startFrame;
  const endBoundary = allBeats[endIdx]!.startFrame + allBeats[endIdx]!.durationFrames;
  const selectedBeats = allBeats.slice(startIdx, endIdx + 1).map((b) => ({
    ...b,
    startFrame: b.startFrame - offset,
  }));
  const selectedSfxEvents = allSfxEvents
    .filter((e) => e.startFrame >= offset && e.startFrame < endBoundary)
    .map((e) => ({ ...e, startFrame: e.startFrame - offset }));
  const totalFrames = selectedBeats.at(-1)!.startFrame + selectedBeats.at(-1)!.durationFrames;

  const durationSec = totalFrames / FPS;
  console.log(`short: beats ${startIdx}–${endIdx} (${durationSec.toFixed(1)}s @ ${FPS}fps)`);

  console.log("bundling Remotion...");
  const serveUrl = await bundle({ entryPoint: path.resolve("render/remotion/index.ts") });

  const inputProps: ShortsProps = {
    beats: selectedBeats,
    audioSrc: pathToFileURL(path.resolve(audioPath)).href,
    audioStartFrame: offset,
    musicSrc,
    sfxEvents: selectedSfxEvents,
    totalFrames,
  };
  const inputPropsRecord = inputProps as unknown as Record<string, unknown>;

  const composition = await selectComposition({ serveUrl, id: "shorts", inputProps: inputPropsRecord });

  const outDir = path.join(episodeDir, "out");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `short-${startIdx}-${endIdx}.mp4`);

  console.log(`rendering ${totalFrames} frames @ ${FPS}fps → ${path.relative(process.cwd(), outPath)}`);

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: outPath,
    inputProps: inputPropsRecord,
    overwrite: true,
  });

  console.log(`done: ${durationSec.toFixed(1)}s short → ${path.relative(process.cwd(), outPath)}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
