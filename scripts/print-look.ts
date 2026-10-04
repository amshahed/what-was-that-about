// `tsx scripts/print-look.ts <episode-dir | style.yml | preset>` — prints the resolved look as JSON:
// { "name": ..., "file": ..., "style": { prefix, suffix, ..., pixelate? } }.
// character_refs.py calls this, so Python uses exactly the presets and rules of generate-scenes.

import { resolveLookArg } from "./lib/scene-assets";

const arg = process.argv[2];
if (!arg) {
  console.error("usage: tsx scripts/print-look.ts <episode-dir | style.yml | preset>");
  process.exit(2);
}
try {
  console.log(JSON.stringify(resolveLookArg(arg)));
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
