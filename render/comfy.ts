// ComfyUI HTTP client for AI stills. `fetch`, `sleep` and `now` are injected so tests run without a GPU.

export interface WorkflowParams {
  prompt: string;
  seed: number;
  width: number;
  height: number;
  steps: number;
  guidance: number;
  /** SaveImage filename_prefix, e.g. "wwta/ubik/3fa91c2e". */
  prefix: string;
  /** Pixel-art post-process (style `pixelate`); left out for other looks. */
  pixelate?: { factor: number; colors: number };
}

type ApiWorkflow = Record<string, { class_type: string; inputs: Record<string, unknown> }>;

// The node ids V2 edits in tools/comfyui/workflows/flux-gguf.api.json, with their expected types.
const NODES = {
  text: ["4", "CLIPTextEncode"],
  guidance: ["5", "FluxGuidance"],
  latent: ["7", "EmptySD3LatentImage"],
  sampler: ["8", "KSampler"],
  decode: ["9", "VAEDecode"],
  save: ["10", "SaveImage"],
} as const;

// Added only for `pixelate`: shrink (area average) → fewer colors → enlarge with hard edges.
const PIXEL_NODES = { down: "11", quantize: "12", up: "13" } as const;

/** A copy of the template with this beat's values. Fails if the template's nodes have changed. */
export function buildWorkflow(template: unknown, p: WorkflowParams): ApiWorkflow {
  const wf = structuredClone(template) as ApiWorkflow;
  for (const [id, type] of Object.values(NODES)) {
    if (wf?.[id]?.class_type !== type) {
      throw new Error(
        `workflow template drifted: node "${id}" should be ${type}, found ${wf?.[id]?.class_type ?? "nothing"}`,
      );
    }
  }
  wf[NODES.text[0]]!.inputs.text = p.prompt;
  wf[NODES.guidance[0]]!.inputs.guidance = p.guidance;
  Object.assign(wf[NODES.latent[0]]!.inputs, { width: p.width, height: p.height, batch_size: 1 });
  Object.assign(wf[NODES.sampler[0]]!.inputs, { seed: p.seed, steps: p.steps });
  wf[NODES.save[0]]!.inputs.filename_prefix = p.prefix;
  if (p.pixelate) addPixelate(wf, p.width, p.height, p.pixelate);
  return wf;
}

function addPixelate(
  wf: ApiWorkflow,
  width: number,
  height: number,
  { factor, colors }: { factor: number; colors: number },
): void {
  for (const id of Object.values(PIXEL_NODES)) {
    if (wf[id]) throw new Error(`workflow template drifted: node "${id}" is reserved for pixelate`);
  }
  const scale = (image: [string, number], method: string, w: number, h: number) => ({
    class_type: "ImageScale",
    inputs: { image, upscale_method: method, width: w, height: h, crop: "disabled" },
  });
  wf[PIXEL_NODES.down] = scale(
    [NODES.decode[0], 0],
    "area",
    Math.round(width / factor),
    Math.round(height / factor),
  );
  wf[PIXEL_NODES.quantize] = {
    class_type: "ImageQuantize",
    inputs: { image: [PIXEL_NODES.down, 0], colors, dither: "none" },
  };
  wf[PIXEL_NODES.up] = scale([PIXEL_NODES.quantize, 0], "nearest-exact", width, height);
  wf[NODES.save[0]]!.inputs.images = [PIXEL_NODES.up, 0];
}

export class ComfyError extends Error {
  constructor(
    message: string,
    readonly hint?: string,
  ) {
    super(hint ? `${message}\n→ ${hint}` : message);
    this.name = "ComfyError";
  }
}

export interface ComfyDeps {
  fetch: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
}

export const defaultDeps: ComfyDeps = {
  fetch: (...args) => fetch(...args),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  now: () => Date.now(),
};

export const DEFAULT_COMFY_URL = "http://127.0.0.1:8188";
const START_HINT =
  "Start ComfyUI: C:\\ComfyUI\\run_nvidia_gpu_lan.bat — or set COMFY_URL to the machine that runs it.";
const SETUP_HINT = "Run: powershell -ExecutionPolicy Bypass -File tools\\comfyui\\setup.ps1";
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export interface ModelNames {
  unet: string;
  clip1: string;
  clip2: string;
  vae: string;
}

/** Model file names the template uses (so preflight can check they are installed). */
export function templateModels(template: unknown): ModelNames {
  const wf = template as ApiWorkflow;
  const input = (id: string, key: string) => String(wf?.[id]?.inputs?.[key] ?? "");
  return {
    unet: input("1", "unet_name"),
    clip1: input("2", "clip_name1"),
    clip2: input("2", "clip_name2"),
    vae: input("3", "vae_name"),
  };
}

