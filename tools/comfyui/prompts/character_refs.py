# Makes a reference set for one character: 8 poses/expressions x 3 seeds, on a plain background,
# so you can approve the look before it goes into episode stills (and later train a LoRA on it).
#
#   C:\ComfyUI\python_embeded\python.exe tools/comfyui/prompts/character_refs.py <character.yml> [style.yml]
#
# <character.yml>: episodes/<slug>/characters/<id>.yml or shared/characters/<id>.yml
# [style.yml]:     the look (default: the episode's style.yml when the character is in
#                  episodes/<slug>/characters/ and the episode has one, else shared/style.yml).
#                  Only the style's prefix, steps and guidance are used; the background is plain.
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


def default_style(char_path):
    """episodes/<slug>/characters/<id>.yml → episodes/<slug>/style.yml if it exists, else the channel look."""
    episode_style = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(char_path))), "style.yml")
    if os.path.basename(os.path.dirname(os.path.abspath(char_path))) == "characters" and os.path.isfile(episode_style) \
            and os.path.abspath(episode_style) != os.path.join(REPO, "shared", "style.yml"):
        return episode_style
    return os.path.join(REPO, "shared", "style.yml")


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
        print("usage: character_refs.py <character.yml> [style.yml]")
        return 2
    char = load(sys.argv[1])
    style_path = sys.argv[2] if len(sys.argv) > 2 else default_style(sys.argv[1])
    print(f"style: {os.path.relpath(style_path, REPO)}", flush=True)
    style = load(style_path)
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
