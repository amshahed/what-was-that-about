// `npm run generate-scenes <slug> [-- options]` — makes the AI stills for an episode with local ComfyUI.
//
// Reads:  episodes/<slug>/script.yml, shared/characters/*.yml, shared/style.yml,
//         tools/comfyui/workflows/flux-gguf.api.json
// Writes: episodes/<slug>/scenes/<name>-<key>.png, scenes/manifest.json, out/scenes.html
//
// Options:
//   --only 2,5-7    only these beats (0-based, as in `npm run short`)
//   --force         regenerate even if the still is up to date
//   --dry-run       print the plan and prompts; do not contact ComfyUI
//   --reroll 7,12   make 3 new candidates for each beat (seed +1…+3); see out/scenes.html
//   --pick 7=2      keep candidate 2 of beat 7: pins its seed in script.yml
//   --prune         delete PNGs that no beat uses (including unpicked candidates)
//   --keep-loaded   leave the models in VRAM afterwards (faster next run; blocks npm run align)
// Server: COMFY_URL (default http://127.0.0.1:8188).

import path from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { resolveEpisodeDir, requireFile } from "./lib/episode";
import {
  loadEpisodeScenes,
  readManifest,
  scenesDir,
  writeManifest,
  type EpisodeScenes,
} from "./lib/scene-assets";
import { renderScenesPage } from "./lib/scenes-page";
import { setSceneSeed } from "./lib/script-edit";
import {
  authorKey,
  parseBeatList,
  renderKey,
  stillFileName,
  TOKEN_WARNING,
  type Manifest,
  candidateSeeds,
  currentCandidates,
  type PlannedStill,
} from "../render/scene-prompt";
import {
  buildWorkflow,
  ComfyClient,
  ComfyError,
  DEFAULT_COMFY_URL,
  templateModels,
} from "../render/comfy";

const CANDIDATES = 3;
const FIRST_DEADLINE_MS = 600_000; // includes the cold model load
const DEADLINE_MS = 300_000;

interface Options {
  slug: string;
  only?: number[];
  force: boolean;
  dryRun: boolean;
  reroll?: number[];
  pick?: Array<[number, number]>;
  prune: boolean;
  keepLoaded: boolean;
}

function usage(): never {
  console.error(
    "usage: npm run generate-scenes <slug> [-- --only 2,5-7 | --force | --dry-run | --reroll 7,12 | --pick 7=2 | --prune]",
  );
  process.exit(2);
}

const NPM_EATEN = ["only", "force", "dry_run", "reroll", "pick", "prune", "keep_loaded"];

function parseArgs(argv: string[]): Options {
  // Without `--`, npm keeps flags such as --dry-run for itself (and drops them silently).
  const eaten = NPM_EATEN.filter((k) => process.env[`npm_config_${k}`] !== undefined);
  if (eaten.length > 0) {
    throw new Error(
      `npm took --${eaten[0]!.replace("_", "-")} for itself. Put -- before the options: ` +
        "npm run generate-scenes <slug> -- --dry-run",
    );
  }
  const [slug, ...rest] = argv;
  if (!slug || slug.startsWith("-")) usage();
  const o: Options = { slug, force: false, dryRun: false, prune: false, keepLoaded: false };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]!;
    const val = () => rest[++i] ?? usage();
    if (a === "--only") o.only = parseBeatList(val());
    else if (a === "--force") o.force = true;
    else if (a === "--dry-run") o.dryRun = true;
    else if (a === "--reroll") o.reroll = parseBeatList(val());
    else if (a === "--pick") {
      o.pick = val()
        .split(",")
        .map((p) => {
          const m = /^(\d+)=(\d+)$/.exec(p.trim());
          if (!m) throw new Error(`bad --pick "${p}" (use beat=candidate, e.g. 7=2)`);
          return [Number(m[1]), Number(m[2])] as [number, number];
        });
    } else if (a === "--prune") o.prune = true;
    else if (a === "--keep-loaded") o.keepLoaded = true;
    else if (!a.startsWith("-")) {
      throw new Error(
        `unexpected "${a}" — did you forget -- before the options? (npm run generate-scenes <slug> -- --only 3)`,
      );
    } else throw new Error(`unknown option "${a}"`);
  }
  return o;
}

