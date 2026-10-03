# Characters

One YAML file per recurring character. `npm run generate-scenes` adds the character's locked
description to every image prompt that lists the character in `cast:`. Text only — reference images
and LoRA files stay on the GPU desktop (plan.md decision 19).

```yaml
id: poseidon          # must equal the file name
name: Poseidon
description: >-       # full locked look, used when the character is alone in the image
  Poseidon, a stocky ...
short: >-             # ~25 words, used when 2–3 characters share one image
  Poseidon, stocky ...
notes: ...            # for people only; never sent to the model
```

**Casting doctrine (PRD §6.0):** reuse an existing character first; add a new one only when a beat
truly needs it. Give a new character colours that no other character uses, so looks do not blend.

**Writing the description:** start with the name, then build, head and hair, face, clothes, props.
Say "a single" for props that must not repeat. Do not describe poses or expressions here — those go in
each beat's `image:` text.
