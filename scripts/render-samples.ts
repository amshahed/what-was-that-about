// `npm run render:samples` — renders the house-style sample stills to kit/samples/.
// Downloads a headless Chrome shell on first run (local only; CI does not render).

import path from "node:path";
import { mkdirSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import { selectComposition, renderStill } from "@remotion/renderer";

const ids = ["poseidon-office", "poseidon-glory", "poseidon-tie"];

async function main() {
  const outDir = path.resolve("kit/samples");
  mkdirSync(outDir, { recursive: true });

  console.log("Bundling...");
  const serveUrl = await bundle({ entryPoint: path.resolve("render/remotion/index.ts") });

  for (const id of ids) {
    const composition = await selectComposition({ serveUrl, id });
    const output = path.join(outDir, `${id}.png`);
    await renderStill({ composition, serveUrl, output, overwrite: true });
    console.log("rendered ->", output);
  }
  console.log("done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
