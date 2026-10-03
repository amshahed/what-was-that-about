// `npm run short <episode-slug-or-dir> <start-beat> <end-beat>` — renders a 9:16 Short.
//
// Reads:  episodes/<slug>/notes/factcheck.md  (must contain "Status: ✅ approved")
//         episodes/<slug>/script.yml
//         episodes/<slug>/out/alignment.json
//         episodes/<slug>/audio/narration.wav
// Writes: episodes/<slug>/out/short-<start>-<end>.mp4

import path from "node:path";
import { readFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia } from "@remotion/renderer";
import { mapBeatsToTimeline } from "../render/timeline";
import { TONE_MUSIC, sfxFile, buildSfxEvents } from "../render/mix";
import { RenderAssets } from "./lib/render-assets";
import { loadEpisodeScenes, stageStills } from "./lib/scene-assets";
import { resolveEpisodeDir, requireFile, checkFactgate } from "./lib/episode";
import type { AlignmentResult } from "../render/align";
import type { ShortsProps } from "../render/remotion/compositions/Shorts";

const FPS = 30;

function usage(): never {
  console.error("usage: tsx scripts/short.ts <episode-slug-or-dir> <start-beat> <end-beat>");
  console.error("  start-beat, end-beat: 0-based indices into the script's beat list");
  process.exit(2);
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

  const scriptPath = requireFile(
    path.join(episodeDir, "script.yml"),
    "Write the episode script to episodes/<slug>/script.yml",
  );
  const alignmentPath = requireFile(
    path.join(episodeDir, "out", "alignment.json"),
    "Run: npm run align <slug>",
  );
  const audioPath = requireFile(
    path.join(episodeDir, "audio", "narration.wav"),
    "Place narration WAV at episodes/<slug>/audio/narration.wav",
  );

  const scenes = loadEpisodeScenes(episodeDir, scriptPath);
  const script = scenes.script;
  const alignment = JSON.parse(readFileSync(alignmentPath, "utf8")) as AlignmentResult;

  const allBeats = mapBeatsToTimeline(script.beats, alignment, FPS);

  if (endIdx >= allBeats.length) {
    console.error(`end-beat ${endIdx} out of range (episode has ${allBeats.length} beats)`);
    process.exit(2);
  }

  const musicFile = TONE_MUSIC[script.tone];
  const musicPath = path.resolve("shared", "music", musicFile);
  // Media for the render is staged into a public folder (out/ is gitignored).
  const assets = new RenderAssets(
    path.join(episodeDir, "out", `.render-public-short-${startIdx}-${endIdx}`),
  );
  // AI stills for the selected beats only: stops with the generate-scenes command if any are missing.
  for (const [i, name] of stageStills(
    episodeDir,
    slugArg!,
    scenes.plan,
    assets,
    startIdx,
    endIdx,
  )) {
    allBeats[i]!.still = name;
  }
  const musicSrc = existsSync(musicPath) ? assets.add(musicPath, `music/${musicFile}`) : "";
  if (!musicSrc) console.warn(`music bed not found: ${musicPath} (skipping)`);

  const sfxDir = path.resolve("shared", "sfx");
  const allSfxEvents = buildSfxEvents(allBeats, (name) => {
    const file = sfxFile(name);
    if (!file) {
      console.warn(`unknown SFX "${name}" (skipping)`);
      return null;
    }
    const p = path.join(sfxDir, file);
    if (!existsSync(p)) {
      console.warn(`SFX file not found: ${p} (skipping)`);
      return null;
    }
    return assets.add(p, `sfx/${file}`);
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

  // Stage every file before bundle(): it copies the public folder at bundle time.
  const audioSrc = assets.add(audioPath, "narration.wav");

  // bundle() writes a full copy (including the narration WAV) to %TEMP%; remove it afterwards.
  let serveUrl: string | undefined;
  try {
    console.log("bundling Remotion...");
    serveUrl = await bundle({
      entryPoint: path.resolve("render/remotion/index.ts"),
      publicDir: assets.dir,
    });

    const inputProps: ShortsProps = {
      beats: selectedBeats,
      audioSrc,
      audioStartFrame: offset,
      musicSrc,
      sfxEvents: selectedSfxEvents,
      totalFrames,
    };
    const inputPropsRecord = inputProps as unknown as Record<string, unknown>;

    const composition = await selectComposition({
      serveUrl,
      id: "shorts",
      inputProps: inputPropsRecord,
    });

    const outDir = path.join(episodeDir, "out");
    mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `short-${startIdx}-${endIdx}.mp4`);

    console.log(
      `rendering ${totalFrames} frames @ ${FPS}fps → ${path.relative(process.cwd(), outPath)}`,
    );

    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: outPath,
      inputProps: inputPropsRecord,
      overwrite: true,
    });

    console.log(
      `done: ${durationSec.toFixed(1)}s short → ${path.relative(process.cwd(), outPath)}`,
    );
  } finally {
    assets.dispose();
    if (serveUrl) rmSync(serveUrl, { recursive: true, force: true });
  }
}

main().catch((err: unknown) => {
  // Clear message for expected errors (bad script, unknown character); DEBUG=1 shows the stack.
  console.error(err instanceof Error ? (process.env.DEBUG ? err.stack : err.message) : err);
  process.exit(1);
});
