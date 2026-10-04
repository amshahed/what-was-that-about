// `npm run assemble <episode-slug-or-dir>` — assembles the synced rough-cut MP4.
//
// Reads:  episodes/<slug>/notes/factcheck.md  (needs a line reading exactly "Status: ✅ approved")
//         episodes/<slug>/script.yml
//         episodes/<slug>/out/alignment.json
//         episodes/<slug>/audio/narration.wav
// Writes: episodes/<slug>/out/roughcut.mp4

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
import type { RoughCutProps } from "../render/remotion/compositions/RoughCut";

const FPS = 30;

function usage(): never {
  console.error("usage: tsx scripts/assemble.ts <episode-slug-or-dir>");
  process.exit(2);
}

async function main() {
  const arg = process.argv[2];
  if (!arg) usage();

  const episodeDir = resolveEpisodeDir(arg);

  checkFactgate(episodeDir);

  const scriptPath = requireFile(
    path.join(episodeDir, "script.yml"),
    "Run: write the episode script to episodes/<slug>/script.yml",
  );
  const alignmentPath = requireFile(
    path.join(episodeDir, "out", "alignment.json"),
    "Run: npm run align <slug>",
  );
  const audioPath = requireFile(
    path.join(episodeDir, "audio", "narration.wav"),
    "Place the narration WAV at episodes/<slug>/audio/narration.wav (WAV mono 44.1k 16-bit, peak -6..-3 dBFS).",
  );

  // Parses the script (cast ids checked against shared/characters) and plans its AI stills.
  const scenes = loadEpisodeScenes(episodeDir, scriptPath);
  const script = scenes.script;
  const alignment = JSON.parse(readFileSync(alignmentPath, "utf8")) as AlignmentResult;

  console.log(`assembling: ${script.id} (${script.tone}, ${script.beats.length} beats)`);
  console.log(`alignment: ${alignment.words.length} words, ${alignment.duration.toFixed(1)}s`);

  const beats = mapBeatsToTimeline(script.beats, alignment, FPS);
  const totalFrames = Math.ceil(alignment.duration * FPS);

  const musicFile = TONE_MUSIC[script.tone];
  const musicPath = path.resolve("shared", "music", musicFile);
  // Media for the render is staged into a public folder (out/ is gitignored).
  const assets = new RenderAssets(path.join(episodeDir, "out", ".render-public-roughcut"));
  // AI stills: stops with the generate-scenes command if any are missing.
  for (const [i, name] of stageStills(episodeDir, arg, scenes.plan, assets)) {
    beats[i]!.still = name;
    beats[i]!.pixelated = Boolean(scenes.style.pixelate);
  }
  const musicSrc = existsSync(musicPath) ? assets.add(musicPath, `music/${musicFile}`) : "";
  if (!musicSrc) console.warn(`music bed not found: ${musicPath} (skipping)`);

  const sfxDir = path.resolve("shared", "sfx");
  const sfxEvents = buildSfxEvents(beats, (name) => {
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

    const inputProps: RoughCutProps = {
      beats,
      audioSrc,
      musicSrc,
      sfxEvents,
      totalFrames,
    };
    // Remotion's inputProps type requires Record<string, unknown>; cast once here.
    const inputPropsRecord = inputProps as unknown as Record<string, unknown>;

    const composition = await selectComposition({
      serveUrl,
      id: "roughcut",
      inputProps: inputPropsRecord,
    });

    const outDir = path.join(episodeDir, "out");
    mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, "roughcut.mp4");

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

    const durationSec = totalFrames / FPS;
    console.log(
      `done: ${durationSec.toFixed(1)}s roughcut → ${path.relative(process.cwd(), outPath)}`,
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