interface Job {
  still: PlannedStill;
  seed: number;
  file: string;
  candidateNo?: number;
}

function fmt(sec: number): string {
  return sec >= 60
    ? `${Math.floor(sec / 60)}m${String(Math.round(sec % 60)).padStart(2, "0")}s`
    : `${Math.round(sec)}s`;
}

function writePage(
  episodeDir: string,
  slug: string,
  ep: EpisodeScenes,
  fresh: Set<string>,
): string {
  const outDir = path.join(episodeDir, "out");
  mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, "scenes.html");
  writeFileSync(
    file,
    renderScenesPage({
      slug,
      script: ep.script,
      plan: ep.plan,
      manifest: ep.manifest,
      fresh,
      scenesHref: "../scenes",
    }),
  );
  return file;
}

/** --pick: pin the chosen candidate's seed in script.yml (only the seed text changes). */
function pickCandidates(
  scriptPath: string,
  ep: EpisodeScenes,
  picks: Array<[number, number]>,
): void {
  let text = readFileSync(scriptPath, "utf8");
  for (const [beat, no] of picks) {
    const still = ep.plan.stills.find((s) => s.beat === beat);
    if (!still) throw new Error(`beat ${beat} is not an AI-still beat`);
    const entry = currentCandidates(ep.manifest, beat, still.scene.image).find(
      (e) => e.candidateNo === no,
    );
    if (!entry) throw new Error(`no candidate ${no} for beat ${beat} — run --reroll ${beat} first`);
    text = setSceneSeed(text, beat, entry.seed);
    // The pick is now the beat's still; the other candidates become unused (see --prune).
    for (const e of currentCandidates(ep.manifest, beat, still.scene.image)) {
      delete e.candidateFor;
      delete e.candidateNo;
    }
    entry.seedSource = "pinned";
    console.log(`beat ${beat}: kept candidate ${no} (seed ${entry.seed})`);
  }
  writeFileSync(scriptPath, text);
  writeManifest(path.dirname(scriptPath), ep.manifest);
}

const COMFY_DIR = process.env.COMFYUI_DIR ?? "C:\\ComfyUI";
const LAUNCHER = "run_nvidia_gpu_lan.bat";

