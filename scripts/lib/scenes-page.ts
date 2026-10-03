// out/scenes.html — every beat in order, as a storyboard for review. Pure: returns the HTML string.

import { isImageScene, type Script } from "../../kit/script";
import type { Manifest, ScenePlan } from "../../render/scene-prompt";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface PageInput {
  slug: string;
  script: Script;
  plan: ScenePlan;
  manifest: Manifest;
  /** Files made in this run (NEW badge). */
  fresh: ReadonlySet<string>;
  /** Path from out/ to scenes/, e.g. "../scenes". */
  scenesHref: string;
}

export function renderScenesPage(p: PageInput): string {
  const byBeat = new Map(p.plan.stills.map((s) => [s.beat, s]));
  const cards = p.script.beats.map((beat, i) => {
    const narration = esc(beat.narration.trim().slice(0, 140));
    const still = byBeat.get(i);
    if (!isImageScene(beat.scene) || !still) {
      const caption = beat.scene.caption
        ? `<div class="kit-caption">${esc(beat.scene.caption)}</div>`
        : "";
      return `<figure class="card kit"><div class="kit-box">code-kit scene${caption}</div>
<figcaption><b>${i}</b> ${narration}</figcaption></figure>`;
    }
    const img =
      still.status === "missing"
        ? `<div class="missing">not generated yet</div>`
        : `<a href="${p.scenesHref}/${esc(still.file)}" target="_blank"><img src="${p.scenesHref}/${esc(still.file)}" title="${esc(still.prompt)}" loading="lazy"></a>`;
    const badges = [
      p.fresh.has(still.file) ? `<span class="badge new">NEW</span>` : "",
      still.status === "stale" ? `<span class="badge stale">stale</span>` : "",
      still.seedSource === "pinned" ? `<span class="badge pinned">kept</span>` : "",
    ].join("");
    const candidates = Object.entries(p.manifest.beats)
      .filter(([, e]) => e.candidateFor === i && e.image === still.scene.image)
      .sort(([, a], [, b]) => (a.candidateNo ?? 0) - (b.candidateNo ?? 0))
      .map(
        ([file, e]) =>
          `<div class="cand"><a href="${p.scenesHref}/${esc(file)}" target="_blank"><img src="${p.scenesHref}/${esc(file)}" title="seed ${e.seed}" loading="lazy"></a><code>--pick ${i}=${e.candidateNo}</code></div>`,
      )
      .join("");
    const candBlock = candidates
      ? `<div class="cands">${candidates}</div><div class="hint">keep one: npm run generate-scenes ${esc(p.slug)} -- --pick ${i}=N (click an image to see it full size)</div>`
      : "";
    return `<figure class="card">${img}${badges}
<figcaption><b>${i}</b> ${narration}${beat.scene.caption ? `<br><i>caption: ${esc(beat.scene.caption)}</i>` : ""}<br><small>seed ${still.seed} (${still.seedSource})</small></figcaption>${candBlock}</figure>`;
  });

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Scenes — ${esc(p.slug)}</title>
<style>
:root { color-scheme: light dark; --bg: #f3ead6; --fg: #1b1b1b; --card: #fffaf0; --muted: #6b6255; }
@media (prefers-color-scheme: dark) { :root { --bg: #1d1b18; --fg: #eee6d6; --card: #2a2723; --muted: #a59a88; } }
body { margin: 0; padding: 16px; background: var(--bg); color: var(--fg); font: 14px/1.4 system-ui, sans-serif; }
h1 { font-size: 18px; margin: 0 0 4px; } p.sub { color: var(--muted); margin: 0 0 16px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.card { margin: 0; background: var(--card); border-radius: 8px; overflow: hidden; position: relative; }
.card img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; display: block; }
figcaption { padding: 8px 10px; } figcaption small { color: var(--muted); }
.kit-box, .missing { aspect-ratio: 16 / 9; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--muted); background: repeating-linear-gradient(45deg, transparent 0 8px, rgba(127,127,127,.12) 8px 16px); }
.kit-caption { font-weight: 600; color: var(--fg); padding: 4px 8px; text-align: center; }
.badge { position: absolute; top: 8px; left: 8px; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 700; }
.badge.new { background: #2e7d32; color: #fff; } .badge.stale { background: #b26a00; color: #fff; left: auto; right: 8px; }
.badge.pinned { background: #1565c0; color: #fff; top: auto; bottom: 8px; left: auto; right: 8px; }
.cands { display: grid; grid-template-columns: 1fr; gap: 6px; padding: 0 8px 4px; }
.cand code { display: block; font-size: 12px; padding: 2px 0 0; }
.hint { font-size: 12px; color: var(--muted); padding: 0 10px 8px; font-family: ui-monospace, monospace; }
</style></head><body>
<h1>${esc(p.script.id)} — ${p.script.beats.length} beats, ${p.plan.stills.length} AI stills</h1>
<p class="sub">Beat numbers match <code>npm run short</code> and <code>--only</code> / <code>--reroll</code>. Hover an image for its prompt.</p>
<div class="grid">
${cards.join("\n")}
</div></body></html>
`;
}
