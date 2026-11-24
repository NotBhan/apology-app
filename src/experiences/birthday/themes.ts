import type { BirthdayThemeId } from "./schema";

/**
 * Birthday themes.
 *
 * Each theme is a comprehensive design system defining its palette,
 * typography intent, envelope style, custom cake presentation,
 * and decorative object family.
 */
export interface BirthdayTheme {
  id: BirthdayThemeId;
  name: string;
  tagline: string;
  description: string;
  palette: {
    background: string;
    surface: string;
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    mutedText: string;
    border: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    greetingStyle: "playful" | "elegant" | "whimsical" | "botanical" | "vintage" | "bold";
  };
  envelope: {
    paper: string;
    flap: string;
    accent: string;
    seal: string;
    sealSymbol: "cake" | "star" | "heart" | "flower" | "stamp" | "ribbon";
  };
  cake: {
    tiers: 2 | 3;
    base: string;
    frosting: string;
    accent: string;
    plate: string;
    topping: "cherries" | "stars" | "strawberries" | "flowers" | "sprinkles";
  };
  decorations: {
    family: "confetti" | "midnight-gold" | "pastel" | "floral" | "vintage" | "playful";
    ambientParticles: "confetti" | "stars" | "balloons" | "petals" | "sparkles";
  };
  motion: "bouncy" | "glide" | "gentle";
}

