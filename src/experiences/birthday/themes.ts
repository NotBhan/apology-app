/**
 * Birthday themes.
 *
 * These are not apology themes with different colours: the palette, typography
 * intent and motion feel are defined separately, and nothing here imports the
 * apology theme types. A theme is data; the birthday presentation consumes it.
 */
export interface BirthdayTheme {
  id: string;
  name: string;
  /** One line for the picker. */
  tagline: string;
  palette: {
    background: string;
    surface: string;
    primary: string;
    accent: string;
    text: string;
  };
  /** Celebration versus restrained; drives motion, not layout. */
  motion: "bouncy" | "glide";
}

export const BIRTHDAY_THEMES: readonly BirthdayTheme[] = [
  {
    id: "confetti",
    name: "Confetti",
    tagline: "Loud, bright, and entirely unembarrassed.",
    palette: {
      background: "#fff7e6",
      surface: "#ffffff",
      primary: "#e8590c",
      accent: "#f59f00",
      text: "#3b2a13",
    },
    motion: "bouncy",
  },
  {
    id: "midnight-gold",
    name: "Midnight Gold",
    tagline: "A quiet room, one candle, a lot of feeling.",
    palette: {
      background: "#14110f",
      surface: "#1f1a16",
      primary: "#d4a017",
      accent: "#f2c14e",
      text: "#f6efe3",
    },
    motion: "glide",
  },
];

export function getBirthdayTheme(id: string): BirthdayTheme | undefined {
  return BIRTHDAY_THEMES.find((theme) => theme.id === id);
}
