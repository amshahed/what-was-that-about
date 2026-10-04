// `npm run new-episode <book-slug>` — scaffold a new episode directory (book-first workflow).
//
// Creates:
//   episodes/<slug>/seed.md               — YOUR take: summary, explanation, analysis, review (+ tone tag)
//   episodes/<slug>/notes/source/          — put your copy of the book here (gitignored)
//   episodes/<slug>/notes/characters.md    — Claude, from the book: looks, roles, chapter refs
//   episodes/<slug>/notes/concepts.md      — Claude: the book's ideas and terms
//   episodes/<slug>/notes/plot.md          — Claude: chapter-by-chapter plot + short summary
//   episodes/<slug>/notes/analysis.md      — Claude's own reading of the book
//   episodes/<slug>/notes/research.md      — outside sources and the critical landscape
//   episodes/<slug>/notes/outline.md       — the merged plan for the video (you + Claude)
//   episodes/<slug>/notes/factcheck.md     — fact-check gate (must be approved before render)
//   episodes/<slug>/script.yml             — EDL script stub
//   episodes/<slug>/style.yml              — the episode's look: a preset from shared/styles/

import path from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { DEFAULT_PRESET, listPresets } from "./lib/scene-assets";

function usage(): never {
  console.error("usage: tsx scripts/new-episode.ts <book-slug>");
  console.error("  book-slug: kebab-case identifier, slug-only, e.g. ubik");
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

<!-- YOUR take on the book. Write it before you read Claude's notes, so the two takes stay
     independent; we merge them in notes/outline.md. Rough is fine — bullets, fragments, rants. -->

## Book
Title:
Author:
Year:
Read: yes / partial

## Tone tag
<!-- Pick one: light | balanced | heavy  (PRD §6.1)
     light    → 4–6 min,  ~40:60 substance:entertainment — pulpy, comedic, fun reads
     balanced → 4–8 min,  ~55:45 — most fiction (default)
     heavy    → 8–10 min, ~70:30 — philosophical, somber, dense; humor sprinkled, never flippant
     Also a scheduling lever: read it recently / lots to say → heavy; read it ages ago → light. -->
tone: balanced

## My summary
<!-- The story in your words. What happens, who matters. -->

## My explanation
<!-- The confusing parts, explained the way you understood them. -->

## My analysis
<!-- What the book is really about, open questions, your readings. -->

## My review
<!-- Honest verdict. Who should read it, who should not. -->

## Must include / gags
<!-- Bits you definitely want in the video. Vague intentions get cut. -->
1.
2.
3.

## What NOT to include
<!-- Tangents that dilute the angle. -->
`;
}

function characters(slug: string): string {
  return `# characters — ${slug}

<!-- Claude writes this from the book, in its own words, with chapter references (ch. N).
     It feeds the character files (episodes/${slug}/characters/<id>.yml) that keep each look
     the same in every image. One section per character who may appear in the video. -->

## <Character name>
- **Video role:** main (own look) | background (generic) | cut
- **Who they are:**
- **Look from the book:** face, hair, age, height, weight/build — with chapter refs
- **Clothing / props:**
- **Quirks / habits:**
- **Arc:**
- **Look we add (not in the book):** marked clearly, so the fact-check can tell them apart
`;
}

function concepts(slug: string): string {
  return `# concepts — ${slug}

<!-- Claude: the book's ideas and terms a viewer needs, with chapter refs. -->

## <Concept>
- **What it is:**
- **First appears:** ch. N
- **How it works in the book:** (ch. N)
- **Introduce when:** setup (needed before the story) | inline (when it first appears)
- **Visual idea:**
`;
}

function plot(slug: string): string {
  return `# plot — ${slug}

<!-- Claude: chapter by chapter, more detail than the video needs. Chapter refs make the
     fact-check fast. Ends with a short summary for the video. -->

## Chapter by chapter

### Ch. 1

## Short summary for the video
`;
}

function analysis(slug: string): string {
  return `# analysis — ${slug}

<!-- Claude's own reading. Written without seeing seed.md; we merge in outline.md. -->

## Open questions the book leaves

## Themes

## Interpretations

## Review points
`;
}

function research(slug: string): string {
  return `# research — ${slug}

## Claims to verify
<!-- Every factual claim from the script draft. Each line: [source needed] The claim as written. -->

## Verified facts
<!-- Move items here once sourced. Include: claim, source (book chapter, or URL/page). -->

## Critical landscape
<!-- Common readings, author background, what other analyses miss. Synthesize; never copy. -->

## Cut ideas
<!-- Good ideas that don't fit the angle. Park here, not in the script. -->

## Sources
`;
}

function outline(slug: string): string {
  return `# outline — ${slug}

<!-- The merged plan for the video: your take (seed.md) + Claude's notes. Agree on this before
     the script. Sections follow PRD §6.4. -->

## Angle

## Cast in the video
<!-- Main characters get an own look (characters/<id>.yml); everyone else is generic. Keep it small. -->

## Sections
<!-- Under each section: what it covers, characters/concepts introduced here, ~N beats. -->
### cold-open
### spoiler-warn-and-setup
<!-- Introduce only what the story needs first; everything else inline, when it appears. -->
### recap
### analysis
### verdict
<!-- From seed.md "My review" + Claude's review points (notes/analysis.md). -->

## Visual style for this episode
<!-- The look preset in episodes/${slug}/style.yml (shared/styles/). Compare looks first:
     npm run try-look ${slug} cartoon retro-pixel vintage -->
`;
}

function styleStub(slug: string): string {
  return `# Look for ${slug}: a preset from shared/styles/ (${listPresets().join(", ")}).
# Compare first: npm run try-look ${slug} ${listPresets().join(" ")}
# Change a field only when needed; it replaces the preset's field (e.g. suffix:, pixelate: false).
# A new look for several books: add shared/styles/<name>.yml. Changing the look later remakes every still.
preset: ${DEFAULT_PRESET}
`;
}

function factcheck(slug: string): string {
  return `# fact-check — ${slug}

Status: ⏳ pending

<!-- Change the status line above to the approved one (see docs/episode-workflow.md) ONLY after
     every claim below is verified.
     The render pipeline BLOCKS on this line — assemble and short will not run without it.
     See docs/episode-workflow.md, Stage 3b. Use the chapter refs in notes/plot.md. -->

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
# See kit/SCRIPT.md for the schema and docs/episode-workflow.md for the steps.
#
# Sections (PRD §6.4): cold-open → spoiler-warn-and-setup → recap → analysis → verdict.
# Mark them with YAML comments like the one below; the parser does not read [SECTION] tags yet.

id: ${slug}
tone: balanced

beats:
  # --- SECTION: cold-open ---
  - narration: |
      First line of narration. Hook the viewer in the first sentence.
    scene:
      # AI still: action, expression, setting. Characters' looks come from characters/<id>.yml.
      image: "a tired man argues with his front door; setting: a small cluttered apartment"
      # cast: [joe-chip]
    tags: [HOLD]

  - narration: |
      A text beat: one big word or number fills the frame.
    scene:
      layers:
        - component: bg:paper
        - component: text:hero
          props: { text: "HALF-LIFE", sub: "(not the video game)", color: red }
    tags: [ZOOM]

  # Add more beats. One idea per beat.
  # Tags: [HOLD] | [ZOOM] | ["SFX:record scratch"] | ["SFX:boing"] | ["SFX:ding"] | ["SFX:whoosh"]
`;
}

function main(): void {
  const slug = process.argv[2];
  if (!slug) usage();

  const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!slugPattern.test(slug)) {
    console.error(
      `book-slug must be kebab-case (lowercase letters, numbers, hyphens): got "${slug}"`,
    );
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

  for (const dir of ["notes", path.join("notes", "source"), "characters", "audio", "out"]) {
    mkdirSync(path.join(episodeDir, dir), { recursive: true });
  }

  safeWrite(path.join(episodeDir, "seed.md"), seed(slug));
  safeWrite(path.join(episodeDir, "notes", "characters.md"), characters(slug));
  safeWrite(path.join(episodeDir, "notes", "concepts.md"), concepts(slug));
  safeWrite(path.join(episodeDir, "notes", "plot.md"), plot(slug));
  safeWrite(path.join(episodeDir, "notes", "analysis.md"), analysis(slug));
  safeWrite(path.join(episodeDir, "notes", "research.md"), research(slug));
  safeWrite(path.join(episodeDir, "notes", "outline.md"), outline(slug));
  safeWrite(path.join(episodeDir, "notes", "factcheck.md"), factcheck(slug));
  safeWrite(path.join(episodeDir, "script.yml"), scriptStub(slug));
  safeWrite(path.join(episodeDir, "style.yml"), styleStub(slug));

  console.log("");
  console.log("next steps (docs/episode-workflow.md):");
  console.log(`  1. Put your copy of the book in episodes/${slug}/notes/source/ (gitignored)`);
  console.log(
    `  2. You: write your take in episodes/${slug}/seed.md (before reading Claude's notes)`,
  );
  console.log("  3. Claude: reads the book, writes notes/characters, concepts, plot, analysis");
  console.log("  4. Together: merge into notes/outline.md");
  console.log(
    `  5. Look + cast: npm run try-look ${slug} <presets> → preset: in style.yml; characters/ + reference sets`,
  );
  console.log(
    '  6. Together: the script; you: fact-check → "Status: ✅ approved" in notes/factcheck.md',
  );
  console.log(`  7. npm run generate-scenes ${slug} → review → record narration`);
  console.log(`  8. npm run align ${slug} → npm run assemble ${slug}`);
}

main();
