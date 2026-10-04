import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { buildWorkflow, ComfyClient, ComfyError, templateModels, type ComfyDeps } from "./comfy";

const TEMPLATE = JSON.parse(
  readFileSync(new URL("../tools/comfyui/workflows/flux-gguf.api.json", import.meta.url), "utf8"),
) as Record<string, { class_type: string; inputs: Record<string, unknown> }>;

const PARAMS = {
  prompt: "p",
  seed: 9,
  width: 1344,
  height: 768,
  steps: 20,
  guidance: 3.5,
  prefix: "wwta/ep/k",
};
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

describe("buildWorkflow", () => {
  it("sets prompt, seed, size, steps, guidance and prefix on a copy", () => {
    const wf = buildWorkflow(TEMPLATE, PARAMS);
    expect(wf["4"]!.inputs.text).toBe("p");
    expect(wf["8"]!.inputs).toMatchObject({ seed: 9, steps: 20 });
    expect(wf["7"]!.inputs).toMatchObject({ width: 1344, height: 768, batch_size: 1 });
    expect(wf["5"]!.inputs.guidance).toBe(3.5);
    expect(wf["10"]!.inputs.filename_prefix).toBe("wwta/ep/k");
    expect(TEMPLATE["4"]!.inputs.text).not.toBe("p"); // template untouched
  });

  it("adds the pixel-art nodes only for pixelate", () => {
    const plain = buildWorkflow(TEMPLATE, PARAMS);
    expect(plain["10"]!.inputs.images).toEqual(["9", 0]);
    expect(plain["11"]).toBeUndefined();

    const wf = buildWorkflow(TEMPLATE, { ...PARAMS, pixelate: { factor: 4, colors: 32 } });
    expect(wf["11"]).toEqual({
      class_type: "ImageScale",
      inputs: {
        image: ["9", 0],
        upscale_method: "area",
        width: 336,
        height: 192,
        crop: "disabled",
      },
    });
    expect(wf["12"]).toEqual({
      class_type: "ImageQuantize",
      inputs: { image: ["11", 0], colors: 32, dither: "none" },
    });
    expect(wf["13"]).toEqual({
      class_type: "ImageScale",
      inputs: {
        image: ["12", 0],
        upscale_method: "nearest-exact",
        width: 1344,
        height: 768,
        crop: "disabled",
      },
    });
    expect(wf["10"]!.inputs.images).toEqual(["13", 0]);
    expect(TEMPLATE["10"]!.inputs.images).toEqual(["9", 0]); // template untouched
  });

  it("fails when the template's nodes changed", () => {
    const drifted = structuredClone(TEMPLATE);
    drifted["8"]!.class_type = "KSamplerAdvanced";
    expect(() => buildWorkflow(drifted, PARAMS)).toThrow('node "8" should be KSampler');
  });

  it("reads the model file names", () => {
    expect(templateModels(TEMPLATE)).toEqual({
      unet: "flux1-dev-Q5_K_S.gguf",
      clip1: "t5xxl_fp8_e4m3fn.safetensors",
      clip2: "clip_l.safetensors",
      vae: "ae.safetensors",
    });
  });
});

type Route = (url: string, init?: RequestInit) => Response | Promise<Response> | never;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function fakeServer(routes: Record<string, Route>) {
  let clock = 0;
  const calls: string[] = [];
  const deps: ComfyDeps = {
    fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input).replace("http://comfy", "");
      calls.push(`${init?.method ?? "GET"} ${url}`);
      const key = Object.keys(routes).find((k) => url.startsWith(k));
      if (!key) return new Response("not found", { status: 404 });
      return routes[key]!(url, init);
    }) as typeof fetch,
    sleep: async (ms) => {
      clock += ms;
    },
    now: () => clock,
  };
  return {
    client: new ComfyClient("http://comfy", deps),
    calls,
    advance: (ms: number) => (clock += ms),
  };
}

const MODELS = templateModels(TEMPLATE);
const objectInfo = (node: string, key: string, files: string[]) =>
  json({ [node]: { input: { required: { [key]: [files] } } } });
const healthy: Record<string, Route> = {
  "/system_stats": () => json({ system: { comfyui_version: "0.37.0" } }),
  "/object_info/UnetLoaderGGUF": () => objectInfo("UnetLoaderGGUF", "unet_name", [MODELS.unet]),
  "/object_info/DualCLIPLoader": () =>
    json({
      DualCLIPLoader: {
        input: {
          required: {
            clip_name1: [[MODELS.clip1, MODELS.clip2]],
            clip_name2: [[MODELS.clip1, MODELS.clip2]],
          },
        },
      },
    }),
  // Newer ComfyUI combo format
  "/object_info/VAELoader": () =>
    json({
      VAELoader: { input: { required: { vae_name: ["COMBO", { options: [MODELS.vae] }] } } },
    }),
};

