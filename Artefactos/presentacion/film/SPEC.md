# SPEC — DiarioFit launch film · storyline A "Un día cualquiera"

Picked: **A**. Built autonomously (the request was for the best product, no stops); B and C live in
`STORYLINES.md`.

## Numbers

| | |
|---|---|
| Length | **36.0 s = 1080 frames** @ 30 fps, 1920×1080 |
| Ground | `#FAF6F0` (surface) everywhere except tension, which sits on `#F4EFE8` (field) |
| Elevated plane | `#FFFFFF` + clay shadow `0 8px 24px rgba(62,107,96,.08)` + `1px rgba(255,255,255,.8)` top highlight — mandatory, no flat white cards |
| Accent rationing | `#C67B5C` terracotta on the one verb button and the payoff rule; `#E0A458` amber on numbers only; `#3E6B60` primary for the wordmark and claim |
| Type | Fraunces 700 display · Nunito Sans 400/600/700 body · JetBrains Mono 500/700 every number |
| Sizes | hero title 128 px · scene title 88 px · verb 76 px · sub-line 32 px · kicker 26 px (uppercase, `.18em`) — nothing under 26 px |
| Screens | the 8 captures, cropped with `overflow:hidden` + scaled, shown at **1.6–2.0×** their real pixel size; `object-fit: cover` only for framing, never redrawn |
| Mark | `assets/icon.png` appears **once**, on the end card, at 210 px (11 % frame width, inside the 15–30 % lockup band with the wordmark) |

## Beat table (frame ranges are `[start, end)`)

| Beat | Frames | Seconds | Share | Job |
|---|---|---|---|---|
| Hook | 0–90 | 0.0–3.0 | 8.3 % | real Hoy already working; streak card lit; no black, no logo |
| Tension | 90–210 | 3.0–7.0 | 11.1 % | two persona frustrations as type on the field ground |
| Reveal | 210–285 | 7.0–9.5 | 6.9 % | `DiarioFit` named as a title (wordmark type, **not** the icon) |
| Proof | 285–690 | 9.5–23.0 | 37.5 % | four verbs, one each, real UI |
| Payoff | 690–900 | 23.0–30.0 | 19.4 % | the month fills with mood colour, biggest moment, once |
| Claim | 900–975 | 30.0–32.5 | 6.9 % | one line |
| End card | 975–1080 | 32.5–36.0 | 9.7 % | mark carried in, wordmark wipes, CTA held 3.5 s |

### Proof sub-shots (inside one scene file, local time)

| # | Local s | Verb | Screen | Crop pushed to 1.6–2× |
|---|---|---|---|---|
| 1 | 0.00–3.35 | **Escribe tu día** | `seed-08-editor-dia.png` | Ánimo + Energía selectors |
| 2 | 3.35–6.70 | **Marca tus hábitos** | `seed-01-hoy.png` | Hábitos card (`Leer 20 min` checked) |
| 3 | 6.70–10.05 | **Elige tu rutina** | `seed-03-entrenar.png` | `Full Body A` card with `▶ Empezar` |
| 4 | 10.05–13.50 | **Mira tus récords** | `seed-05-progreso.png` | `140 KG × 10` + records list |

Sub-line under each verb carries only labels/values that are literally on that screen.

## Copy (verbatim sources in parentheses)

- Hook kicker: `BITÁCORA DE VIDA + GIMNASIO` · hook title: **Un día cualquiera**
- Tension L1: **Un diario que abandonas** (persona Lucía: "Diarios que abandona por no saber qué escribir")
- Tension L2: **Apps lentas para anotar series** (persona Marcos: "Apps lentas para anotar series")
- Reveal: **DiarioFit**
- Verbs + sub-lines as tabled above
- Payoff: **Tu mes, de un vistazo**
- Claim: **Bitácora de vida y gimnasio** (requirements line 3) / sub `TUS DATOS, EN TU DISPOSITIVO` (local-first, SQLite)
- End card: icon + **DiarioFit** + CTA `github.com/uskein/FitJournal` + `v1.1.0 · Android`
- Line rhythm: 0.3 s a word + 0.5 s; last line holds ≥ 2 s; titles ≤ 6 words, one line on screen at a time, no trailing period.

## Transitions — 4 kinds, each with a cause

1. **Object carry** (hook→tension, proof→payoff): the element the eye is on scales past the frame
   and its edge becomes the next ground. 0.5 s, `power3.inOut`.
2. **Tab-order push** (between proof verbs): slides in the direction the app's tab bar reads
   (Hoy → Diario → Entrenar → Progreso), so the cut has a reason. 0.45 s, `power4.out`.
3. **Mask expand** (payoff): the calendar's today-circle grows from 46 px to full frame, revealing
   the real grid inside it. 0.6 s, `expo.out`.
4. **Type cut** (tension): hard cuts on the beat, no movement — the only scene that does not move.

## Motion

- Camera moves 0.4–0.6 s, `power4.out` / `expo.out`, motion blur only while moving (`filter: blur`
  on the moving plane, cleared on arrival) — grades/grain/vignette would go through
  `media-treatment`, and this film applies none.
- Reveal supporting elements across the beat (stagger 0.08 s), never all at once at the start.
- Titles land and hold: **no** sliding or shrinking after landing, **no** breathing loops.
- One riser lands on the payoff at f690; the mark lands f1005 and the CTA holds to f1080.

## BANNED by default (named so they cannot creep in)

- dark void with small things floating · glow and particles · three cards in a row ·
  docked logo in a corner · everything fading and sliding up · side-by-side panels or floating
  cards standing in for a scene · every scene entering the same way · the same move beat after
  beat · titles that keep moving after they land · an invented dashboard of any kind ·
  `Introducing` / `Meet` / `unlock` / `seamless` / `supercharge` / `effortless` / `in seconds` ·
  a small phone mock-up centred on an empty canvas · product UI tilted in 3D.

> Note on the banned "cream-paper-serif-mono look": this film uses it **because the approved brand
> identity mandates it** (`manual-identidad-visual.md` §2.7), not as an undecided default — and the
> dominant material is the real product screen, not type cards.

## Sound

Warm minimal pulse ≈100 bpm entering at the reveal (f210); soft key tick on each of the four verbs;
one riser into f690; short fade under the end card. Delivered silent if no music source is
available — stated in the reply, not hidden.
