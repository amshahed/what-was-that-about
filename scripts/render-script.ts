// `npm run render:script <episode-dir>` — renders one PNG per beat from
// <episode-dir>/script.yml into <episode-dir>/out/stills/beat-NNN.png.
//
// Uses the `beat-still` parameterised composition: one Composition,
// per-beat SceneSpec passed via Remotion's inputProps. No per-episode
// changes to Root.

import path from "node:path";
import { mkdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import { selectComposition, renderStill } from "@remotion/renderer";
import { parseScript } from "../kit/script-parser";

function usage(): never {
  console.error("usage: tsx scripts/render-script.ts <episode-dir-or-script.yml>");
  process.exit(2);
}

function resolveScriptPath(arg: string): { scriptPath: string; episodeDir: string } {
  const p = path.resolve(arg);
  if (!existsSync(p)) {
    console.error(`not found: ${p}`);
    process.exit(2);
  }
  if (statSync(p).isDirectory()) {
    const sp = path.join(p, "script.yml");
    if (!existsSync(sp)) {
      console.error(`no script.yml in ${p}`);
      process.exit(2);
    }
    return { scriptPath: sp, episodeDir: p };
  }
  return { scriptPath: p, episodeDir: path.dirname(p) };
}

async function main() {
  const arg = process.argv[2];
  if (!arg) usage();

  const { scriptPath, episodeDir } = resolveScriptPath(arg);
  const script = parseScript(readFileSync(scriptPath, "utf8"));

  const outDir = path.join(episodeDir, "out", "stills");
  mkdirSync(outDir, { recursive: true });

  console.log(`script: ${scriptPath}`);
  console.log(`episode: ${script.id} (${script.tone}, ${script.beats.length} beats)`);
  console.log("bundling Remotion...");
  const serveUrl = await bundle({ entryPoint: path.resolve("render/remotion/index.ts") });

  // Reuse the single composition for every beat; pass each beat's SceneSpec via inputProps.
  const width = 4; // beat-001, beat-002, ...
  for (let i = 0; i < script.beats.length; i++) {
    const beat = script.beats[i]!;
    const composition = await selectComposition({
      serveUrl,
      id: "beat-still",
      inputProps: { spec: beat.scene },
    });
    const n = String(i + 1).padStart(width, "0");
    const output = path.join(outDir, `beat-${n}.png`);
    await renderStill({
      composition,
      serveUrl,
      output,
      overwrite: true,
      inputProps: { spec: beat.scene },
    });
    console.log(`  beat ${n} -> ${path.relative(episodeDir, output)}`);
  }
  console.log("done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