/** When ComfyUI is meant to run on this PC and is not up, start it in its own window and wait. */
async function startComfyIfLocal(client: ComfyClient): Promise<void> {
  const local = /^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(client.baseUrl);
  if (!local || process.platform !== "win32" || (await client.ping())) return;
  if (!existsSync(path.join(COMFY_DIR, LAUNCHER))) return; // preflight explains what to do
  console.log(
    `ComfyUI is not running — starting ${path.join(COMFY_DIR, LAUNCHER)} in a new window ...`,
  );
  spawn("cmd.exe", ["/c", "start", '"ComfyUI"', "/D", COMFY_DIR, LAUNCHER], {
    detached: true,
    stdio: "ignore",
    windowsVerbatimArguments: true,
  }).unref();
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    if (await client.ping()) {
      console.log("ComfyUI is up.");
      return;
    }
  }
  // Fall through: preflight reports that it is not reachable.
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const episodeDir = resolveEpisodeDir(opts.slug);
  const scriptPath = requireFile(
    path.join(episodeDir, "script.yml"),
    "Write the episode script first.",
  );
  let ep = loadEpisodeScenes(episodeDir, scriptPath);

  if (opts.pick) {
    pickCandidates(scriptPath, ep, opts.pick);
    ep = loadEpisodeScenes(episodeDir, scriptPath);
  }

  const beatCount = ep.script.beats.length;
  for (const n of [...(opts.only ?? []), ...(opts.reroll ?? [])]) {
    if (n >= beatCount)
      throw new Error(`beat ${n} does not exist (the script has beats 0–${beatCount - 1})`);
  }
  const selected = ep.plan.stills.filter((s) => !opts.only || opts.only.includes(s.beat));
  for (const n of opts.only ?? []) {
    if (!ep.plan.stills.some((s) => s.beat === n))
      console.warn(`beat ${n} is a code-kit scene; nothing to generate`);
  }

  // What to make: stills that are missing/stale (or all with --force), plus --reroll candidates.
  const jobs: Job[] =
    opts.reroll || opts.pick
      ? []
      : selected
          .filter((s) => opts.force || s.status !== "fresh")
          .map((s) => ({ still: s, seed: s.seed, file: s.file }));
  for (const beat of opts.reroll ?? []) {
    const still = ep.plan.stills.find((s) => s.beat === beat);
    if (!still)
      throw new Error(`beat ${beat} is a code-kit scene; only AI stills can be re-rolled`);
    // Each round continues after the highest seed tried so far, so a second --reroll gives new images.
    for (const [n, seed] of candidateSeeds(
      ep.manifest,
      beat,
      still.scene.image,
      still.seed,
      CANDIDATES,
    ).entries()) {
      const file = stillFileName(
        still.scene.image,
        authorKey(still.scene.image, still.scene.cast, seed),
      );
      jobs.push({ still, seed, file, candidateNo: n + 1 });
    }
  }

  const counts = { fresh: 0, stale: 0, missing: 0 };
  for (const s of selected) counts[s.status]++;
  console.log(
    `${ep.script.id}: ${ep.plan.stills.length} AI stills (${counts.fresh} up to date, ${counts.stale} stale, ${counts.missing} missing); ${jobs.length} to make`,
  );
  for (const s of selected) {
    if (s.tokens > TOKEN_WARNING)
      console.warn(`beat ${s.beat}: prompt is long (~${s.tokens} tokens); Flux may ignore the end`);
  }

  if (opts.dryRun) {
    const queued = new Set(jobs.map((j) => j.still.beat));
    for (const s of selected.filter((x) => !queued.has(x.beat))) {
      console.log(
        `\nbeat ${s.beat} · seed ${s.seed} · ${s.status} → scenes/${s.file}\n  ${s.prompt}`,
      );
    }
    for (const j of jobs) {
      console.log(
        `\nbeat ${j.still.beat} · seed ${j.seed}${j.candidateNo ? ` · candidate ${j.candidateNo}` : ""} → scenes/${j.file}\n  ${j.still.prompt}`,
      );
    }
    if (ep.plan.orphans.length > 0) {
      console.log(`\nunused PNGs (--prune would delete): ${ep.plan.orphans.join(", ")}`);
    }
    console.log(
      `\nreview page: ${pathToFileURL(writePage(episodeDir, opts.slug, ep, new Set())).href}`,
    );
    return;
  }

  if (opts.prune) {
    for (const f of ep.plan.orphans) {
      rmSync(path.join(scenesDir(episodeDir), f), { force: true });
      delete ep.manifest.beats[f];
    }
    for (const f of Object.keys(ep.manifest.beats)) {
      if (!existsSync(path.join(scenesDir(episodeDir), f))) delete ep.manifest.beats[f];
    }
    writeManifest(episodeDir, ep.manifest);
    console.log(`pruned ${ep.plan.orphans.length} unused PNG(s)`);
    ep = loadEpisodeScenes(episodeDir, scriptPath);
  }

  const fresh = new Set<string>();
  if (jobs.length > 0) {
    const client = new ComfyClient(process.env.COMFY_URL ?? DEFAULT_COMFY_URL);
    await startComfyIfLocal(client);
    const { version } = await client.preflight(templateModels(ep.workflow.template));
    console.log(`ComfyUI ${version} at ${client.baseUrl}`);
    process.once("SIGINT", () => {
      console.error("\ninterrupted — cancelling the running job");
      void client.interrupt().finally(() => process.exit(130));
    });

    const manifest: Manifest = readManifest(episodeDir, ep.script.id);
    for (const beat of opts.reroll ?? []) {
      const still = ep.plan.stills.find((x) => x.beat === beat)!;
      for (const e of currentCandidates(manifest, beat, still.scene.image)) {
        delete e.candidateFor;
        delete e.candidateNo;
      }
    }
    const dir = scenesDir(episodeDir);
    mkdirSync(dir, { recursive: true });
    const times: number[] = [];
    const failures: string[] = [];
    for (let k = 0; k < jobs.length; k++) {
      const j = jobs[k]!;
      const t0 = Date.now();
      try {
        const workflow = buildWorkflow(ep.workflow.template, {
          prompt: j.still.prompt,
          seed: j.seed,
          width: ep.style.width,
          height: ep.style.height,
          steps: ep.style.steps,
          guidance: ep.style.guidance,
          prefix: `wwta/${ep.script.id}/${j.file.replace(/\.png$/, "")}`,
        });
        const png = await client.generate(workflow, k === 0 ? FIRST_DEADLINE_MS : DEADLINE_MS);
        const target = path.join(dir, j.file);
        writeFileSync(`${target}.tmp`, png);
        renameSync(`${target}.tmp`, target);
        const seconds = (Date.now() - t0) / 1000;
        manifest.beats[j.file] = {
          beat: j.still.beat,
          image: j.still.scene.image,
          cast: j.still.scene.cast,
          seed: j.seed,
          seedSource: j.candidateNo ? "derived" : j.still.seedSource,
          // Same key as planScenes() computes, so a picked candidate counts as up to date.
          renderKey: renderKey(j.still.prompt, j.seed, ep.style, ep.workflow.hash),
          prompt: j.still.prompt,
          width: ep.style.width,
          height: ep.style.height,
          seconds: Math.round(seconds),
          generatedAt: new Date().toISOString(),
          ...(j.candidateNo && { candidateFor: j.still.beat, candidateNo: j.candidateNo }),
        };
        writeManifest(episodeDir, manifest);
        fresh.add(j.file);
        times.push(seconds);
        const recent = times.slice(-5);
        const eta = (recent.reduce((a, b) => a + b, 0) / recent.length) * (jobs.length - k - 1);
        console.log(
          `[${k + 1}/${jobs.length}] beat ${j.still.beat} · seed ${j.seed}${j.candidateNo ? ` · candidate ${j.candidateNo}` : ""} · ${fmt(seconds)} · ETA ${fmt(eta)}`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        failures.push(`beat ${j.still.beat}: ${msg}`);
        console.error(`[${k + 1}/${jobs.length}] beat ${j.still.beat} failed: ${msg}`);
        // A server that is down will fail every job; stop instead of waiting through each one.
        if (err instanceof ComfyError && /cannot reach|not responding/.test(msg)) break;
      }
    }
    if (!opts.keepLoaded && (await client.free())) {
      console.log("ComfyUI models unloaded (VRAM free for npm run align).");
    }
    ep = loadEpisodeScenes(episodeDir, scriptPath);
    if (failures.length > 0) {
      console.error(`\n${failures.length} still(s) failed:\n  ${failures.join("\n  ")}`);
      process.exitCode = 1;
    }
  }

  if (ep.plan.orphans.length > 0 && !opts.prune) {
    console.log(
      `${ep.plan.orphans.length} unused PNG(s) in scenes/ (old takes / candidates); --prune deletes them`,
    );
  }
  console.log(`review page: ${pathToFileURL(writePage(episodeDir, opts.slug, ep, fresh)).href}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
