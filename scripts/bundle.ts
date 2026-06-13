// `npm run build` — bundles the Remotion project (no Chrome needed).
// Used as the CI compile check: if components don't compile, this fails.

import path from "node:path";
import { bundle } from "@remotion/bundler";

async function main() {
  const serveUrl = await bundle({
    entryPoint: path.resolve("render/remotion/index.ts"),
  });
  console.log("Remotion bundle OK ->", serveUrl);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
