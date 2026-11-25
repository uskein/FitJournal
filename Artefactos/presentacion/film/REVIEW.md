# REVIEW — DiarioFit launch film

Reviewed with `check`, `snapshot --at`, `snapshot --review` and direct frame reads on 2026-11-25.

## Check

`check`: **0 errors** in lint, runtime, layout, motion, contrast and audio. Three advisory warnings kept on purpose:

| Warning | Why kept |
|---|---|
| `timeline_track_too_dense` (proof.html) | The 13.5 s proof beat holds four sub-shots plus a cursor click in one scene; splitting them would break the object-to-object chain. |
| `film_silent` | No HeyGen sign-in (`auth status` → "Not signed in to HeyGen"), so the film ships silent. See the delivery note for how to add a bed. |
| `line_unread` (tension L1) | A hard-cut persona complaint, deliberately shown for ~1.7 s before the second cut; the two lines share a 4 s beat. |

## Frame review (`snapshot --at 1,2.9,4,6,8,11,13,16,19,22,24,26,28,31,33,35`)

- **Hook 0–3 s:** real Hoy screen in cream editorial frame; streak card carries out with a camera push anchored at its own centre (2.9 s frame confirmed); no black lead-in, no logo alone.
- **Tension 3–7 s:** two verbatim persona frustrations, hard cut on the beat. Extra snapshots at 4.2 / 4.5 / 4.8 / 5.1 / 5.4 s confirmed both lines stay on screen through their holds — the `--review` beat sheet's 4.5 s thumbnail was a seek artefact, not a blank frame.
- **Reveal 7–9.5 s:** `DiarioFit` wordmark wipes in, rule and grounded sub-line land, no floating logo.
- **Proof 9.5–23 s:** four real captures, each established at full-frame scale, pushed 1.6–1.8× into the exact control (Ánimo/Energía, habit chip, `▶ Empezar`, PR card), then pulled back. The 16 s frame is a legitimate exit-in-progress, not two screens overlapping. One real cursor click lands on `▶ Empezar` at 9.5–10.05 s local and causes the next shot.
- **Payoff 23–30 s:** the real November calendar is revealed row-by-row from behind cream strips; circle, strips, rule and slow drift keep the beat alive past 3 s.
- **Claim + end card 30–36 s:** claim holds, then the real brand icon is carried in, wordmark wipes beside it, CTA `github.com/uskein/FitJournal` and `v1.1.0 · Android` hold to the last frame (35.75 s checked).

## Seams

`--review` produced seams at 3 / 7 / 9.5 / 23 / 30 / 32.5 s. Each is a caused hand-off (object carry, type cut, mask/circle expand, or move-in), not a generic crossfade. The 3 s seam has a single cream frame before the first tension line lands — intentional beat, under 0.2 s.

## Provenance

Every product pixel is one of the nine APK captures in `assets/screens/`; no invented button, value or dashboard. Typography is the approved brand TTFs from the repo. Copy is sourced from `REQUERIMIENTOS_FUNCIONALES.md`.
