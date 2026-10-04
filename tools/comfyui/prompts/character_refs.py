# Makes a reference set for one character: 8 poses/expressions x 3 seeds, on a plain background,
# so you can approve the look before it goes into episode stills (and later train a LoRA on it).
#
#   C:\ComfyUI\python_embeded\python.exe tools/comfyui/prompts/character_refs.py <character.yml> [look]
#
# <character.yml>: episodes/<slug>/characters/<id>.yml or shared/characters/<id>.yml
# [look]:          a preset name (retro-pixel) or a style file. Default: the episode's style.yml when
#                  the character is in episodes/<slug>/characters/ and the episode has one, else the
#                  cartoon preset. Presets and `preset:` + changes resolve as in generate-scenes
#                  (scripts/lib/scene-assets.ts loadLook). Only the prefix, steps, guidance and
#                  pixelate are used; the background is plain.
# Output: ComfyUI's output/refs/<id>/ ; a contact sheet in out/refs/<id>_sheet.jpg (gitignored).
# Set COMFY_URL to use another machine. Images stay out of git (plan.md decision 19).
import json, os, sys, time, urllib.error, urllib.parse, urllib.request

import yaml

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
HOST = os.environ.get("COMFY_URL", "http://127.0.0.1:8188").rstrip("/")
WORKFLOW = os.path.join(REPO, "tools", "comfyui", "workflows", "flux-gguf.api.json")
VARIANTS = 3
PER_IMAGE_LIMIT_S = 300
SHOTS = [
    ("01_front", "standing straight facing the viewer, neutral expression"),
    ("02_three_quarter", "standing in three-quarter view, relaxed"),
    ("03_profile", "side view in profile, walking"),
    ("04_talking", "talking with one hand raised, mouth open mid-sentence"),
    ("05_worried", "worried, frowning, hand rubbing the back of the neck"),
    ("06_shocked", "shocked, eyes wide, leaning back"),
    ("07_laughing", "laughing, eyes squeezed shut"),
    ("08_sitting", "sitting on a chair, thinking"),
]


def load(path):
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


STYLES = os.path.join(REPO, "shared", "styles")
DEFAULT_PRESET = "cartoon"


def preset_file(name):
    path = os.path.join(STYLES, f"{name}.yml")
    if not os.path.isfile(path):
        names = sorted(f[:-4] for f in os.listdir(STYLES) if f.endswith(".yml"))
        raise SystemExit(f'unknown preset "{name}" (available: {", ".join(names)})')
    return path


def default_look(char_path):
    """episodes/<slug>/characters/<id>.yml → episodes/<slug>/style.yml if it exists, else the cartoon preset."""
    char_dir = os.path.dirname(os.path.abspath(char_path))
    episode_style = os.path.join(os.path.dirname(char_dir), "style.yml")
    if os.path.basename(char_dir) == "characters" and os.path.isfile(episode_style):
        return episode_style
    return preset_file(DEFAULT_PRESET)


def resolve_look(arg):
    """A preset name or a style file → (name, style dict), applying `preset:` + changes like loadLook."""
    if os.sep not in arg and "/" not in arg and not arg.endswith(".yml"):
        return arg, load(preset_file(arg))
    style = load(arg) or {}
    name = style.pop("preset", None)
    if name is None:
        return "custom", style
    merged = {**load(preset_file(name)), **style}
    return name, {k: v for k, v in merged.items() if v is not None and v is not False}


