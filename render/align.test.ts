import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { TranscriptionVerbose } from "openai/resources/audio/transcriptions";
import {
  parseAlignmentResponse,
  parseLocalAlignment,
  resolveEngine,
  alignAudio,
  alignLocal,
  LOCAL_PYTHON,
  LOCAL_SCRIPT,
  type ProcessRunner,
} from "./align";

function fixture(overrides: Partial<TranscriptionVerbose> = {}): TranscriptionVerbose {
  return {
    task: "transcribe",
    language: "english",
    duration: 5.2,
    text: "",
    segments: [],
    ...overrides,
  } as TranscriptionVerbose;
}

describe("parseAlignmentResponse", () => {
  it("maps words to WordTimestamp shape", () => {
    const result = parseAlignmentResponse(
      fixture({
        duration: 5.2,
        words: [
          { word: "Hello", start: 0.0, end: 0.3 },
          { word: " world", start: 0.4, end: 0.8 },
        ],
      }),
    );
    expect(result.duration).toBe(5.2);
    expect(result.words).toHaveLength(2);
    expect(result.words[0]).toEqual({ word: "Hello", start: 0.0, end: 0.3 });
    // Leading-space tokens preserved as-is (Whisper's behaviour)
    expect(result.words[1]).toEqual({ word: " world", start: 0.4, end: 0.8 });
  });

  it("handles missing words array", () => {
    const result = parseAlignmentResponse(fixture({ duration: 2.0, words: undefined }));
    expect(result.words).toEqual([]);
    expect(result.duration).toBe(2.0);
  });

  it("handles empty words array", () => {
    const result = parseAlignmentResponse(fixture({ duration: 0.5, words: [] }));
    expect(result.words).toEqual([]);
  });
});

describe("alignAudio — env guard", () => {
  let original: string | undefined;

  beforeEach(() => {
    original = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    if (original !== undefined) {
      process.env.OPENAI_API_KEY = original;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  it("throws a clear error when OPENAI_API_KEY is absent", async () => {
    await expect(alignAudio("fake.wav", { engine: "openai" })).rejects.toThrow(
      "OPENAI_API_KEY is not set",
    );
  });
});

describe("resolveEngine", () => {
  it("defaults to local", () => {
    expect(resolveEngine(undefined)).toBe("local");
    expect(resolveEngine("")).toBe("local");
  });

  it("accepts local and openai in any case", () => {
    expect(resolveEngine("LOCAL")).toBe("local");
    expect(resolveEngine(" openai ")).toBe("openai");
  });

  it("rejects unknown engines", () => {
    expect(() => resolveEngine("whisperx")).toThrow(
      'ALIGN_ENGINE must be one of local, openai — got "whisperx"',
    );
  });
});

describe("parseLocalAlignment", () => {
  it("parses the align.py output", () => {
    const out = parseLocalAlignment(
      '{"words":[{"word":" Hi","start":0.1,"end":0.4}],"duration":1.5}\n',
    );
    expect(out).toEqual({ words: [{ word: " Hi", start: 0.1, end: 0.4 }], duration: 1.5 });
  });

  it("rejects invalid JSON", () => {
    expect(() => parseLocalAlignment("Traceback ...")).toThrow("invalid JSON");
  });

  it("rejects missing fields", () => {
    expect(() => parseLocalAlignment('{"words":[]}')).toThrow("missing `words` or `duration`");
  });

  it("rejects a malformed word", () => {
    expect(() => parseLocalAlignment('{"words":[{"word":"x","start":"0"}],"duration":1}')).toThrow(
      "bad word at index 0",
    );
  });
});

describe("alignLocal", () => {
  const allExist = () => true;
  const ok: ProcessRunner = async () => ({
    code: 0,
    stdout: '{"words":[{"word":" Hi","start":0,"end":0.3}],"duration":0.5}',
    stderr: "loading ...",
  });

  it("runs align.py in the whisper env and returns its words", async () => {
    let call: { exe: string; args: string[] } | undefined;
    const run: ProcessRunner = async (exe, args) => {
      call = { exe, args };
      return ok(exe, args);
    };
    const out = await alignLocal("a.wav", "Poseidon. Ubik.", run, allExist);
    expect(out.words).toHaveLength(1);
    expect(call!.exe).toBe(LOCAL_PYTHON);
    expect(call!.args).toEqual([
      "-W",
      "ignore",
      LOCAL_SCRIPT,
      "a.wav",
      "--prompt",
      "Poseidon. Ubik.",
    ]);
  });

  it("omits --prompt when there is no prompt", async () => {
    let args: string[] = [];
    await alignLocal("a.wav", undefined, async (e, a) => ((args = a), ok(e, a)), allExist);
    expect(args).not.toContain("--prompt");
  });

  it("explains how to set up the env when it is missing", async () => {
    await expect(alignLocal("a.wav", undefined, ok, () => false)).rejects.toThrow(
      "Local Whisper is not set up",
    );
  });

  it("reports a missing audio file", async () => {
    const exists = (p: string) => p !== "a.wav";
    await expect(alignLocal("a.wav", undefined, ok, exists)).rejects.toThrow(
      "audio file not found: a.wav",
    );
  });

  it("turns exit code 3 into a GPU out-of-memory hint", async () => {
    const run: ProcessRunner = async () => ({ code: 3, stdout: "", stderr: "GPU out of memory." });
    await expect(alignLocal("a.wav", undefined, run, allExist)).rejects.toThrow("Stop ComfyUI");
  });

  it("includes the end of stderr when the script fails", async () => {
    const run: ProcessRunner = async () => ({
      code: 1,
      stdout: "",
      stderr: "line1\nValueError: bad wav",
    });
    await expect(alignLocal("a.wav", undefined, run, allExist)).rejects.toThrow(
      /local Whisper failed \(exit 1\):[\s\S]*ValueError: bad wav/,
    );
  });
});
