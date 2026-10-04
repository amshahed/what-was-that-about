// `npm run try-look <slug> <preset> [preset ...] [-- --beats 0,3]` — the same few beats in each
// look preset, side by side, so you can choose the episode's look before making every still.
//
// Reads:  episodes/<slug>/script.yml, the episode's and the channel's characters, shared/styles/*.yml
// Writes: episodes/<slug>/out/looks/<preset>/<n>.png and out/looks.html. Never touches scenes/.
//
// Beats: --beats, else the first 3 AI-still beats; built-in probe images fill up to 3.
// Seeds: each beat's own seed, so the presets differ only in look. ~1 min per image.
// Server: COMFY_URL (default http://127.0.0.1:8188).

import path from "node:path";
import { pathToFileURL } from "node:url";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { parseScript } from "../kit/script-parser";
import { isImageScene, type ImageScene } from "../kit/script";
import { resolveEpisodeDir, requireFile } from "./lib/episode";
import { listPresets, loadCharacters, loadPreset, loadWorkflow } from "./lib/scene-assets";
import { renderLooksPage, type LookProbe } from "./lib/looks-page";
import { startComfyIfLocal } from "./lib/comfy-start";
import { composePrompt, effectiveSeed, parseBeatList } from "../render/scene-prompt";
import { buildWorkflow, ComfyClient, DEFAULT_COMFY_URL, templateModels } from "../render/comfy";

const PROBE_COUNT = 3;
// Used when the script has fewer AI beats than PROBE_COUNT: one face, one two-shot, one place.
const PROBES: ImageScene[] = [
  {
    kind: "image",
    image:
      "a tired man in a rumpled suit argues with his apartment front door, which will not open; he pats his empty pockets",
    cast: [],
  },
  {
    kind: "image",
    image:
      "two people argue across an office desk; one points angrily at a small spray can on the desk",
    cast: [],
  },
  {
    kind: "image",
    image:
      "an old man in a quiet funeral home lounge leans close to a frosted glass casket and talks into a headset",
    cast: [],
  },
];

function usage(): never {
  console.error(
    `usage: npm run try-look <slug> <preset> [preset ...] [-- --beats 0,3]\npresets: ${listPresets().join(", ")}`,
  );
  process.exit(2);
}

async function main() {
  // Without `--`, npm keeps --beats for itself and drops it silently.
  if (process.env.npm_config_beats !== undefined) {
    throw new Error(
      "npm took --beats for itself. Put -- before it: npm run try-look <slug> <preset> -- --beats 0,3",
    );
  }
  const args = process.argv.slice(2);
  const bi = args.indexOf("--beats");
  const beats = bi >= 0 ? parseBeatList(args[bi + 1] ?? usage()) : undefined;
  const positional = args.filter((a, i) => !a.startsWith("-") && (bi < 0 || i !== bi + 1));
  const unknown = args.find((a, i) => a.startsWith("-") && i !== bi);
  if (unknown) throw new Error(`unknown option "${unknown}"`);
  const [slug, ...presets] = positional;
  if (!slug || presets.length === 0) usage();
  const looks = presets.map((n) => ({ name: n, style: loadPreset(n, undefined, "try-look") }));

  const episodeDir = resolveEpisodeDir(slug);
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
    if (beats ? beats.includes(i) : probes.length < PROBE_COUNT) {
      probes.push({ label: `beat ${i}`, image: b.scene.image, scene: b.scene });
    }
  });
  for (const n of beats ?? []) {
    if (!probes.some((p) => p.label === `beat ${n}`)) {
      throw new Error(`beat ${n} is not an AI-still beat (or does not exist)`);
    }
  }
  if (!beats) {
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
      const prompt = composePrompt(look.style, cast, p.scene.image, { caption: !!p.scene.caption });
      prompts.set(`${look.name}/${i}`, prompt);
      return { look, i, prompt, seed: effectiveSeed(p.scene).seed };
    }),
  );

  const outDir = path.join(episodeDir, "out");
  const done = new Map<string, string>();
  const client = new ComfyClient(process.env.COMFY_URL ?? DEFAULT_COMFY_URL);
  await startComfyIfLocal(client);
  const { version } = await client.preflight(templateModels(workflow.template));
  console.log(
    `ComfyUI ${version} at ${client.baseUrl} · ${jobs.length} images (${looks.length} looks × ${probes.length} beats)`,
  );
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
        prefix: `wwta/${script.id}/looks/${j.look.name}-${j.i}`,
      });
      const png = await client.generate(wf, k === 0 ? 600_000 : 300_000);
      const dir = path.join(outDir, "looks", j.look.name);
      mkdirSync(dir, { recursive: true });
      const target = path.join(dir, `${j.i}.png`);
      writeFileSync(`${target}.tmp`, png);
      renameSync(`${target}.tmp`, target);
      done.set(`${j.look.name}/${j.i}`, `looks/${j.look.name}/${j.i}.png`);
      console.log(
        `[${k + 1}/${jobs.length}] ${j.look.name} · ${probes[j.i]!.label} · ${Math.round((Date.now() - t0) / 1000)}s`,
      );
    } catch (err) {
      console.error(
        `[${k + 1}/${jobs.length}] ${j.look.name} · ${probes[j.i]!.label} failed: ${err instanceof Error ? err.message : err}`,
      );
      process.exitCode = 1;
    }
  }
  if (await client.free()) console.log("ComfyUI models unloaded.");

  // Old images from an earlier run must not show next to this run's.
  for (const look of looks) {
    for (
      let i = probes.length;
      existsSync(path.join(outDir, "looks", look.name, `${i}.png`));
      i++
    ) {
      rmSync(path.join(outDir, "looks", look.name, `${i}.png`));
    }
  }
  mkdirSync(outDir, { recursive: true });
  const page = path.join(outDir, "looks.html");
  writeFileSync(
    page,
    renderLooksPage({
      slug: script.id,
      presets: looks.map((l) => l.name),
      probes,
      file: (n, i) => done.get(`${n}/${i}`),
      prompt: (n, i) => prompts.get(`${n}/${i}`) ?? "",
    }),
  );
  console.log(`compare page: ${pathToFileURL(page).href}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
