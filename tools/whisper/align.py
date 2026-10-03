"""Word timestamps for one narration WAV, using local faster-whisper on the GPU.

Runs inside <repo>/.whisper-env (see tools/whisper/setup.ps1). Called by render/align.ts.

    python tools/whisper/align.py <audio.wav> [--prompt TEXT]

stdout: {"words": [{"word", "start", "end"}], "duration"} — the AlignmentResult shape.
stderr: progress and errors. Exit 0 on success, 1 on failure, 3 when the GPU is out of memory.
"""

import argparse
import glob
import json
import os
import sys

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MODELS_DIR = os.path.join(REPO, ".whisper-env", "models")
MODEL = "large-v3-turbo"
EXIT_OOM = 3


def register_cuda_dlls() -> None:
    # On Windows, CTranslate2 finds cuBLAS/cuDNN only if the pip `nvidia-*` DLL folders are registered.
    for d in glob.glob(os.path.join(sys.prefix, "Lib", "site-packages", "nvidia", "*", "bin")):
        os.add_dll_directory(d)
        os.environ["PATH"] = d + os.pathsep + os.environ["PATH"]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("audio")
    parser.add_argument("--prompt", default=None, help="text that biases spelling (e.g. names)")
    args = parser.parse_args()

    if not os.path.isfile(args.audio):
        print(f"audio file not found: {args.audio}", file=sys.stderr)
        return 1

    if os.name == "nt":
        register_cuda_dlls()
    from faster_whisper import WhisperModel

    try:
        first_run = not os.path.isdir(MODELS_DIR) or not os.listdir(MODELS_DIR)
        note = " (first run: downloading ~1.6 GB, this takes a few minutes)" if first_run else ""
        print(f"loading {MODEL}{note} ...", file=sys.stderr, flush=True)
        model = WhisperModel(MODEL, device="cuda", compute_type="float16", download_root=MODELS_DIR)
        # vad_filter drops silence before decoding, so silent stretches do not produce made-up
        # words ("Thank you."). Timestamps stay relative to the original audio.
        segments, info = model.transcribe(
            args.audio,
            language="en",
            word_timestamps=True,
            initial_prompt=args.prompt,
            vad_filter=True,
        )
        words = [
            {"word": w.word, "start": round(w.start, 3), "end": round(w.end, 3)}
            for seg in segments
            for w in (seg.words or [])
        ]
    except RuntimeError as err:
        msg = str(err).lower()
        if "out of memory" in msg or "alloc_failed" in msg:
            print("GPU out of memory. Stop ComfyUI (or any other GPU job) and run again.", file=sys.stderr)
            return EXIT_OOM
        raise

    json.dump({"words": words, "duration": round(info.duration, 3)}, sys.stdout, ensure_ascii=True)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
