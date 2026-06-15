# Audio asset licensing

Audio files are NOT committed (gitignored). Place them manually before running `npm run assemble`.

## Music beds (`shared/music/`)

One file per tone tag. Loop-safe (no audible click at loop point).

| Tone | File | Source / License |
|------|------|-----------------|
| light | `light-funk.mp3` | [Free Music Archive](https://freemusicarchive.org) — CC0 or CC BY |
| balanced | `balanced-groove.mp3` | [Free Music Archive](https://freemusicarchive.org) — CC0 or CC BY |
| heavy | `heavy-ambient.mp3` | [Free Music Archive](https://freemusicarchive.org) — CC0 or CC BY |
| balanced-heavy | `balanced-heavy-ambient.mp3` | [Free Music Archive](https://freemusicarchive.org) — CC0 or CC BY |

**Levels:** music bed rendered at 0.12 (−18 dBFS) when no narration, ducked to 0.04 (−28 dBFS)
under narration beats. Narration should peak at −6 to −3 dBFS.

**Sources to check:**
- <https://freemusicarchive.org/genre/Instrumental/>
- <https://pixabay.com/music/> (Pixabay license — commercial use OK)
- <https://incompetech.com> (Kevin MacLeod — CC BY 4.0, credit in description)

## SFX stings (`shared/sfx/`)

Short comedic sound effects triggered by `[SFX: name]` tags in the script.

| Tag name | File | Source / License |
|----------|------|-----------------|
| `record scratch` | `record-scratch.wav` | [Freesound.org](https://freesound.org) — CC0 |
| `boing` | `boing.wav` | [Freesound.org](https://freesound.org) — CC0 |
| `ding` | `ding.wav` | [Freesound.org](https://freesound.org) — CC0 |
| `whoosh` | `whoosh.wav` | [Freesound.org](https://freesound.org) — CC0 |
| `drum hit` | `drum-hit.wav` | [Freesound.org](https://freesound.org) — CC0 |

Add new entries to `SFX_FILES` in `render/mix.ts` to support additional sting names.

**Note on monetization:** Verify asset licenses before uploading to YouTube.
Music with ContentID claims (e.g. some Artlist tracks) will block monetization even if
licensed for use. Prefer CC0 or CC BY with no ContentID claim.
