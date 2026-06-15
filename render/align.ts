import { createReadStream } from "node:fs";
import OpenAI from "openai";

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface AlignmentResult {
  words: WordTimestamp[];
  duration: number;
}

// Whisper verbose_json response shape (subset we use).
interface WhisperVerboseResponse {
  duration: number;
  words?: Array<{ word: string; start: number; end: number }>;
}

export function parseAlignmentResponse(raw: WhisperVerboseResponse): AlignmentResult {
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

  const client = new OpenAI({ apiKey });

  const response = await client.audio.transcriptions.create({
    file: createReadStream(audioPath),
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["word"],
  });

  return parseAlignmentResponse(response as unknown as WhisperVerboseResponse);
}
