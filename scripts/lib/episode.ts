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

/** True only when a line reads exactly `Status: ✅ approved` (a mention in a comment does not count). */
export function isFactcheckApproved(text: string): boolean {
  return /^Status: ✅ approved\s*$/m.test(text);
}

export function checkFactgate(episodeDir: string): void {
  const factcheckPath = path.join(episodeDir, "notes", "factcheck.md");
  requireFile(
    factcheckPath,
    'Create episodes/<slug>/notes/factcheck.md containing "Status: ✅ approved" once you have verified the script.',
  );
  const content = readFileSync(factcheckPath, "utf8");
  if (!isFactcheckApproved(content)) {
    console.error("Render gate: factcheck.md has no line reading exactly 'Status: ✅ approved'.");
    console.error(`Add that line to ${factcheckPath} once the script has been fact-checked.`);
    process.exit(2);
  }
}
