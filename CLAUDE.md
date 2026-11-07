# CLAUDE.md

"What Was That About": a funny book summary and analysis YouTube channel. A code pipeline
(TypeScript + Remotion) makes each episode. Spec: [`PRD.md`](./PRD.md). Plan, decisions and status:
[`plan.md`](./plan.md). Per-episode steps: [`docs/episode-workflow.md`](./docs/episode-workflow.md).

## Where things are

- `episodes/<slug>/`: one folder per book. `seed.md` (the user's take), `notes/` (Claude's book
  notes, `outline.md`, `factcheck.md`), `script.yml`, `style.yml`, `characters/*.yml`.
- `shared/styles/*.yml`: look presets (`cartoon` default, `retro-pixel`, `vintage`). An episode's
  `style.yml` is `preset: <name>` plus changes (plan.md decision 22).
- `kit/`: script schema and parser (`kit/SCRIPT.md`). `render/`: prompts, ComfyUI client, Remotion.
- `scripts/`: the `npm run` commands. `tools/`: ComfyUI and Whisper setup (`tools/README.md`).

## Commands

```
npm test · npm run lint · npm run typecheck · npm run build      # what CI runs
npm run new-episode <slug>
npm run try-look <slug> <preset | episode | style.yml> [...] [-- --beats 0,3]
npm run generate-scenes <slug> [-- --beats 2,5-7 | --dry-run | --reroll 7,12 | --pick 7=2 | --prune]
npm run align <slug> · npm run assemble <slug> · npm run short <slug>
```

Always put `--` before flags (npm takes them for itself otherwise).

## Machine

- Windows desktop, RTX 3080 (10 GB). Images and alignment run only here, on the GPU.
- ComfyUI portable at `C:\ComfyUI` (Flux.1 Dev GGUF Q5_K_S). `generate-scenes` starts it when needed.
  Python scripts there use `C:\ComfyUI\python_embeded\python.exe` (system Python has no `yaml`).
- Local Whisper in `.whisper-env\` (used by `npm run align`).
- There is no `gh` CLI. `git push` works through Git Credential Manager. For PRs, CI status and merge,
  get the token in the same shell command with `git credential fill` (never print it) and call the
  GitHub REST API.

## How we work

- **Episodes are book-first:** the user writes `seed.md` on their own; Claude reads the user's copy of
  the book in `episodes/<slug>/notes/source/` and writes the notes; then both are merged into
  `notes/outline.md` → script → fact-check → images → voice → video. Never make up book details:
  read the book. Notes are in Claude's own words with chapter refs, no long quotes.
- **Code changes:** issue → branch `slice/<issue#>-<slug>` → build → test (GPU check when it
  touches images) → PR (`Closes #N`) → independent technical and functional reviews → fix → CI
  green → squash-merge into `main`. Do not stop between steps.
- **Never commit:** the book (`*.epub`, `notes/source/`), images (`*.png`), character reference
  sets, LoRA files, audio, video, `out/`. Character files are text only.
- **Replies:** short ASD-STE100 Simplified Technical English. Lists for steps. End with a
  "Your decision" line when the user must choose.

## Status

Phase 0 and 0.5 are done. Now: the Ubik pilot (#13), look `retro-pixel`. The live status is in
the "Next action" section of `plan.md`.
