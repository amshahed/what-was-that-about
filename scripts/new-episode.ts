// `npm run new-episode <book-slug>` — scaffold a new episode directory.
//
// Creates:
//   episodes/<slug>/seed.md         — book selection + tone tag
//   episodes/<slug>/notes/research.md  — research + claims to verify
//   episodes/<slug>/notes/factcheck.md — fact-check gate (must be approved before render)
//   episodes/<slug>/script.yml       — EDL script stub

import path from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

function usage(): never {
  console.error("usage: tsx scripts/new-episode.ts <book-slug>");
  console.error("  book-slug: kebab-case identifier, e.g. ubik-philip-k-dick");
  process.exit(2);
}

function safeWrite(filePath: string, content: string): void {
  if (existsSync(filePath)) {
    console.log(`  skip (exists): ${path.relative(process.cwd(), filePath)}`);
    return;
  }
  writeFileSync(filePath, content, "utf8");
  console.log(`  created: ${path.relative(process.cwd(), filePath)}`);
}

function seed(slug: string): string {
  return `# seed — ${slug}

## Book
Title:
Author:
Year:
Read: yes / partial

## Angle
<!-- One paragraph: what's YOUR take? What's the interesting or funny hook for this book?
     This is what separates us from a Wikipedia summary. Be specific. -->

## Tone tag
<!-- Pick one: light | balanced | heavy | balanced-heavy
     light          → 4–6 min, high joke density, snappy pace, audience already knows the book
     balanced       → 6–10 min, mix of laughs and genuine insight, works for most books
     heavy          → 10–15 min, longer analysis, heavier material (philosophy, dark themes)
     balanced-heavy → 8–12 min, dense material but keep it funny
     Default: balanced -->
tone: balanced

## Runtime target
<!-- Rough narration target follows from tone:
     light: 600–900 words | balanced: 900–1400 | heavy: 1400–2100 | balanced-heavy: 1100–1700 -->

## Key jokes / gags
<!-- 3–5 concrete bits you definitely want to include. Vague intentions get cut. -->
1.
2.
3.

## What NOT to include
<!-- Scenes or tangents that seem relevant but dilute the angle. Cut early. -->
`;
}

function research(slug: string): string {
  return `# research — ${slug}

## Claims to verify
<!-- List every factual claim from the script draft that needs verification.
     Each line: [source needed] The claim as written in the script. -->

## Verified facts
<!-- Move items here once sourced. Include: claim, source, URL/page. -->

## Cut ideas
<!-- Good ideas that don't fit the angle. Park here, not in the script. -->

## Sources
<!-- Key references used in research. -->
`;
}

function factcheck(slug: string): string {
  return `# fact-check — ${slug}

Status: ⏳ pending

<!-- Change to "Status: ✅ approved" ONLY after every claim below is verified.
     The render pipeline BLOCKS on this line — assemble and short will not run without it.
     See docs/episode-workflow.md §3a for the fact-check protocol. -->

## Checks

| # | Claim (as in script) | Verdict | Source |
|---|----------------------|---------|--------|
| 1 |                      | ⏳      |        |

## Notes
<!-- Corrections made to the script after fact-check, any caveats for the video description. -->
`;
}

function scriptStub(slug: string): string {
  return `# Episode script — ${slug}
# See kit/SCRIPT.md for the full tag grammar and component catalogue.
# Run \`npm run align <slug>\` after recording narration.
# Run \`npm run assemble <slug>\` to render the rough cut.

id: ${slug}
tone: balanced

beats:
  - narration: |
      <!-- First line of narration. Hook the viewer in the first sentence. -->
    scene:
      layers:
        - component: bg:cave-office   # replace with your opening scene
        - component: actor:poseidon
          props: { x: 760, y: 430, pose: sitting }
    tags: [HOLD]

  - narration: |
      <!-- Main body beat. One idea per beat — don't stack multiple points here. -->
    scene:
      layers:
        - component: bg:sea-glory
        - component: actor:poseidon
          props: { x: 940, y: 300, pose: glory }
    tags: [ZOOM]

  - narration: |
      <!-- Punch line beat. The comedic payoff. -->
    scene:
      layers:
        - component: bg:office-wall
        - component: actor:poseidon
          props: { x: 820, y: 360, pose: tie }
    tags: ["SFX:record scratch"]

  # Add more beats here. Keep each beat to one visual idea.
  # Tags: [HOLD] | [ZOOM] | ["SFX:record scratch"] | ["SFX:boing"] | ["SFX:ding"] | ["SFX:whoosh"]
  # See shared/assets.md for the full SFX catalogue.
`;
}

function main(): void {
  const slug = process.argv[2];
  if (!slug) usage();

  const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!slugPattern.test(slug)) {
    console.error(`book-slug must be kebab-case (lowercase letters, numbers, hyphens): got "${slug}"`);
    process.exit(2);
  }

  const episodeDir = path.resolve("episodes", slug);
  if (existsSync(episodeDir)) {
    console.log(`episode directory already exists: ${path.relative(process.cwd(), episodeDir)}`);
    console.log("adding any missing files:");
  } else {
    mkdirSync(episodeDir, { recursive: true });
    console.log(`scaffolding: ${path.relative(process.cwd(), episodeDir)}/`);
  }

  mkdirSync(path.join(episodeDir, "notes"), { recursive: true });
  mkdirSync(path.join(episodeDir, "audio"), { recursive: true });
  mkdirSync(path.join(episodeDir, "out"), { recursive: true });

  safeWrite(path.join(episodeDir, "seed.md"), seed(slug));
  safeWrite(path.join(episodeDir, "notes", "research.md"), research(slug));
  safeWrite(path.join(episodeDir, "notes", "factcheck.md"), factcheck(slug));
  safeWrite(path.join(episodeDir, "script.yml"), scriptStub(slug));

  console.log("");
  console.log("next steps:");
  console.log(`  1. Fill in episodes/${slug}/seed.md — angle + tone tag`);
  console.log(`  2. Draft episodes/${slug}/script.yml — EDL beats`);
  console.log(`  3. Fill in episodes/${slug}/notes/research.md — verify all claims`);
  console.log(`  4. Set "Status: ✅ approved" in notes/factcheck.md`);
  console.log(`  5. Record narration → episodes/${slug}/audio/narration.wav`);
  console.log(`  6. npm run align ${slug}`);
  console.log(`  7. npm run assemble ${slug}`);
  console.log("See docs/episode-workflow.md for the full workflow.");
}

main();
