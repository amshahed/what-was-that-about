import path from "node:path";
import { readFileSync, existsSync, statSync } from "node:fs";

export function resolveEpisodeDir(arg: string): string {
  const asDirect = path.resolve(arg);
  const asSlug = path.resolve("episodes", arg);
  const candidates = asDirect === asSlug ? [asDirect] : [asSlug, asDirect];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isDirectory()) return candidate;
  }
  console.error(`episode directory not found: tried ${candidates.join(" and ")}`);
  process.exit(2);
}

export function requireFile(p: string, hint: string): string {
  if (!existsSync(p)) {
    console.error(`missing: ${p}`);
    console.error(hint);
    process.exit(2);
  }
  return p;
}

export function checkFactgate(episodeDir: string): void {
  const factcheckPath = path.join(episodeDir, "notes", "factcheck.md");
  requireFile(
    factcheckPath,
    'Create episodes/<slug>/notes/factcheck.md containing "Status: ✅ approved" once you have verified the script.',
  );
  const content = readFileSync(factcheckPath, "utf8");
  if (!content.includes("Status: ✅ approved")) {
    console.error("Render gate: factcheck.md does not contain 'Status: ✅ approved'.");
    console.error(`Add that line to ${factcheckPath} once the script has been fact-checked.`);
    process.exit(2);
  }
}
