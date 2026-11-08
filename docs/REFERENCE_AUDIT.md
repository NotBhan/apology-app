# Reference audit — Phase 00

## Status of supplied references

| Source | Status | Consequence |
| --- | --- | --- |
| `1000135829.jpg` – `1000135833.jpg` | **Not available.** The project directory was empty and no file matching these names existed anywhere on disk (searched `~/Documents`, `~/Downloads`, `~/Pictures`, `~/Desktop`, `/tmp`, and a full `$HOME` scan). | Creator-flow layout re-derived from the written brief and the public product site. |
| `Screenshot_2026-11-04-21-30-26-023_com.instagram.android.jpg` | **Not available.** | — |
| `1000135835.jpg` – `1000135846.jpg` (10 files) | **Not available.** | Recipient scene sequence taken from the explicit Scene 01–09 specification in the brief. |
| `1000135848.mp4` | **Not available.** | Timing and character-motion behaviour designed from the brief's motion section, not from observed footage. |
| `https://koikoiapp.com/` | **Available.** Fetched and read. | Confirmed the product shape: guided builder → preview → private link; apology is one of several "surprises"; 4 steps (choose moment, add personal bits, preview, share); link stays private and permanent; no app/no design skills. |

**Reported honestly rather than silently substituting.** Nothing in this
implementation is presented as a reproduction of artwork that could not be
inspected. All characters, textures and motion are original.

## What the public reference established

1. **Creator flow**: four beats — choose the moment → personalise → preview →
   share one link. The apology product is one mode inside a broader generator,
   so the wizard must be self-contained and fast.
2. **Trust copy**: "no signup, no design skills", "private link", "preview
   everything first". These shaped the landing page and the pre-wizard page.
3. **Preview is a first-class step**, not a hidden toggle. Implemented as a
   dedicated route with an external control surface.
4. **Mobile-first composition** with a phone-shaped preview on desktop.

## Reference interpretation rules applied

- Interaction *patterns* (guided steps, seeded message starters, a sealed
  letter, a response at the end) are reused; branding, checkout, pricing and
  proprietary artwork are not.
- The brief's eight themes, six packs and nine scene types are the source of
  truth for structure, because the screenshots that would have shown the
  original's own scene order were unavailable.
- Where the brief and a natural reading conflicted, the brief won. Example: the
  response copy originally treated forgiveness as non-celebratory; the brief
  asks for a *gentle* celebration, so forgiveness triggers warm, restrained
  sparkle rather than confetti.

## Gaps this creates

| Gap | Mitigation |
| --- | --- |
| No sight of the original's exact typography scale or spacing | Type scale derived from mobile ergonomics (clamp-based, 360 px baseline) |
| No video timing reference | Timings chosen for readability: 620 ms scene crossfade, 850 ms character entrance, 26 ms/char typewriter |
| No artwork to license-check against | All art original; `source` field on every pack is `original` |
| No evidence of the original's envelope mechanics | Envelope rebuilt from first principles as a five-stage hinge animation |
