# Design system

## 1. Two visual languages

| Surface | Language | Why |
| --- | --- | --- |
| Product shell (`/`, `/create`, `/manage`, `/preview` chrome) | Lavender → ivory. Serif display, handwriting accent, white rounded surfaces, one pale-purple accent. Max content width 600 px. | Calm, editorial, unmistakably a *maker* tool. |
| Recipient experience (`/letter/[token]`) | Owned entirely by the selected theme. | No shared "app" chrome may intrude on the gift. |

The shell never appears inside the phone frame, and theme colours never leak into
the shell.

## 2. Shell tokens

| Token | Value | Use |
| --- | --- | --- |
| Shell background | `#faf6ff` | Page |
| Card | `#ffffff` | Wizard cards, theme cards |
| Ink | `#33203f` | Headings |
| Body ink | `#6b5580` | Paragraphs |
| Muted | `#8a7a9c` | Hints, metadata |
| Faint | `#a394b4` | Step labels, counters |
| Accent | `#6d3fa8` (hover `#5f3596`) | Primary buttons |
| Accent tint | `#f2ecfa` | Secondary buttons, chips |
| Border | `#e6dcf1` / `#ece2f6` | Inputs, cards |
| Success | `#3f7a4a` on `#e8f5ec` | "Live" pill |
| Danger | `#a8556b` on `#fdf1f3` | Revoke, errors |

## 3. Type

| Role | Family | Notes |
| --- | --- | --- |
| Shell display | Playfair Display (600) | `clamp(1.6rem, 6vw, 2rem)` step titles |
| Shell body | Nunito (400/600) | 0.78–0.95 rem, 1.6–1.75 line height |
| Handwriting | Caveat | Landing subline, letter signatures |
| UI | Inter | Tabular counters, small labels |

Theme typography is separate (`--t-font-heading`, `--t-font-body`,
`--t-font-deco`) and resolved per theme.

## 4. Spacing and radius

- 4 px base scale; wizard rhythm is 6/7 (24/28 px) between sections.
- Radii: inputs 16 px, cards 22–24 px, sheets 26 px, pills 9999 px.
- Minimum touch target 40 px; primary buttons 44–48 px.

## 5. Motion

| Layer | Engine | Budget |
| --- | --- | --- |
| Ambient decoration | CSS keyframes in theme skins | ≤ 20 s loops, opacity ≤ 0.5 |
| Scene change | Framer Motion `AnimatePresence` | 620 ms |
| Character entrance | Framer Motion | 850 ms |
| Text reveal | Framer Motion / CSS | 500–1100 ms |
| Envelope | Framer Motion stages | 1.75 s total, interrupt-safe |
| Micro-interaction | CSS `active:scale` | 100 ms |

Rules:

1. Never animate more than two character states at once.
2. Ambient loops stop when `paused` (inactive scene, hidden tab, reduced motion).
3. `prefers-reduced-motion` collapses all durations globally; components also
   branch on `useReducedMotion()` so typewriter and word-stagger degrade to
   plain text rather than animating at 1 ms.
4. No motion is required to understand content.

## 6. Accessibility

- Contrast: shell text ≥ 7:1 on `#faf6ff`; theme body text ≥ 4.5:1, asserted in
  `src/themes/registry.test.ts`.
- Focus rings are restyled, never removed (`:focus-visible` in `globals.css`).
- Every icon-only control has an `aria-label`; decorative layers are
  `aria-hidden` + `pointer-events-none`.
- Scenes are reachable with ← →, and each has a progress indicator plus a text
  counter so position is never conveyed by colour alone.
- The recipient can leave at any point: no modal traps, no scroll lock.

## 7. Anti-patterns (rejected in review)

- Glassmorphism as a default surface.
- Generic multi-stop "AI" gradients on the shell.
- Emoji standing in for character art.
- Eight themes that differ only by hue rotation.
- Cards nested inside cards without hierarchy change.