describe("ComfyClient.preflight", () => {
  it("passes when the server, node and models are there", async () => {
    const { client } = fakeServer(healthy);
    await expect(client.preflight(MODELS)).resolves.toEqual({ version: "0.37.0" });
  });

  it("says how to start ComfyUI when it is not reachable", async () => {
    const { client } = fakeServer({
      "/system_stats": () => {
        throw new TypeError("fetch failed");
      },
    });
    await expect(client.preflight(MODELS)).rejects.toThrow(
      /cannot reach ComfyUI[\s\S]*run_nvidia_gpu_lan\.bat/,
    );
  });

  it("names a missing GGUF node", async () => {
    const { client } = fakeServer({ ...healthy, "/object_info/UnetLoaderGGUF": () => json({}) });
    await expect(client.preflight(MODELS)).rejects.toThrow(
      /no "UnetLoaderGGUF" node[\s\S]*setup\.ps1/,
    );
  });

  it("names a missing model file", async () => {
    const { client } = fakeServer({
      ...healthy,
      "/object_info/VAELoader": () => objectInfo("VAELoader", "vae_name", ["other.safetensors"]),
    });
    await expect(client.preflight(MODELS)).rejects.toThrow('"ae.safetensors" is not installed');
  });
});

describe("ComfyClient.generate", () => {
  const wf = buildWorkflow(TEMPLATE, PARAMS);
  const done = {
    status: { status_str: "success", completed: true },
    outputs: {
      "10": { images: [{ filename: "k_00001_.png", subfolder: "wwta/ep", type: "output" }] },
    },
  };

  it("queues, polls until done, and downloads the PNG", async () => {
    let polls = 0;
    const { client, calls } = fakeServer({
      "/prompt": () => json({ prompt_id: "abc" }),
      "/history/abc": () => json(++polls < 3 ? {} : { abc: done }),
      "/queue": () => json({ queue_running: [[0, "abc"]], queue_pending: [] }),
      "/view": () => new Response(PNG),
    });
    await expect(client.generate(wf, 60_000)).resolves.toEqual(PNG);
    expect(calls.filter((c) => c.startsWith("GET /history")).length).toBe(3);
    expect(calls.at(-1)).toBe("GET /view?filename=k_00001_.png&subfolder=wwta%2Fep&type=output");
  });

  it("shows node errors when ComfyUI rejects the workflow", async () => {
    const { client } = fakeServer({
      "/prompt": () =>
        json({ error: { message: "bad" }, node_errors: { "4": "missing clip" } }, 400),
    });
    await expect(client.generate(wf, 60_000)).rejects.toThrow(
      /rejected the workflow \(HTTP 400\)[\s\S]*missing clip/,
    );
  });

  it("reports an execution error, with a hint for out-of-memory", async () => {
    const { client } = fakeServer({
      "/prompt": () => json({ prompt_id: "abc" }),
      "/history/abc": () =>
        json({
          abc: {
            status: {
              status_str: "error",
              completed: false,
              messages: [
                [
                  "execution_error",
                  { node_type: "KSampler", exception_message: "CUDA out of memory" },
                ],
              ],
            },
          },
        }),
    });
    await expect(client.generate(wf, 60_000)).rejects.toThrow(
      /KSampler: CUDA out of memory[\s\S]*ran out of memory/,
    );
  });

  it("cancels the job after the deadline", async () => {
    const { client, calls } = fakeServer({
      "/prompt": () => json({ prompt_id: "abc" }),
      "/history/abc": () => json({}),
      "/queue": () => json({ queue_running: [[0, "abc"]], queue_pending: [] }),
      "/interrupt": () => json({}),
    });
    await expect(client.generate(wf, 10_000)).rejects.toThrow("no image after 10 s");
    expect(calls).toContain("POST /interrupt");
  });

  it("rejects a download that is not a PNG", async () => {
    const { client } = fakeServer({
      "/prompt": () => json({ prompt_id: "abc" }),
      "/history/abc": () => json({ abc: done }),
      "/view": () => new Response("<html>"),
    });
    await expect(client.generate(wf, 60_000)).rejects.toBeInstanceOf(ComfyError);
  });

  it("fails fast when the job disappears (ComfyUI restarted)", async () => {
    const { client } = fakeServer({
      "/prompt": () => json({ prompt_id: "abc" }),
      "/history/abc": () => json({}),
      "/queue": () => json({ queue_running: [], queue_pending: [] }),
    });
    await expect(client.generate(wf, 600_000)).rejects.toThrow("the job disappeared from ComfyUI");
  });

  it("stops only its own job on interrupt", async () => {
    const bodies: string[] = [];
    const { client } = fakeServer({
      "/interrupt": (_u, init) => {
        bodies.push(String(init?.body));
        return json({});
      },
      "/queue": () => json({}),
    });
    await client.interrupt("abc");
    expect(bodies).toEqual(['{"prompt_id":"abc"}']);
  });

  it("does not retry a 4xx answer", async () => {
    const { client, calls } = fakeServer({
      "/prompt": () => json({ prompt_id: "abc" }),
      "/history/abc": () => json({ error: "gone" }, 404),
    });
    await expect(client.generate(wf, 60_000)).rejects.toThrow("HTTP 404");
    expect(calls.filter((c) => c.startsWith("GET /history")).length).toBe(1);
  });

  it("reports a job stopped from the ComfyUI side", async () => {
    const { client } = fakeServer({
      "/prompt": () => json({ prompt_id: "abc" }),
      "/history/abc": () =>
        json({
          abc: {
            status: {
              status_str: "error",
              completed: false,
              messages: [["execution_interrupted", {}]],
            },
          },
        }),
    });
    await expect(client.generate(wf, 60_000)).rejects.toThrow("interrupted in ComfyUI");
  });
});

describe("ComfyClient.free", () => {
  it("returns false instead of throwing when ComfyUI is not running", async () => {
    const { client } = fakeServer({
      "/free": () => {
        throw new TypeError("fetch failed");
      },
    });
    await expect(client.free()).resolves.toBe(false);
  });
});
