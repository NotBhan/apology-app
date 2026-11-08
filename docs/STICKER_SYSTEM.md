# Sticker system specification

## 1. Model

A **sticker pack** is a character collection, independent of any theme. Any pack
can be paired with any theme. The sender's pack choice is stored as
`stickerPackId` and never mutates message content.

```ts
export interface StickerPack {
  id: StickerPackId;
  name: string;
  tagline: string;
  accent: string;
  characterName: string;
  states: readonly CharacterState[];
  source: "original" | "licensed";
  licence?: string;
}
```

## 2. Required files per pack

```
src/sticker-packs/<id>/
├── meta.ts   → export const meta: StickerPack
└── art.tsx   → export default { render, Decorative } satisfies StickerPackArt
```

### `meta.ts`

```ts
import type { StickerPack } from "@/sticker-packs/types";
import { CHARACTER_STATES } from "@/types/sticker";

export const meta: StickerPack = {
  id: "cats",
  name: "Cats",
  tagline: "Dramatic, soft, secretly obsessed with you",
  accent: "#e8a33d",
  characterName: "Mochi the cat",
  states: CHARACTER_STATES,
  source: "original",
  licence: "Original artwork — Koi Koi",
};
```

### `art.tsx`

```tsx
"use client";

import type { CharacterState } from "@/types/sticker";
import type { StickerPackArt, StickerArtProps } from "../types";

function Character({ state, className, animate = true }: StickerArtProps & { state: CharacterState }) {
  return <svg viewBox="0 0 200 200" className={className} role="presentation" aria-hidden>…</svg>;
}

const art: StickerPackArt = {
  render: (state) => (props) => <Character state={state} {...props} />,
  Decorative: ({ className, animate }) => <svg … />,
};

export default art;
```

## 3. State contract

Every pack must render all eleven states. The engine never has a hole.

| state | Required visual meaning |
| --- | --- |
| `idle` | neutral, breathing loop |
| `blink` | eyes closing loop |
| `happy` | eyes curved, open smile |
| `sad` | downcast brows, small mouth |
| `crying` | tears, closed or glistening eyes |
| `hugging` | arms wrapped around something/someone |
| `apologizing` | bowed head, hands together or behind back |
| `flowers` | holding a bouquet |
| `heart` | holding a heart to the chest |
| `hopeful` | looking up, soft smile |
| `celebrate` | arms up, confetti/sparkles |

**Anti-patterns (rejected in review):**

- One drawing reused with only a colour change.
- Emoji substituting for character art.
- A state that is a static image described as animated.
- Identical silhouettes across packs. Cats must have ears + whiskers + tail;
  capybaras must be barrel-bodied with a blocky muzzle; bunnies long ears; etc.

## 4. Animation rules

- All motion is CSS keyframes scoped to the SVG (`cc-blink`, `cc-breathe`, …) or
  SMIL. No JS animation loops per sticker.
- When `animate === false` (inactive scene, reduced motion, hidden tab) the art
  renders **static** with the same pose. Never unmount.
- Loop only `idle` and `blink`. Emotional states settle and stop.
- Max two simultaneously animating characters per scene.

## 5. Placements

`StickerPlacement` positions a character in scene-relative percentages, so
layouts hold from 360 px to desktop:

```ts
{ stickerId: "cats:sad", x: 50, y: 62, width: 42, layer: 2, enter: "pop", mobile: { width: 52, y: 66 } }
```

## 6. Formats

| format | renderer | when |
| --- | --- | --- |
| `svg` | inline React art | default, original packs |
| `lottie` | `lottie-react`, lazy | licensed vector loops |
| `rive` | `@rive-app/react-canvas`, lazy | interactive characters |
| `webp` / `apng` | `<img>` with `preload` | licensed raster art |

File-backed assets live in `public/stickers/<packId>/<state>.<ext>` and are
resolved by `resolveStickerAsset()`. A missing file falls back to the pack's
`idle` SVG — never a broken image.

## 7. Licensing

- `source: "original"` — authored for this project, free to ship.
- `source: "licensed"` — `licence` must name the licence and holder.
- **Bubu & Dudu** ships as an original homage pack (`bubu-dudu`) with different
  designs, names and silhouettes. No third-party artwork is copied.
