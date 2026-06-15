import { createReadStream, existsSync } from "node:fs";
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

export function parseAlignmentResponse(raw: TranscriptionVerbose): AlignmentResult {
  const words: WordTimestamp[] = (raw.words ?? []).map((w) => ({
    word: w.word,
    start: w.start,
    end: w.end,
  }));
  return { words, duration: raw.duration };
}

export async function alignAudio(audioPath: string): Promise<AlignmentResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set — export it before running the alignment step.",
    );
  }

  if (!existsSync(audioPath)) {
    throw new Error(`audio file not found: ${audioPath}`);
  }

  const client = new OpenAI({ apiKey });

  const response = await client.audio.transcriptions.create({
    file: createReadStream(audioPath),
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["word"],
  });

  return parseAlignmentResponse(response as TranscriptionVerbose);
}
