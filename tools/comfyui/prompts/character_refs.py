# Makes a reference set for one character: 8 poses/expressions x 3 seeds, on a plain background,
# so you can approve the look before it goes into episode stills (and later train a LoRA on it).
#
#   C:\ComfyUI\python_embeded\python.exe tools/comfyui/prompts/character_refs.py <character.yml> [look]
#
# <character.yml>: episodes/<slug>/characters/<id>.yml or shared/characters/<id>.yml
# [look]:          a preset name (retro-pixel), a style file or an episode folder. Default: the
#                  character's episode (its style.yml, else cartoon); a shared character → cartoon.
#                  Resolved by scripts/print-look.ts — the same code as generate-scenes — so Node
#                  must be installed. Only the prefix, steps, guidance and pixelate are used; the
#                  background is plain (framing words belong in the look's suffix, which refs skip).
# Output: ComfyUI's output/refs/<id>/<look>/ ; a contact sheet in out/refs/<id>_<look>_sheet.jpg
#         (gitignored). Each look keeps its own set.
# Set COMFY_URL to use another machine. Images stay out of git (plan.md decision 19).
import json, os, subprocess, sys, time, urllib.error, urllib.parse, urllib.request

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


def default_look(char_path):
    """episodes/<slug>/characters/<id>.yml → that episode (its look); a shared character → cartoon."""
    char_dir = os.path.dirname(os.path.abspath(char_path))
    if os.path.basename(char_dir) == "characters" and os.path.basename(os.path.dirname(os.path.dirname(char_dir))) == "episodes":
        return os.path.dirname(char_dir)
    return "cartoon"


def resolve_look(arg):
    """Episode folder, style file or preset name → the resolved look, from the same TS code as
    generate-scenes (scripts/print-look.ts), so presets and rules can never differ."""
    npx = "npx.cmd" if os.name == "nt" else "npx"
    run = subprocess.run([npx, "tsx", "scripts/print-look.ts", arg], cwd=REPO, capture_output=True,
                         text=True, encoding="utf-8")
    if run.returncode != 0:
        raise SystemExit((run.stderr or run.stdout).strip() or f"print-look failed for {arg}")
    return json.loads(run.stdout.strip().splitlines()[-1])


def add_pixelate(wf, width, height, px):
    """Same nodes as render/comfy.ts buildWorkflow: shrink (area) → quantize → enlarge (nearest)."""
    if wf.get("9", {}).get("class_type") != "VAEDecode" or any(k in wf for k in ("11", "12", "13")):
        raise SystemExit("workflow template drifted: pixelate needs node 9 = VAEDecode and free ids 11-13")
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
    resolved = resolve_look(look_arg)
    look, style = resolved["name"], resolved["style"]
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
            wf["5"]["inputs"]["guidance"] = style["guidance"]
            wf["7"]["inputs"].update(width=1024, height=1024, batch_size=1)
            wf["8"]["inputs"].update(seed=7000 + i * VARIANTS + v, steps=style["steps"])
            wf["10"]["inputs"]["filename_prefix"] = f"refs/{cid}/{look}/{name}"
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
        out = os.path.join(REPO, "out", "refs", f"{cid}_{look}_sheet.jpg")  # out/ is gitignored
        os.makedirs(os.path.dirname(out), exist_ok=True)
        sheet.save(out, quality=88)
        print(f"contact sheet: {out}")
    except Exception as err:  # the images are in ComfyUI's output folder either way
        print(f"contact sheet skipped: {err}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
