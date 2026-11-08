# Theme specification

Themes are **not** recolourings of one template. Each theme owns:

| Concern | Owner | File |
| --- | --- | --- |
| Palette, typography, motion, scene order, copy tone | data | `src/themes/<id>/theme.ts` |
| Background composition, decorative layout, per-scene artwork | component | `src/themes/<id>/skin.tsx` |

The engine only reads `ApologyTheme`. It never branches on theme id, so a new
theme is a new folder plus one registry entry.

---

## 1. Required exports

### `src/themes/<id>/theme.ts`

```ts
import type { ApologyTheme } from "@/types/theme";

export const theme: ApologyTheme = {
  id: "romantic",
  name: "Romantic",
  tagline: "Soft, warm, a little nervous",
  description: "…one sentence shown on the theme card…",
  category: "Romance",
  palette: {
    background: "#f6effc",
    backgroundAlt: "#efe0f7",
    surface: "#fffafd",
    surfaceAlt: "#f7e9f4",
    primary: "#7b3fa0",
    secondary: "#e58fb6",
    accent: "#c9a227",
    text: "#33203f",
    mutedText: "#7a6685",
    border: "#e6d5ef",
  },
  typography: {
    heading: "display",
    body: "body",
    decorative: "hand",
    headingWeight: 600,
    headingTracking: "-0.015em",
    uppercaseEyebrow: false,
  },
  assets: {
    backgroundPaint: "…css gradient…",
    decorativeElements: ["hearts", "petals", "ribbon"],
    envelope: "blush",
    letter: "deckle",
    texture: "grain",
  },
  motion: {
    preset: "romantic",
    ambientKind: "hearts",
    ambientDensity: "medium",
    sceneEnterDuration: 0.7,
    stagger: 0.12,
    messageReveal: "word-stagger",
    characterEntrance: "rise",
    transition: "crossfade",
  },
  defaultMusic: "soft-lavender",
  sceneIds: [
    "opening",
    "hurt",
    "meaning",
    "sorry",
    "letter",
    "envelope",
    "memory",
    "closing",
    "response",
  ],
  characterStates: { hurt: "sad", meaning: "heart", sorry: "apologizing", closing: "flowers" },
  openingVariant: "bouquet",
  suggestedPack: "teddy-bears",
};
```

### `src/themes/<id>/skin.tsx`

```tsx
"use client";

import type { ThemeSkinProps } from "@/themes/types";
import { theme } from "./theme";

export default function Skin({ sceneId, paused, className }: ThemeSkinProps) {
  return (
    <div className={className} aria-hidden>
      {/* unique DOM composition for this theme only */}
    </div>
  );
}
```

`Skin` **must**:

- Render a full-bleed absolutely-positioned layer (`absolute inset-0`), behind content.
- Be `aria-hidden` and `pointer-events-none`.
- Use `theme.palette` values through CSS custom properties already provided by
  the engine scope (`var(--t-bg)`, `var(--t-primary)`, …) so sender colour
  overrides apply. It may reference literal colours for decorative artwork.
- Change composition by `sceneId` (at least: opening, letter/envelope, memory,
  closing, response).
- Respect `paused` by not running looping animation.
- Animate with CSS keyframes (`cc-float`, `cc-sway`, `cc-twinkle`, `cc-drift`,
  `cc-rise`) or inline `@keyframes` in the component. Framer Motion is **not**
  used for ambient decoration; it would cost a tree of motion components.

`Skin` **must not**:

- Render text content or interactive controls.
- Import the presentation engine.
- Read persisted data.

---

## 2. Scene order contract

`sceneIds` may only contain these keys:

`opening`, `hurt`, `meaning`, `sorry`, `letter`, `envelope`, `memory`, `closing`, `response`.

- `memory` is dropped automatically when the sender uploaded no photos.
- `letter` is dropped automatically when the personal note is empty.
- `opening` and `response` must always be present.
- A theme may reorder, e.g. Heartfelt Letter uses `envelope` **before** `letter`.

---

## 3. Eight distinct directions

Each theme must differ in at least **four** of: background construction, decorative
motif family, typography pairing, motion vocabulary, scene order, card geometry.

| # | id | Direction | Must not look like |
| --- | --- | --- | --- |
| 01 | `romantic` | Lavender/pink, floating hearts, ribbon, bouquet opening, serif + handwriting | |
| 02 | `friendship` | Scrapbook: taped polaroids, doodles, peach/yellow/sky, playful bounce | romantic |
| 03 | `heartfelt` | Paper/ivory, ruled letter, wax seal, envelope first, ink reveal | romantic |
| 04 | `midnight` | Navy/indigo, stars, moonlight glow, slow cinematic fades | heartfelt |
| 05 | `cute` | Bubblegum pastels, bouncy characters, speech bubbles, chunky rounded type | romantic |
| 06 | `regret` | Burgundy/charcoal, dripping rose petals, heavy vignette, restrained fades | midnight |
| 07 | `fresh-start` | Sage/peach/ivory, sunrise arc, butterflies, optimistic easing | friendship |
| 08 | `minimal` | Ivory/black/gold, thin rules, huge negative space, elegant line reveals | all |

---

## 4. Accessibility rules

- Decorative layers never receive focus and never trap pointer events.
- `contrastRatio(palette.text, palette.background) >= 4.5` is asserted in tests.
- Sender colour overrides are validated by `readableTextOn()` before rendering.
- `prefers-reduced-motion` is handled globally in `globals.css`; skins must not
  re-enable motion via inline styles.
