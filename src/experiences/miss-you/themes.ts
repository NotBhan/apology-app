import type { MissYouThemeId } from "./schema";

export interface MissYouTheme {
  id: MissYouThemeId;
  name: string;
  tagline: string;
  description: string;
  isDark: boolean;
  palette: {
    background: string;
    surface: string;
    surfaceAlt: string;
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
    decoFont: string;
  };
  atmosphere: {
    motif: "airmail" | "rain" | "coffee-steam" | "constellation" | "botanical";
    defaultAudio: "none" | "soft-lavender" | "midnight-glow" | "paper-morning";
  };
  stationery: {
    stampText: string;
    paperStyle: "airmail" | "slate" | "linen" | "celestial" | "herbarium";
  };
}

export const MISS_YOU_THEMES: readonly MissYouTheme[] = [
  {
    id: "dusk-postage",
    name: "Airmail at Dusk",
    tagline: "Copper-sealed twilight stationery with plum ink.",
    description: "Tactile blush parchment with burgundy borders and waxed postmark details.",
    isDark: false,
    palette: {
      background: "#fdf5f8",
      surface: "#ffffff",
      surfaceAlt: "#f9ebf1",
      primary: "#9f3e67",
      secondary: "#7b527c",
      accent: "#b87635",
      text: "#2f1b28",
      mutedText: "#6e4f62",
      border: "#ebd5df",
    },
    typography: {
      headingFont: "var(--font-display)",
      bodyFont: "var(--font-body)",
      decoFont: "var(--font-hand)",
    },
    atmosphere: {
      motif: "airmail",
      defaultAudio: "soft-lavender",
    },
    stationery: {
      stampText: "PAR AVION",
      paperStyle: "airmail",
    },
  },
  {
    id: "midnight-window",
    name: "Rain on the Windowpane",
    tagline: "Late hours, warm amber lamp light, and soft rain outside.",
    description: "Deep slate blue with glowing amber highlights and unhurried midnight calm.",
    isDark: true,
    palette: {
      background: "#0f1722",
      surface: "#182334",
      surfaceAlt: "#202e44",
      primary: "#f3b96b",
      secondary: "#7ea2c9",
      accent: "#e09f5a",
      text: "#f1f5f9",
      mutedText: "#a3b4c8",
      border: "#2a3a50",
    },
    typography: {
      headingFont: "var(--font-display)",
      bodyFont: "var(--font-body)",
      decoFont: "var(--font-hand)",
    },
    atmosphere: {
      motif: "rain",
      defaultAudio: "midnight-glow",
    },
    stationery: {
      stampText: "LATE HOUR",
      paperStyle: "slate",
    },
  },
  {
    id: "morning-coffee",
    name: "Empty Chair Across the Table",
    tagline: "Sunlit oat linen, slow coffee mornings, and ordinary hours missed.",
    description: "Warm oat cream, espresso brown typography, terracotta accents, and rising steam ribbons.",
    isDark: false,
    palette: {
      background: "#faf4ec",
      surface: "#ffffff",
      surfaceAlt: "#f4eadf",
      primary: "#9c4a2d",
      secondary: "#6f5342",
      accent: "#c58238",
      text: "#2d1e16",
      mutedText: "#6d574b",
      border: "#e7d8c6",
    },
    typography: {
      headingFont: "var(--font-display)",
      bodyFont: "var(--font-body)",
      decoFont: "var(--font-hand)",
    },
    atmosphere: {
      motif: "coffee-steam",
      defaultAudio: "paper-morning",
    },
    stationery: {
      stampText: "08:15 AM",
      paperStyle: "linen",
    },
  },
  {
    id: "starlight-distance",
    name: "Under the Same Sky",
    tagline: "Two distant cities beneath one constellation-lit horizon.",
    description: "Midnight indigo velvet, rose-gold star arcs, and shared coordinates.",
    isDark: true,
    palette: {
      background: "#0d1024",
      surface: "#161b3a",
      surfaceAlt: "#1e244d",
      primary: "#e49eb2",
      secondary: "#9eb2ff",
      accent: "#f2d084",
      text: "#eef1ff",
      mutedText: "#a8b2db",
      border: "#2a3160",
    },
    typography: {
      headingFont: "var(--font-display)",
      bodyFont: "var(--font-body)",
      decoFont: "var(--font-hand)",
    },
    atmosphere: {
      motif: "constellation",
      defaultAudio: "midnight-glow",
    },
    stationery: {
      stampText: "SAME SKY",
      paperStyle: "celestial",
    },
  },
  {
    id: "pressed-violet",
    name: "Pressed Wildflower",
    tagline: "Wildflowers pressed between pages while counting down to you.",
    description: "Herbarium sage cream, forest slate ink, and dried lavender sprigs for patient affection.",
    isDark: false,
    palette: {
      background: "#f4f6f1",
      surface: "#ffffff",
      surfaceAlt: "#ebf0e6",
      primary: "#6c4488",
      secondary: "#4d6b59",
      accent: "#a67a5b",
      text: "#1e2b24",
      mutedText: "#54685d",
      border: "#dae1d7",
    },
    typography: {
      headingFont: "var(--font-display)",
      bodyFont: "var(--font-body)",
      decoFont: "var(--font-hand)",
    },
    atmosphere: {
      motif: "botanical",
      defaultAudio: "soft-lavender",
    },
    stationery: {
      stampText: "HERBARIUM",
      paperStyle: "herbarium",
    },
  },
];

export function getMissYouTheme(id: string): MissYouTheme | undefined {
  return MISS_YOU_THEMES.find((theme) => theme.id === id);
}

export function resolveMissYouTheme(id?: string): MissYouTheme {
  if (!id) return MISS_YOU_THEMES[0]!;
  return getMissYouTheme(id) ?? MISS_YOU_THEMES[0]!;
}