export const BIRTHDAY_THEMES: readonly BirthdayTheme[] = [
  {
    id: "confetti",
    name: "Confetti Celebration",
    tagline: "Loud, bright, and joyous party energy.",
    description: "Rainbow sprinkles, party streamers, and bright confetti bursts for an energetic, joyful birthday.",
    palette: {
      background: "#fff9f0",
      surface: "#ffffff",
      primary: "#e8590c",
      secondary: "#f06595",
      accent: "#f59f00",
      text: "#3b2a13",
      mutedText: "#8c7a6b",
      border: "#f3e5d0",
    },
    typography: {
      headingFont: "var(--font-display)",
      bodyFont: "var(--font-body)",
      greetingStyle: "playful",
    },
    envelope: {
      paper: "#fff3e0",
      flap: "#ffe0b2",
      accent: "#f59f00",
      seal: "#e8590c",
      sealSymbol: "cake",
    },
    cake: {
      tiers: 2,
      base: "#ffd8a8",
      frosting: "#fff9db",
      accent: "#e8590c",
      plate: "#ffe8cc",
      topping: "cherries",
    },
    decorations: {
      family: "confetti",
      ambientParticles: "confetti",
    },
    motion: "bouncy",
  },
  {
    id: "midnight-gold",
    name: "Midnight Gold",
    tagline: "A quiet room, glowing candles, starry elegance.",
    description: "Deep obsidian backdrop, glowing champagne gold, and radiant starlight for an intimate celebration.",
    palette: {
      background: "#0f0d0c",
      surface: "#1c1714",
      primary: "#e5b869",
      secondary: "#c48b28",
      accent: "#ffd166",
      text: "#f7f0e6",
      mutedText: "#9e9282",
      border: "#332a24",
    },
    typography: {
      headingFont: "var(--font-display)",
      bodyFont: "var(--font-body)",
      greetingStyle: "elegant",
    },
    envelope: {
      paper: "#1a1614",
      flap: "#26201b",
      accent: "#e5b869",
      seal: "#c48b28",
      sealSymbol: "star",
    },
    cake: {
      tiers: 2,
      base: "#2b221b",
      frosting: "#1a1614",
      accent: "#e5b869",
      plate: "#382e25",
      topping: "stars",
    },
    decorations: {
      family: "midnight-gold",
      ambientParticles: "stars",
    },
    motion: "glide",
  },
  {
    id: "pastel",
    name: "Pastel Dream",
    tagline: "Sweet macarons, soft balloons, and tender smiles.",
    description: "Delicate blush, lavender cream, and satin ribbons for a gentle, heartfelt birthday wish.",
    palette: {
      background: "#fdf4f7",
      surface: "#ffffff",
      primary: "#e64980",
      secondary: "#9c7bc2",
      accent: "#63e6be",
      text: "#3d2847",
      mutedText: "#8d7897",
      border: "#fae1e8",
    },
    typography: {
      headingFont: "var(--font-display)",
      bodyFont: "var(--font-body)",
      greetingStyle: "whimsical",
    },
    envelope: {
      paper: "#fde8ef",
      flap: "#fad2e1",
      accent: "#e64980",
      seal: "#9c7bc2",
      sealSymbol: "ribbon",
    },
    cake: {
      tiers: 3,
      base: "#fcc2d7",
      frosting: "#fff0f6",
      accent: "#e64980",
      plate: "#f8f0fc",
      topping: "strawberries",
    },
    decorations: {
      family: "pastel",
      ambientParticles: "balloons",
    },
    motion: "gentle",
  },
  {
    id: "floral",
    name: "Botanical Bloom",
    tagline: "Fresh wildflowers, botanical sprigs, and pressed petals.",
    description: "Sage greens, coral peonies, and rustic botanical wreaths for a grounded, organic celebration.",
    palette: {
      background: "#f4f8f4",
      surface: "#ffffff",
      primary: "#d9534f",
      secondary: "#c86446",
      accent: "#5c946e",
      text: "#1e3325",
      mutedText: "#677d6d",
      border: "#deecdf",
    },
    typography: {
      headingFont: "var(--font-display)",
      bodyFont: "var(--font-body)",
      greetingStyle: "botanical",
    },
    envelope: {
      paper: "#eaf2ea",
      flap: "#dbe8db",
      accent: "#5c946e",
      seal: "#c86446",
      sealSymbol: "flower",
    },
    cake: {
      tiers: 2,
      base: "#e9dac6",
      frosting: "#faf7f2",
      accent: "#d9534f",
      plate: "#dbe8db",
      topping: "flowers",
    },
    decorations: {
      family: "floral",
      ambientParticles: "petals",
    },
    motion: "gentle",
  },
  {
    id: "vintage",
    name: "Vintage Postcard",
    tagline: "Aged airmail parchment, heritage stamps, and timeless love.",
    description: "Classic sepia, deckle-edge card stock, and postmark cancellation stamps for a timeless keepsake.",
    palette: {
      background: "#f6f0e4",
      surface: "#fffcf6",
      primary: "#8c2d38",
      secondary: "#8c6239",
      accent: "#c59b27",
      text: "#2c221e",
      mutedText: "#7c6b61",
      border: "#e4d9c5",
    },
    typography: {
      headingFont: "var(--font-display)",
      bodyFont: "var(--font-body)",
      greetingStyle: "vintage",
    },
    envelope: {
      paper: "#eee5d3",
      flap: "#e2d5bd",
      accent: "#8c2d38",
      seal: "#8c2d38",
      sealSymbol: "stamp",
    },
    cake: {
      tiers: 2,
      base: "#dcc5a2",
      frosting: "#fcf8ee",
      accent: "#8c2d38",
      plate: "#e5d9c2",
      topping: "strawberries",
    },
    decorations: {
      family: "vintage",
      ambientParticles: "sparkles",
    },
    motion: "glide",
  },
  {
    id: "playful",
    name: "Doodle Scrapbook",
    tagline: "Washi tape, sketchbook doodles, and collage joy.",
    description: "Playful cutouts, hand-drawn sparkles, and vibrant fun for creative, spirited birthdays.",
    palette: {
      background: "#faf8f2",
      surface: "#ffffff",
      primary: "#3b5bdb",
      secondary: "#fcc419",
      accent: "#ff6b6b",
      text: "#25262b",
      mutedText: "#70747a",
      border: "#e9ecef",
    },
    typography: {
      headingFont: "var(--font-hand)",
      bodyFont: "var(--font-body)",
      greetingStyle: "bold",
    },
    envelope: {
      paper: "#f1f3f5",
      flap: "#e9ecef",
      accent: "#3b5bdb",
      seal: "#ff6b6b",
      sealSymbol: "heart",
    },
    cake: {
      tiers: 3,
      base: "#ffe066",
      frosting: "#edf2ff",
      accent: "#3b5bdb",
      plate: "#e9ecef",
      topping: "sprinkles",
    },
    decorations: {
      family: "playful",
      ambientParticles: "confetti",
    },
    motion: "bouncy",
  },
];

export function getBirthdayTheme(id: string): BirthdayTheme | undefined {
  return BIRTHDAY_THEMES.find((theme) => theme.id === id);
}

export function resolveBirthdayTheme(id?: string): BirthdayTheme {
  if (!id) return BIRTHDAY_THEMES[0];
  return getBirthdayTheme(id) ?? BIRTHDAY_THEMES[0];
}
