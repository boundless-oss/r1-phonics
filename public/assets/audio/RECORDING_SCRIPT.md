# Voice Recording Script — r1-phonics

This is the script for the parent-voice audio assets. Recorded clips feed through `scripts/trim-audio.sh` (normalize, trim, mp3-encode) and land in `public/assets/audio/letters/` and `public/assets/audio/praise/`.

## Equipment & setting

- Your phone. iPhone Voice Memos is fine (outputs `.m4a`).
- Quiet room; doors closed; HVAC/fan off.
- Hold the phone 6–8" from your mouth, slightly below chin level to avoid plosive pops.
- Water nearby; speak warm and calm and **slightly lower than your normal speaking pitch**.

## Delivery principles

1. **Pure phonemes, no vowel padding.** `/s/` is a long hiss, not "suh". `/p/` is a light puff with no vowel tail. See the table below for each letter.
2. **Warm and calm.** This is bedtime-story voice, not storybook-narrator voice.
3. **Process-focused on praise.** Praise the act ("you said the sound"), not traits ("you're smart").
4. Record each line **3 times**; keep the best take. Discard the others.
5. Leave ~0.5 s of silence at the start and end of each take — the ffmpeg pipeline trims both ends automatically.

## Filename convention

One file per clip. Save to a single folder on your Mac (e.g., `~/r1-phonics-raw/`). Name files as `<category>-<slug>.m4a`:

- `letters-a.m4a`, `letters-b.m4a`, … `letters-z.m4a`
- `praise-said-1.m4a`, `praise-remodel-1.m4a`, etc.

Then run: `scripts/trim-audio.sh ~/r1-phonics-raw/`

The script routes into `public/assets/audio/letters/a.mp3`, `public/assets/audio/praise/said-1.mp3`, etc. Mono 64kbps MP3, normalized to –18 LUFS, silence-trimmed both ends.

---

## Letters — 26 clips

Pure phoneme (Jolly Phonics style). Shape the sound the way it appears in short words like "sat" and "pin", not the letter's name.

| File             | Say                                 | Note |
|------------------|-------------------------------------|------|
| `letters-a.m4a`  | `/æ/` — short a as in **a**pple     | Mouth open, jaw relaxed. |
| `letters-b.m4a`  | `/b/` — quick b, no vowel tail      | Tight lips, brief burst. |
| `letters-c.m4a`  | `/k/` — hard c as in **c**at        | Back-of-tongue tap. Same as `k`. |
| `letters-d.m4a`  | `/d/` — quick d, no vowel tail      | Tongue tip to roof, brief. |
| `letters-e.m4a`  | `/ɛ/` — short e as in **e**gg       | Mouth slightly open, smile-shaped. |
| `letters-f.m4a`  | `/fff/` — sustained, ~0.6 s         | Top teeth on lower lip. |
| `letters-g.m4a`  | `/g/` — hard g as in **g**o         | Back tongue, brief. |
| `letters-h.m4a`  | `/h/` — soft breathy puff           | Quiet, like warming a mirror. |
| `letters-i.m4a`  | `/ɪ/` — short i as in **i**t        | Mouth relaxed, brief. |
| `letters-j.m4a`  | `/ʤ/` — j as in **j**am             | Slight voice — unavoidable. |
| `letters-k.m4a`  | `/k/` — quick k, no vowel           | Same target as `c`. |
| `letters-l.m4a`  | `/lll/` — sustained hum, ~0.6 s     | Tongue tip to roof, voiced. |
| `letters-m.m4a`  | `/mmm/` — sustained hum, ~0.6 s     | Lips closed, nasal. |
| `letters-n.m4a`  | `/nnn/` — sustained hum, ~0.6 s     | Tongue behind teeth, nasal. |
| `letters-o.m4a`  | `/ɒ/` — short o as in **o**ctopus   | Round lips, brief. |
| `letters-p.m4a`  | `/p/` — light puff                  | Lips, no voice, no vowel. |
| `letters-q.m4a`  | `/kw/` — quick "kw"                 | Jolly Phonics teaches q as /kw/. |
| `letters-r.m4a`  | `/r/` — soft growl                  | NOT trilled; American-r. |
| `letters-s.m4a`  | `/sss/` — sustained hiss, ~0.6 s    | Teeth close, air hiss. |
| `letters-t.m4a`  | `/t/` — tongue tap                  | Crisp, no vowel tail. |
| `letters-u.m4a`  | `/ʌ/` — short u as in **u**p        | Mouth relaxed, brief. |
| `letters-v.m4a`  | `/vvv/` — sustained, ~0.6 s         | Top teeth on lower lip, voiced. |
| `letters-w.m4a`  | `/w/` — quick, rounded              | Lips round and release. |
| `letters-x.m4a`  | `/ks/` — end sound like "fo**x**"   | Two quick sounds. |
| `letters-y.m4a`  | `/y/` — as in **y**ellow            | Quick, like "yuh" without the "uh". |
| `letters-z.m4a`  | `/zzz/` — sustained buzz, ~0.6 s    | Like `s` but voiced. |

## Praise & transitions — 10 clips

Two takes per clip — we alternate at runtime so the ritual doesn't feel scripted. Always warm, never exclamatory.

| File                     | Say                                   |
|--------------------------|---------------------------------------|
| `praise-said-1.m4a`      | "You said the sound."                 |
| `praise-said-2.m4a`      | "I heard the sound."                  |
| `praise-found-1.m4a`     | "You found the letter."               |
| `praise-found-2.m4a`     | "That's the one."                     |
| `praise-tried-1.m4a`     | "You tried the sound."                |
| `praise-tried-2.m4a`     | "Let's try again."                    |
| `praise-listening-1.m4a` | "Good listening."                     |
| `praise-listening-2.m4a` | "Listening."                          |
| `remodel-1.m4a`          | "Let's listen again."                 |
| `remodel-2.m4a`          | "Listen to the sound."                |

**Re-model playback pattern at runtime:** the app plays `remodel-1` (or `remodel-2`) → 500 ms silence → the letter's phoneme clip. That's why the remodel lines don't contain the letter sound themselves.

## Out of scope

- **Chimes** — opening and closing chimes are synthesized in code (Web Audio API), not recorded.
- **Letter names** (e.g., "ay", "bee", "see") — we teach phonemes only.
- **Multi-word encouragement** (e.g., "what a great job!") — violates the process-praise principle.

---

When done: run `scripts/trim-audio.sh ~/r1-phonics-raw/`, verify the output MP3s sound right (normalized volume, no leading silence), then commit `public/assets/audio/`.
