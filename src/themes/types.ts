import type { ComponentType } from "react";
import type { ApologyTheme } from "@/types/theme";

export interface ThemeSkinProps {
  /** Scene id currently on screen, used to vary the composition per beat. */
  sceneId?: string;
  /** 0-1 dim overlay strength for letter/envelope focus moments. */
  focus?: number;
  /** Pause ambient motion (inactive scene / reduced motion / hidden tab). */
  paused?: boolean;
  className?: string;
}

/**
 * Every theme ships its own skin. A skin owns background composition,
 * decoration layout and per-scene phrasing artwork. It must not be a
 * recolour of a shared template.
 */
export type ThemeSkin = ComponentType<ThemeSkinProps>;

export interface ThemeModule {
  theme: ApologyTheme;
  Skin: ThemeSkin;
}
