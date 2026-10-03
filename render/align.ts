// The alignment boundary: audio → word timestamps. No other file knows which engine ran.
// Engines: "local" (faster-whisper on the GPU, default — ADR 0003) and "openai" (Whisper API, fallback).
// Select with ALIGN_ENGINE=local|openai.
import { spawn } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import type { TranscriptionVerbose } from "openai/resources/audio/transcriptions";

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface AlignmentResult {
  words: WordTimestamp[];
  duration: number;
}

export type AlignEngine = "local" | "openai";

export interface AlignOptions {
  /** Defaults to ALIGN_ENGINE, then "local". */
  engine?: AlignEngine;
  /** Text that biases spelling (names, places). Used by the local engine only. */
  prompt?: string;
}

const ENGINES: readonly AlignEngine[] = ["local", "openai"];

// Paths resolve from the repo root, like every npm script in this project.
export const LOCAL_PYTHON = path.join(".whisper-env", "Scripts", "python.exe");
export const LOCAL_SCRIPT = path.join("tools", "whisper", "align.py");
const EXIT_OOM = 3; // tools/whisper/align.py exits 3 when the GPU is out of memory

export function resolveEngine(raw: string | undefined = process.env.ALIGN_ENGINE): AlignEngine {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "") return "local";
  if ((ENGINES as readonly string[]).includes(value)) return value as AlignEngine;
  throw new Error(`ALIGN_ENGINE must be one of ${ENGINES.join(", ")} — got "${raw}".`);
}

export function parseAlignmentResponse(raw: TranscriptionVerbose): AlignmentResult {
  const words: WordTimestamp[] = (raw.words ?? []).map((w) => ({
    word: w.word,
    start: w.start,
    end: w.end,
  }));
  return { words, duration: raw.duration };
}

/** Validate the JSON that tools/whisper/align.py prints on stdout. */
export function parseLocalAlignment(stdout: string): AlignmentResult {
  let data: unknown;
  try {
    data = JSON.parse(stdout);
  } catch {
    throw new Error(`local Whisper returned invalid JSON: ${stdout.slice(0, 200)}`);
  }
  const d = data as { words?: unknown; duration?: unknown };
  if (typeof d.duration !== "number" || !Array.isArray(d.words)) {
    throw new Error("local Whisper output is missing `words` or `duration`.");
  }
  const words = d.words.map((w: unknown, i: number) => {
    const t = w as Partial<WordTimestamp>;
    if (typeof t.word !== "string" || typeof t.start !== "number" || typeof t.end !== "number") {
      throw new Error(`local Whisper output: bad word at index ${i}.`);
    }
    return { word: t.word, start: t.start, end: t.end };
  });
  return { words, duration: d.duration };
}

export interface ProcessResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

export type ProcessRunner = (exe: string, args: string[]) => Promise<ProcessResult>;

/** Runs a process; its stderr (progress messages) also streams to ours. */
export const runProcess: ProcessRunner = (exe, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(exe, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c: Buffer) => (stdout += c.toString()));
    child.stderr.on("data", (c: Buffer) => {
      stderr += c.toString();
      process.stderr.write(c);
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });

export async function alignLocal(
  audioPath: string,
  prompt?: string,
  run: ProcessRunner = runProcess,
  exists: (p: string) => boolean = existsSync,
): Promise<AlignmentResult> {
  if (!exists(LOCAL_PYTHON) || !exists(LOCAL_SCRIPT)) {
    throw new Error(
      "Local Whisper is not set up. Run `powershell -ExecutionPolicy Bypass -File tools\\whisper\\setup.ps1`, " +
        "or set ALIGN_ENGINE=openai.",
    );
  }
  if (!exists(audioPath)) throw new Error(`audio file not found: ${audioPath}`);
  const args = ["-W", "ignore", LOCAL_SCRIPT, audioPath];
  if (prompt) args.push("--prompt", prompt);

  const { code, stdout, stderr } = await run(LOCAL_PYTHON, args);
  if (code === EXIT_OOM) {
    throw new Error(
      "GPU out of memory. Stop ComfyUI (or any other GPU job) and run `npm run align` again.",
    );
  }
  if (code !== 0) {
    const tail = stderr.trim().split("\n").slice(-5).join("\n");
    throw new Error(`local Whisper failed (exit ${code}):\n${tail}`);
  }
  return parseLocalAlignment(stdout);
}

async function alignOpenAI(audioPath: string): Promise<AlignmentResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is not set — set it before running the alignment step (PowerShell: $env:OPENAI_API_KEY = "sk-...").',
    );
  }
  if (!existsSync(audioPath)) throw new Error(`audio file not found: ${audioPath}`);

  const client = new OpenAI({ apiKey });

  const response = await client.audio.transcriptions.create({
    file: createReadStream(audioPath),
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["word"],
  });

  return parseAlignmentResponse(response as TranscriptionVerbose);
}

export async function alignAudio(
  audioPath: string,
  opts: AlignOptions = {},
): Promise<AlignmentResult> {
  const engine = opts.engine ?? resolveEngine();
  return engine === "local" ? alignLocal(audioPath, opts.prompt) : alignOpenAI(audioPath);
}
