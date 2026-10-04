# Characters

One YAML file per character. `npm run generate-scenes` adds the character's locked description to
every image prompt that lists the character in `cast:`. Text only — reference images and LoRA files
stay on the GPU desktop (plan.md decision 19).

**Where:** a book's cast lives with its episode, in `episodes/<slug>/characters/<id>.yml`. This
folder is for channel-wide characters that recur across episodes (none yet). The same id in both
places is an error.

```yaml
id: joe-chip # must equal the file name
name: Joe Chip
description: >- # full locked look, used when the character is alone in the image
  Joe Chip, a ...
short: >- # ~25 words, used when 2–3 characters share one image
  Joe Chip, ...
notes: ... # for people only; never sent to the model (e.g. chapter refs for the look)
```

**Casting doctrine (PRD §6.0):** keep the cast small; reuse a character before adding one. Give each
character colours that no other character uses, so looks do not blend.

**Writing the description:** start with the name, then build, head and hair, face, clothes, props.
Take the look from the book first (`notes/characters.md`, with chapter refs); mark additions as ours.
Say "a single" for props that must not repeat. Do not describe poses or expressions here — those go
in each beat's `image:` text.

**Approve the look** with a reference set before using the character in stills:
`C:\ComfyUI\python_embeded\python.exe tools/comfyui/prompts/character_refs.py <file>.yml [style.yml]`
(an episode character uses its episode's `style.yml` by default; only the style prefix, steps and guidance
are used, on a plain background)