export class ComfyClient {
  readonly clientId = "wwta-generate-scenes";

  constructor(
    baseUrl: string,
    private readonly deps: ComfyDeps = defaultDeps,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  readonly baseUrl: string;

  /**
   * One HTTP call. The timeout covers the response body too (a stalled download must not hang),
   * so callers read the body inside `read`.
   */
  private async call<T>(
    path: string,
    init: RequestInit | undefined,
    timeoutMs: number,
    read: (res: Response) => Promise<T>,
  ): Promise<T> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      let res: Response;
      try {
        res = await this.deps.fetch(`${this.baseUrl}${path}`, { ...init, signal: ctrl.signal });
      } catch (err) {
        const why = ctrl.signal.aborted
          ? `no answer in ${timeoutMs / 1000} s`
          : err instanceof Error
            ? err.message
            : String(err);
        throw new ComfyError(`cannot reach ComfyUI at ${this.baseUrl} (${why})`, START_HINT);
      }
      try {
        return await read(res);
      } catch (err) {
        if (ctrl.signal.aborted) {
          throw new ComfyError(`ComfyUI stopped sending ${path} (timeout ${timeoutMs / 1000} s)`);
        }
        throw err;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  /** GETs are safe to retry (1 s, 2 s, 4 s) on network errors and 5xx. POSTs are never retried. */
  private async getJson<T>(path: string, timeoutMs = 30_000): Promise<T> {
    let last: unknown;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        return await this.call(path, undefined, timeoutMs, async (res) => {
          if (!res.ok) {
            await res.body?.cancel().catch(() => undefined); // free the connection
            throw new HttpError(path, res.status);
          }
          return (await res.json()) as T;
        });
      } catch (err) {
        if (err instanceof HttpError && err.status < 500) throw err; // deterministic; retrying cannot help
        last = err;
        if (attempt < 3) await this.deps.sleep(1000 * 2 ** attempt);
      }
    }
    throw last;
  }

  private postJson(
    path: string,
    body: unknown,
    timeoutMs = 30_000,
  ): Promise<{ ok: boolean; status: number; json: unknown }> {
    return this.call(
      path,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      timeoutMs,
      async (res) => ({ ok: res.ok, status: res.status, json: await res.json().catch(() => ({})) }),
    );
  }

  /** True if the server answers /system_stats within 3 s. */
  async ping(): Promise<boolean> {
    try {
      return await this.call("/system_stats", undefined, 3_000, async (res) => res.ok);
    } catch {
      return false;
    }
  }

  /** Server up, GGUF node present, model files installed. */
  async preflight(models: ModelNames): Promise<{ version: string }> {
    let stats: { system?: { comfyui_version?: string } };
    try {
      stats = await this.call("/system_stats", undefined, 5_000, async (res) => {
        if (!res.ok) {
          throw new ComfyError(
            `ComfyUI at ${this.baseUrl} answered HTTP ${res.status}`,
            START_HINT,
          );
        }
        return (await res.json()) as typeof stats;
      });
    } catch (err) {
      if (err instanceof ComfyError) throw err;
      throw new ComfyError(`ComfyUI at ${this.baseUrl} is not responding`, START_HINT);
    }
    const options = async (node: string, key: string): Promise<string[]> => {
      const info = await this.getJson<
        Record<string, { input?: { required?: Record<string, unknown[]> } }>
      >(`/object_info/${node}`);
      if (!info[node]) {
        throw new ComfyError(`ComfyUI has no "${node}" node (custom node missing)`, SETUP_HINT);
      }
      const spec = info[node]!.input?.required?.[key];
      const choices = spec?.[0];
      if (Array.isArray(choices)) return choices as string[];
      // Newer ComfyUI: ["COMBO", { options: [...] }]
      const opts = (spec?.[1] as { options?: unknown } | undefined)?.options;
      return choices === "COMBO" && Array.isArray(opts) ? (opts as string[]) : [];
    };
    const need = async (node: string, key: string, file: string) => {
      if (!(await options(node, key)).includes(file)) {
        throw new ComfyError(
          `model file "${file}" is not installed in ComfyUI (${node})`,
          SETUP_HINT,
        );
      }
    };
    await need("UnetLoaderGGUF", "unet_name", models.unet);
    await need("DualCLIPLoader", "clip_name1", models.clip1);
    await need("DualCLIPLoader", "clip_name2", models.clip2);
    await need("VAELoader", "vae_name", models.vae);
    return { version: stats.system?.comfyui_version ?? "unknown" };
  }

