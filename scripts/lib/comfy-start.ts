// Starts local ComfyUI for generate-scenes and try-look when it is not running.

import path from "node:path";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import type { ComfyClient } from "../../render/comfy";

const COMFY_DIR = process.env.COMFYUI_DIR ?? "C:\\ComfyUI";
const LAUNCHER = "run_nvidia_gpu_lan.bat";

/** When ComfyUI is meant to run on this PC and is not up, start it in its own window and wait. */
export async function startComfyIfLocal(client: ComfyClient): Promise<void> {
  const local = /^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(client.baseUrl);
  if (!local || process.platform !== "win32" || (await client.ping())) return;
  if (!existsSync(path.join(COMFY_DIR, LAUNCHER))) return; // preflight explains what to do
  console.log(
    `ComfyUI is not running — starting ${path.join(COMFY_DIR, LAUNCHER)} in a new window ...`,
  );
  spawn("cmd.exe", ["/c", "start", '"ComfyUI"', "/D", `"${COMFY_DIR}"`, LAUNCHER], {
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
