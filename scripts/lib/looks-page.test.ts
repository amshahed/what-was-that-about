import { describe, it, expect } from "vitest";
import { renderLooksPage } from "./looks-page";

describe("renderLooksPage", () => {
  it("shows one row per beat and one column per preset, with failed cells marked", () => {
    const html = renderLooksPage({
      slug: "ubik",
      presets: ["cartoon", "retro-pixel"],
      probes: [
        { label: "beat 0", image: "Joe argues with <his> door" },
        { label: "probe 2", image: "two people argue" },
      ],
      file: (n, i) => (n === "retro-pixel" && i === 1 ? undefined : `looks/${n}/${i}.png`),
      prompt: (n, i) => `${n} prompt ${i}`,
    });
    expect(html).toContain("<th>cartoon</th><th>retro-pixel</th>");
    expect(html).toContain('src="looks/retro-pixel/0.png"');
    expect(html).toContain("Joe argues with &lt;his&gt; door");
    expect(html.match(/<tr><th class="probe">/g)).toHaveLength(2);
    expect(html).toContain('title="retro-pixel prompt 1">failed');
  });
});
