# Scene specification

Every scene is produced by `buildScenes(content, theme)` in
`src/presentation/build-scenes.ts`. Order comes from `theme.sceneIds`; content
comes from the sender; copy comes from the theme's tone.

## Common chrome

Every scene is rendered inside `PresentationEngine`, which owns:

- progress rail (one segment per scene, current segment brighter)
- `NN / NN` counter
- back control (scene 1 has none)
- audio control (play/pause, mute)
- theme skin layer, paused when the scene is inactive

## Scene keys

| key | type | included when |
| --- | --- | --- |
| `opening` | `opening` | always |
| `hurt` | `message` | theme lists it |
| `meaning` | `message` | theme lists it |
| `sorry` | `message` | theme lists it |
| `letter` | `letter` | personal note is non-empty |
| `envelope` | `envelope` | theme lists it |
| `memory` | `memory` | at least one photo uploaded |
| `closing` | `closing` | theme lists it |
| `response` | `response` | always |

### 01 · Opening

- Full-bleed theme skin.
- Character enters with the theme's `characterEntrance` preset in the
  `apologizing` state.
- Greeting combines the recipient's name with the theme's opening title
  (`Hear me out, Ananya?`, `Will you listen, Ananya?`, `Hi Ananya,` for minimal).
- Handwritten subline naming the sender.
- CTA: "Hear me out". This gesture also arms audio (browser autoplay policy).

### 02–04 · Messages

- One sender message per scene, verbatim, no truncation or rewriting.
- Eyebrow + theme heading + message card.
- Reveal mode is the theme's (`word-stagger`, `typewriter`, `ink`,
  `line-reveal`, `fade`).
- Character state per theme (`sad` → `heart` → `apologizing` by default).

### 05 · Letter

- `LetterCard` on the theme's paper variant (`ruled`, `deckle`, `plain`, `note`).
- Addressed to the recipient by name; signed by the sender with a handwritten
  flourish.
- Body is the personal note. Scene is skipped when the note is empty.

### 06 · Envelope

Five stages, all real state transitions:

1. `sealed` — flap closed, wax seal centred, CTA "Tap the seal".
2. `cracking` — seal scales, rocks and fades (420 ms).
3. `opening` — flap rotates −172° about its top hinge (720 ms).
4. `rising` — letter slides out of the pocket and up (750 ms).
5. `unfolded` — `LetterCard` fades in beneath the envelope.

Continue is disabled until the envelope has been opened.

### 07 · Memory

- Renders `customization.photos` (max 5) in one of three layouts:
  - `polaroid` — snap-scrolling tilted prints with captions.
  - `scrapbook` — taped, rotated collage.
  - `slideshow` — one at a time, prev/next, dot indicator.
- Skipped entirely when no photos exist.

### 08 · Closing

- Theme character in a resolved state (`flowers` by default).
- Closing heading + final message + handwritten signature.
- No celebratory effects: this is the sender's last word, not a resolution.

### 09 · Response

- Gentle question from the theme's tone ("Can you forgive me?" /
  "Where do you want to leave this?" / "Is there anything left for us?").
- Optional emotion chips (upset / getting there / okay) that only change the
  character's expression.
- Four optional answers. Selecting one is **local state only**.
- After answering: contextual copy, a "change my answer" control, replay, and an
  opt-in to copy a short reply the recipient can send themselves.
- Nothing is transmitted. There is no endpoint that accepts a response.

## Transition presets

`crossfade` · `scale` · `card` · `curtain` · `paper` — chosen per theme, all
620 ms with `[0.22, 1, 0.36, 1]`.

## Rules the engine enforces

1. A theme may not contain duplicate scene keys.
2. `opening` and `response` are required for every theme.
3. Optional scenes are dropped by data, never by a runtime error.
4. Scene content is data only. Nothing from persistence can define components,
   timing functions or selectors.
