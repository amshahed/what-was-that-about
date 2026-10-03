# Generates the Poseidon reference set (8 shots x 3 seeds) through a running ComfyUI.
# Run with any Python 3: python tools/comfyui/prompts/poseidon_refs.py
# Output lands in ComfyUI's output/poseidon_ref_v2/. Set COMFY_URL to target another machine.
import json, os, time, urllib.request

HOST = os.environ.get("COMFY_URL", "http://127.0.0.1:8188")
BASE = json.load(open(os.path.join(os.path.dirname(__file__), "..", "workflows", "flux-gguf.api.json")))

CHARACTER = (
    "Poseidon, a stocky barrel-chested middle-aged cartoon Greek god with a broad thick torso, big round belly, "
    "thick strong arms, short thick legs, a big round head, a huge fluffy white beard and wild spiky white hair, "
    "thick bushy white eyebrows, big round pink nose, small round eyes, wearing a teal-blue toga draped over "
    "his left shoulder leaving his right shoulder and right side of his chest bare, knee-length, bare feet, "
    "his trident is entirely shiny gold including the whole shaft"
)
STYLE = (
    "Cartoon webcomic character in the style of Cyanide and Happiness and Crayon Capital: "
    "thick clean black outlines, flat bright colors, minimal shading, simple shapes, "
    "full body, centered, plain pure white background, no text, no signature, no watermark."
)
SHOTS = [
    ("01_front_neutral", "standing straight facing the viewer holding the golden trident upright in one hand, neutral grumpy expression"),
    ("02_three_quarter", "standing in three-quarter view, golden trident planted on the ground beside him, unimpressed half-lidded look"),
    ("03_explaining", "holding the golden trident in one hand and raising the index finger of his other hand like a lecturer explaining something, eyebrows raised, mouth open mid-sentence"),
    ("04_facepalm", "golden trident in one hand, his other hand's palm pressed flat over his eyes and forehead in a classic facepalm, head bowed, exasperated"),
    ("05_shocked", "extremely shocked, eyes bulging huge, jaw dropped wide open, both hands on his cheeks, hair and beard standing on end, golden trident falling out of his grip"),
    ("06_laughing", "laughing hard, head tilted back, eyes squeezed shut, mouth wide open, one hand on his belly, golden trident in the other hand"),
    ("07_shrug", "shrugging: both elbows bent, both palms turned upward at shoulder height, shoulders raised, golden trident leaning against his shoulder, smug skeptical smirk"),
    ("08_reading", "sitting cross-legged on the floor reading an open paperback book held in both hands, golden trident lying on the floor beside him, confused frown"),
]
VARIANTS = 3

def post(wf):
    req = urllib.request.Request(HOST + "/prompt", data=json.dumps({"prompt": wf}).encode(),
                                 headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=30))["prompt_id"]

ids = []
for i, (name, pose) in [(i, x) for i, x in enumerate(SHOTS) for _ in range(VARIANTS)]:
    wf = json.loads(json.dumps(BASE))
    wf["4"]["inputs"]["text"] = f"{STYLE} {CHARACTER}, {pose}."
    wf["8"]["inputs"]["seed"] = 2000 + len(ids)
    wf["10"]["inputs"]["filename_prefix"] = f"poseidon_ref_v2/{name}"
    ids.append((name, post(wf)))
print("queued", len(ids), flush=True)

# A job that never reaches history (ComfyUI restarted, queue cleared) must not hang the script.
PER_IMAGE_LIMIT_S = 300
t0 = time.time()
failed = 0
for n, (name, pid) in enumerate(ids, start=1):
    deadline = t0 + n * PER_IMAGE_LIMIT_S
    while True:
        h = json.load(urllib.request.urlopen(f"{HOST}/history/{pid}", timeout=30))
        status = h.get(pid, {}).get("status", {})
        if status.get("completed") is not None:
            print(name, status.get("status_str"), f"{time.time()-t0:.0f}s", flush=True)
            failed += status.get("status_str") != "success"
            break
        if time.time() > deadline:
            raise SystemExit(f"{name}: no result after {time.time()-t0:.0f}s — is ComfyUI still running?")
        time.sleep(3)
if failed:
    raise SystemExit(f"{failed} of {len(ids)} images failed")
