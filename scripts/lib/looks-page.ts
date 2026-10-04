// out/looks.html — the same beats in each look preset, side by side (npm run try-look). Pure.

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface LookProbe {
  /** "beat 3" or "probe 1". */
  label: string;
  image: string;
}

export interface LooksPageInput {
  slug: string;
  presets: string[];
  probes: LookProbe[];
  /** (preset, probe index) → image path relative to out/, or undefined if it failed. */
  file: (preset: string, probe: number) => string | undefined;
  /** (preset, probe index) → the prompt sent to ComfyUI (shown on hover). */
  prompt: (preset: string, probe: number) => string;
}

export function renderLooksPage(p: LooksPageInput): string {
  const head = p.presets.map((n) => `<th>${esc(n)}</th>`).join("");
  const rows = p.probes.map((probe, i) => {
    const cells = p.presets.map((n) => {
      const f = p.file(n, i);
      const title = esc(p.prompt(n, i));
      return f
        ? `<td><a href="${esc(f)}" target="_blank"><img src="${esc(f)}" title="${title}"></a></td>`
        : `<td><div class="missing" title="${title}">failed</div></td>`;
    });
    return `<tr><th class="probe">${esc(probe.label)}<small>${esc(probe.image)}</small></th>${cells.join("")}</tr>`;
  });
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(p.slug)} — looks</title>
<style>
body{font:14px system-ui,sans-serif;margin:16px;background:#f4f1ea;color:#222}
table{border-collapse:collapse;width:100%}
th,td{padding:6px;vertical-align:top;text-align:left}
th.probe{width:14em}th.probe small{display:block;font-weight:normal;color:#555;margin-top:4px}
img{width:100%;display:block;border-radius:4px;image-rendering:auto}
.missing{aspect-ratio:16/9;display:grid;place-items:center;background:#ddd;color:#900}
</style></head><body>
<h1>${esc(p.slug)} — looks</h1>
<p>Same beats and seeds in each preset. Choose one: <code>preset: &lt;name&gt;</code> in episodes/${esc(p.slug)}/style.yml.</p>
<table><tr><th></th>${head}</tr>
${rows.join("\n")}
</table></body></html>
`;
}
