// `npm run try-look <slug> <look> [look ...] [-- --beats 0,3]` — the same few beats in each look,
// side by side, so you can choose the episode's look before making every still.
//
// A look is a preset name (cartoon, retro-pixel, vintage), "episode" (the episode's own
// style.yml, with its changes) or a path to a style file.
// Reads:  episodes/<slug>/script.yml, the episode's and the channel's characters, shared/styles/*.yml
// Writes: episodes/<slug>/out/looks/<look>/<n>.png and out/looks.html. Never touches scenes/.
//
// Beats: --beats, else the first 3 AI-still beats; neutral probe images fill up to 3.
// Seeds: each beat's own seed, so the images differ only in look. ~1 min per image.
// Server: COMFY_URL (default http://127.0.0.1:8188).

import path from "node:path";
import { pathToFileURL } from "node:url";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { parseScript } from "../kit/script-parser";
import { isImageScene, type ImageScene } from "../kit/script";
import { resolveEpisodeDir, requireFile } from "./lib/episode";
import {
  listPresets,
  loadCharacters,
  loadLook,
  loadWorkflow,
  resolveLookArg,
} from "./lib/scene-assets";
import { renderLooksPage, type LookProbe } from "./lib/looks-page";
import { startComfyIfLocal } from "./lib/comfy-start";
import { parseTryLookArgs, type TryLookArgs } from "./lib/try-look-args";
import { composePrompt, effectiveSeed } from "../render/scene-prompt";
import {
  buildWorkflow,
  ComfyClient,
  ComfyError,
  DEADLINE_MS,
  DEFAULT_COMFY_URL,
  FIRST_DEADLINE_MS,
  templateModels,
} from "../render/comfy";

const PROBE_COUNT = 3;
// Used when the script has fewer AI beats than PROBE_COUNT: a face, a two-shot, a place.
// Neutral, so they fit any book.
const PROBES: ImageScene[] = [
  {
    kind: "image",
    image: "a man stands in his small apartment, frowning in surprise at a letter in his hand",
    cast: [],
  },
  {
    kind: "image",
    image:
      "two people argue across a wooden table; one leans forward and points, the other leans back",
    cast: [],
  },
  {
    kind: "image",
    image: "a woman walks down a quiet city street past shop windows, looking over her shoulder",
    cast: [],
  },
];

async function main() {
  let args: TryLookArgs;
  try {
    args = parseTryLookArgs(process.argv.slice(2), process.env);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    console.error(`looks: ${listPresets().join(", ")}, episode, or a style file`);
    process.exit(2);
  }
  const episodeDir = resolveEpisodeDir(args.slug);
  // "episode" → the episode's own look. Output folders use the preset name or the file's base name.
  const used = new Set<string>();
  const looks = args.looks.map((arg) => {
    const look = arg === "episode" ? loadLook(episodeDir) : resolveLookArg(arg);
    // A unique folder name per column, even for two files with the same base name.
    const base = arg === "episode" ? "episode" : path.basename(arg, ".yml");
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    return { id, ...look };
  });

  const scriptPath = requireFile(
    path.join(episodeDir, "script.yml"),
    "Write the episode script first.",
  );
  const characters = loadCharacters(episodeDir);
  const script = parseScript(readFileSync(scriptPath, "utf8"), {
    characters: new Set(characters.keys()),
  });

  const probes: Array<LookProbe & { scene: ImageScene }> = [];
  script.beats.forEach((b, i) => {
    if (!isImageScene(b.scene)) return;
    if (args.beats ? args.beats.includes(i) : probes.length < PROBE_COUNT) {
      probes.push({ label: `beat ${i}`, image: b.scene.image, scene: b.scene });
    }
  });
  for (const n of args.beats ?? []) {
    if (!probes.some((p) => p.label === `beat ${n}`)) {
      throw new Error(`beat ${n} is not an AI-still beat (or does not exist)`);
    }
  }
  if (!args.beats) {
    for (const [k, scene] of PROBES.entries()) {
      if (probes.length >= PROBE_COUNT) break;
      probes.push({ label: `probe ${k + 1}`, image: scene.image, scene });
    }
  }

  const workflow = loadWorkflow();
  const prompts = new Map<string, string>();
  const jobs = looks.flatMap((look) =>
    probes.map((p, i) => {
      const cast = p.scene.cast.map((id) => characters.get(id)!);
      const prompt = composePrompt(look.style, cast, p.scene.image, {
        caption: !!p.scene.caption,
      });
      prompts.set(`${look.id}/${i}`, prompt);
      return { look, i, prompt, seed: effectiveSeed(p.scene).seed };
    }),
  );

  const outDir = path.join(episodeDir, "out");
  const done = new Map<string, string>();
  const client = new ComfyClient(process.env.COMFY_URL ?? DEFAULT_COMFY_URL);
  await startComfyIfLocal(client);
  const { version } = await client.preflight(templateModels(workflow.template));
  // A fresh folder per look (only once the server answers), so no image from an earlier run
  // shows up as this run's.
  for (const look of looks) {
    rmSync(path.join(outDir, "looks", look.id), { recursive: true, force: true });
  }
  console.log(
    `ComfyUI ${version} at ${client.baseUrl} · ${jobs.length} images (${looks.length} looks × ${probes.length} beats)`,
  );
  let current: string | undefined;
  process.once("SIGINT", () => {
    console.error("\ninterrupted — cancelling the running job");
    void client.interrupt(current).finally(() => process.exit(130));
  });
  for (const [k, j] of jobs.entries()) {
    const t0 = Date.now();
    try {
      const wf = buildWorkflow(workflow.template, {
        prompt: j.prompt,
        seed: j.seed,
        width: j.look.style.width,
        height: j.look.style.height,
        steps: j.look.style.steps,
        guidance: j.look.style.guidance,
        pixelate: j.look.style.pixelate,
        prefix: `wwta/${script.id}/looks/${j.look.id}-${j.i}`,
      });
      const png = await client.generate(
        wf,
        k === 0 ? FIRST_DEADLINE_MS : DEADLINE_MS,
        (id) => (current = id),
      );
      const dir = path.join(outDir, "looks", j.look.id);
      mkdirSync(dir, { recursive: true });
      const target = path.join(dir, `${j.i}.png`);
      writeFileSync(`${target}.tmp`, png);
      renameSync(`${target}.tmp`, target);
      done.set(`${j.look.id}/${j.i}`, `looks/${j.look.id}/${j.i}.png`);
      console.log(
        `[${k + 1}/${jobs.length}] ${j.look.id} · ${probes[j.i]!.label} · ${Math.round((Date.now() - t0) / 1000)}s`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[${k + 1}/${jobs.length}] ${j.look.id} · ${probes[j.i]!.label} failed: ${msg}`,
      );
      process.exitCode = 1;
      // A server that is down will fail every job; stop instead of waiting through each one.
      if (err instanceof ComfyError && /cannot reach|not responding/.test(msg)) break;
    }
  }
  if (await client.free()) console.log("ComfyUI models unloaded.");

  mkdirSync(outDir, { recursive: true });
  const page = path.join(outDir, "looks.html");
  writeFileSync(
    page,
    renderLooksPage({
      slug: script.id,
      presets: looks.map((l) => (l.id === "episode" ? `episode (${l.name})` : l.id)),
      probes,
      file: (_, i, col) => done.get(`${looks[col]!.id}/${i}`),
      prompt: (_, i, col) => prompts.get(`${looks[col]!.id}/${i}`) ?? "",
    }),
  );
  console.log(`compare page: ${pathToFileURL(page).href}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
