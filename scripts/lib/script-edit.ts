// Minimal text edits to script.yml that keep the author's formatting and comments exactly.

import { isMap, isScalar, parseDocument } from "yaml";

/** Set (or replace) `seed:` in beat N's scene. Only the seed text changes; everything else is untouched. */
export function setSceneSeed(yamlText: string, beat: number, seed: number): string {
  const doc = parseDocument(yamlText);
  const scene = doc.getIn(["beats", beat, "scene"], true);
  if (!isMap(scene)) throw new Error(`beat ${beat}: no scene mapping in script.yml`);
  const pair = (key: string) => scene.items.find((p) => isScalar(p.key) && p.key.value === key);

  const existing = pair("seed");
  if (existing && isScalar(existing.value) && existing.value.range) {
    const [start, end] = existing.value.range;
    return yamlText.slice(0, start) + String(seed) + yamlText.slice(end);
  }

  const image = pair("image");
  if (!image || !isScalar(image.key) || !image.key.range || !isScalar(image.value) || !image.value.range) {
    throw new Error(`beat ${beat}: scene has no image field`);
  }
  const valueEnd = image.value.range[1];
  if (scene.flow) {
    // { image: "...", cast: [...] } → { image: "...", seed: N, cast: [...] }
    return yamlText.slice(0, valueEnd) + `, seed: ${seed}` + yamlText.slice(valueEnd);
  }
  // Block style: a new line after the image value, at the image key's indent.
  const keyStart = image.key.range[0];
  const lineStart = yamlText.lastIndexOf("\n", keyStart - 1) + 1;
  const indent = yamlText.slice(lineStart, keyStart);
  const eol = yamlText.indexOf("\n", valueEnd - 1);
  const at = eol === -1 ? yamlText.length : eol;
  const nl = yamlText.includes("\r\n") ? "\r\n" : "\n";
  const insertAt = at > 0 && yamlText[at - 1] === "\r" ? at - 1 : at;
  return yamlText.slice(0, insertAt) + `${nl}${indent}seed: ${seed}` + yamlText.slice(insertAt);
}