def add_pixelate(wf, width, height, px):
    """Same nodes as render/comfy.ts buildWorkflow: shrink (area) → quantize → enlarge (nearest)."""
    f = px["factor"]
    wf["11"] = {"class_type": "ImageScale", "inputs": {"image": ["9", 0], "upscale_method": "area",
                "width": width // f, "height": height // f, "crop": "disabled"}}
    wf["12"] = {"class_type": "ImageQuantize", "inputs": {"image": ["11", 0], "colors": px["colors"], "dither": "none"}}
    wf["13"] = {"class_type": "ImageScale", "inputs": {"image": ["12", 0], "upscale_method": "nearest-exact",
                "width": width, "height": height, "crop": "disabled"}}
    wf["10"]["inputs"]["images"] = ["13", 0]


def post(wf):
    req = urllib.request.Request(f"{HOST}/prompt", data=json.dumps({"prompt": wf}).encode(),
                                 headers={"Content-Type": "application/json"})
    try:
        return json.load(urllib.request.urlopen(req, timeout=30))["prompt_id"]
    except urllib.error.HTTPError as err:
        raise SystemExit(f"ComfyUI rejected the workflow (HTTP {err.code}): {err.read().decode()[:500]}")
    except urllib.error.URLError as err:
        raise SystemExit(f"cannot reach ComfyUI at {HOST} ({err.reason}). Start C:\\ComfyUI\\run_nvidia_gpu_lan.bat or set COMFY_URL.")


def main():
    if len(sys.argv) < 2:
        print("usage: character_refs.py <character.yml> [preset name or style.yml]")
        return 2
    char = load(sys.argv[1])
    look_arg = sys.argv[2] if len(sys.argv) > 2 else default_look(sys.argv[1])
    look, style = resolve_look(look_arg)
    px = style.get("pixelate")
    print(f"look: {look} ({look_arg})" + (f" · pixelate {px['factor']}x, {px['colors']} colors" if px else ""), flush=True)
    template = json.load(open(WORKFLOW, encoding="utf-8"))
    cid = char["id"]
    prefix = f"{style['prefix'].strip()} Character reference sheet: full body, plain light-gray background, no scenery."
    jobs = []
    for i, (name, pose) in enumerate(SHOTS):
        for v in range(VARIANTS):
            wf = json.loads(json.dumps(template))
            wf["4"]["inputs"]["text"] = f"{prefix} {char['description'].strip().rstrip('.')}, {pose}. No text, unsigned artwork."
            wf["5"]["inputs"]["guidance"] = style.get("guidance", 3.5)
            wf["7"]["inputs"].update(width=1024, height=1024, batch_size=1)
            wf["8"]["inputs"].update(seed=7000 + i * VARIANTS + v, steps=style.get("steps", 20))
            wf["10"]["inputs"]["filename_prefix"] = f"refs/{cid}/{name}"
            if px:
                add_pixelate(wf, 1024, 1024, px)
            jobs.append((name, post(wf)))
    print(f"queued {len(jobs)} images for {cid}", flush=True)

    t0, files, failed = time.time(), [], 0
    for n, (name, pid) in enumerate(jobs, start=1):
        deadline = t0 + n * PER_IMAGE_LIMIT_S
        while True:
            h = json.load(urllib.request.urlopen(f"{HOST}/history/{pid}", timeout=30))
            status = h.get(pid, {}).get("status", {})
            if status.get("completed") is not None:
                ok = status.get("status_str") == "success"
                failed += not ok
                if ok:
                    img = h[pid]["outputs"]["10"]["images"][0]
                    files.append((name, img))
                print(f"[{n}/{len(jobs)}] {name} {status.get('status_str')} {time.time() - t0:.0f}s", flush=True)
                break
            if time.time() > deadline:
                raise SystemExit(f"{name}: no result — is ComfyUI still running?")
            time.sleep(3)

    try:
        from PIL import Image
        from io import BytesIO
        thumbs = []
        for name, img in files:
            q = urllib.parse.urlencode({"filename": img["filename"], "subfolder": img["subfolder"], "type": "output"})
            thumbs.append(Image.open(BytesIO(urllib.request.urlopen(f"{HOST}/view?{q}").read())).convert("RGB").resize((300, 300)))
        cols = VARIANTS * 2
        sheet = Image.new("RGB", (300 * cols, 300 * ((len(thumbs) + cols - 1) // cols)), "white")
        for k, t in enumerate(thumbs):
            sheet.paste(t, ((k % cols) * 300, (k // cols) * 300))
        out = os.path.join(REPO, "out", "refs", f"{cid}_sheet.jpg")  # out/ is gitignored
        os.makedirs(os.path.dirname(out), exist_ok=True)
        sheet.save(out, quality=88)
        print(f"contact sheet: {out}")
    except Exception as err:  # the images are in ComfyUI's output folder either way
        print(f"contact sheet skipped: {err}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
