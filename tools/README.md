# Local tools

Two GPU tools run on the Windows desktop (RTX 3080, 10 GB). The repo holds the recipe for each.
The large installs and model files stay out of git.

| Tool                               | Purpose                       | Install location                   | Setup                     |
| ---------------------------------- | ----------------------------- | ---------------------------------- | ------------------------- |
| ComfyUI + Flux.1 Dev (GGUF Q5_K_S) | Scene images                  | `C:\ComfyUI` (SSD)                 | `tools\comfyui\setup.ps1` |
| faster-whisper (`large-v3-turbo`)  | Word timestamps for narration | `<repo>\.whisper-env` (gitignored) | `tools\whisper\setup.ps1` |

Do not run both on the GPU at the same time: Flux uses almost all of the 10 GB of VRAM.

## ComfyUI

```powershell
powershell -ExecutionPolicy Bypass -File tools\comfyui\setup.ps1
C:\ComfyUI\run_nvidia_gpu_lan.bat
```

- Pins: ComfyUI portable version and custom-node commits are in `setup.ps1`. Model URLs and SHA-256 checksums are in `models.json`.
- `requirements.txt`: the pinned Python packages that the custom nodes add to ComfyUI's embedded Python. ComfyUI has no separate env.
- `workflows/flux-gguf.api.json`: the base text-to-image workflow, in API format.
- `prompts/character_refs.py <character.yml> [preset or style.yml]`: makes a reference set for one
  character (8 poses × 3 seeds) so you can approve the look; contact sheet in
  `out/refs/<id>_<look>_sheet.jpg`. It asks `scripts/print-look.ts` (Node) for the resolved look,
  so it uses exactly what `generate-scenes` uses (the episode's `style.yml`, else `cartoon`).
- Episode stills: `npm run generate-scenes <slug>` uses `workflows/flux-gguf.api.json` with
  the episode's look (`style.yml` → a preset in `shared/styles/`) and character files. A look with
  `pixelate` adds core ComfyUI nodes after decoding (ImageScale area → ImageQuantize → ImageScale
  nearest-exact); the template file does not change. `npm run try-look <slug> <presets…>` renders
  a few beats in each preset for comparison. It checks that the GGUF node and the 4 model files are
  installed before it starts.
- Remote use: the LAN launcher listens on `0.0.0.0:8188`. ComfyUI has no login, so open the port only on a
  trusted home network. Set that Wi-Fi to **Private** (Settings → Network → Wi-Fi), then run as admin:
  `New-NetFirewallRule -DisplayName "ComfyUI 8188 (LAN)" -Direction Inbound -Protocol TCP -LocalPort 8188 -RemoteAddress LocalSubnet -Action Allow -Profile Private`
  To allow only the Mac, use `-RemoteAddress <Mac IP>` instead of `LocalSubnet`.
- Use only the portable build. A manual venv install of ComfyUI failed on PyTorch version conflicts.

## Whisper

```powershell
powershell -ExecutionPolicy Bypass -File tools\whisper\setup.ps1
```

- Needs Python 3.12. `requirements.lock.txt` holds the exact versions.
- `align.py`: word timestamps for one WAV, as JSON on stdout. `npm run align` calls it; you do not run it by hand.
  Exit code 3 means the GPU is out of memory (stop ComfyUI first). More often, a busy GPU only makes
  it very slow, because the driver moves memory to system RAM.
- The model (about 1.6 GB) downloads to `.whisper-env\models` the first time it runs.
- `av` stays at 14.x. faster-whisper 1.2.1 breaks with `av` 15 or later.