  /** Queue the workflow and wait for its first image. Returns the PNG bytes. */
  async generate(
    workflow: ApiWorkflow,
    deadlineMs: number,
    onQueued?: (promptId: string) => void,
  ): Promise<Uint8Array> {
    const res = await this.postJson("/prompt", { prompt: workflow, client_id: this.clientId });
    const body = res.json as { prompt_id?: string; error?: unknown; node_errors?: unknown };
    if (!res.ok || !body.prompt_id) {
      throw new ComfyError(
        `ComfyUI rejected the workflow (HTTP ${res.status}): ${JSON.stringify(body.error ?? body).slice(0, 500)}` +
          (body.node_errors
            ? `\nnode errors: ${JSON.stringify(body.node_errors).slice(0, 500)}`
            : ""),
      );
    }
    const id = body.prompt_id;
    onQueued?.(id);
    const start = this.deps.now();
    for (;;) {
      const item = await this.historyItem(id);
      const status = item?.status;
      if (status?.status_str === "error") {
        const msg = errorMessage(status);
        throw new ComfyError(`generation failed: ${msg}`, oomHint(msg));
      }
      if (status?.completed) return this.download(item!);
      if (!item && !(await this.isQueued(id)) && !(await this.historyItem(id))) {
        // Not running, not waiting, not finished: ComfyUI restarted or the queue was cleared.
        throw new ComfyError(
          "the job disappeared from ComfyUI (restarted, or the queue was cleared)",
          START_HINT,
        );
      }
      if (this.deps.now() - start > deadlineMs) {
        await this.interrupt(id);
        throw new ComfyError(
          `no image after ${Math.round(deadlineMs / 1000)} s — job cancelled`,
          "Is ComfyUI still running?",
        );
      }
      await this.deps.sleep(2000);
    }
  }

  private async historyItem(id: string): Promise<HistoryItem | undefined> {
    return (await this.getJson<Record<string, HistoryItem>>(`/history/${id}`))[id];
  }

  private async isQueued(id: string): Promise<boolean> {
    const q = await this.getJson<{ queue_running?: unknown[][]; queue_pending?: unknown[][] }>(
      "/queue",
    );
    return [...(q.queue_running ?? []), ...(q.queue_pending ?? [])].some((e) => e?.[1] === id);
  }

  private async download(item: HistoryItem): Promise<Uint8Array> {
    const img = Object.values(item.outputs ?? {}).flatMap((o) => o.images ?? [])[0];
    if (!img) throw new ComfyError("ComfyUI finished but returned no image");
    const q = new URLSearchParams({
      filename: img.filename,
      subfolder: img.subfolder ?? "",
      type: img.type ?? "output",
    });
    const bytes = await this.call(`/view?${q}`, undefined, 60_000, async (view) => {
      if (!view.ok) throw new ComfyError(`could not download the image (HTTP ${view.status})`);
      return new Uint8Array(await view.arrayBuffer());
    });
    if (!PNG_SIGNATURE.every((b, i) => bytes[i] === b)) {
      throw new ComfyError("downloaded file is not a PNG");
    }
    return bytes;
  }

  /** Best effort: stop this job (only this one, where the server supports it) and drop it from the queue. */
  async interrupt(promptId?: string): Promise<void> {
    await this.postJson("/interrupt", promptId ? { prompt_id: promptId } : {}, 5_000).catch(
      () => undefined,
    );
    if (promptId) {
      await this.postJson("/queue", { delete: [promptId] }, 5_000).catch(() => undefined);
    }
  }

  /** Unload models so local Whisper gets the VRAM. Best effort. */
  async free(): Promise<boolean> {
    try {
      return (await this.postJson("/free", { unload_models: true, free_memory: true }, 5_000)).ok;
    } catch {
      return false;
    }
  }
}

class HttpError extends ComfyError {
  constructor(
    path: string,
    readonly status: number,
  ) {
    super(`GET ${path} → HTTP ${status}`);
  }
}

interface HistoryItem {
  status?: { status_str?: string; completed?: boolean; messages?: unknown[] };
  outputs?: Record<
    string,
    { images?: Array<{ filename: string; subfolder?: string; type?: string }> }
  >;
}

function errorMessage(status: NonNullable<HistoryItem["status"]>): string {
  for (const m of status.messages ?? []) {
    if (Array.isArray(m) && m[0] === "execution_interrupted")
      return "the job was interrupted in ComfyUI";
    if (Array.isArray(m) && m[0] === "execution_error") {
      const d = m[1] as { exception_message?: string; node_type?: string };
      return `${d.node_type ?? "node"}: ${(d.exception_message ?? "").trim()}`;
    }
  }
  return "unknown error";
}

function oomHint(msg: string): string | undefined {
  return /out of memory|alloc/i.test(msg)
    ? "The GPU ran out of memory. Stop other GPU jobs (npm run align, games) and run again."
    : undefined;
}
