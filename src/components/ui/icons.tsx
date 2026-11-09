import {
  ArrowRight,
  CalendarX,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  HeartCrack,
  Link2Off,
  Lock,
  MessageCircleOff,
  Pause,
  PenLine,
  Play,
  RefreshCw,
  Trash2,
  Volume2,
  VolumeX,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Functional icon set. One registry, so a control cannot drift into a
 * bespoke glyph and the audit has a single list to check.
 *
 * Decorative art and character stickers deliberately do not live here: they are
 * theme skins and sticker packs, not icons.
 */
export const ICONS = {
  play: Play,
  pause: Pause,
  "volume-on": Volume2,
  "volume-off": VolumeX,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  "arrow-right": ArrowRight,
  heart: HeartCrack,
  check: Check,
  trash: Trash2,
  refresh: RefreshCw,
  "external-link": ExternalLink,
  copy: Copy,
  lock: Lock,
  clock: Clock,
  "message-circle-off": MessageCircleOff,
  "heart-crack": HeartCrack,
  "link-off": Link2Off,
  "calendar-off": CalendarX,
  "pen-line": PenLine,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  /**
   * Accessible name. Omit only when the icon sits next to text that already
   * names the action — the icon is then hidden from assistive tech.
   */
  label?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 16, className, label, strokeWidth = 1.8 }: IconProps) {
  const Glyph = ICONS[name];
  return (
    <Glyph
      size={size}
      strokeWidth={strokeWidth}
      className={cn("shrink-0", className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      focusable="false"
    />
  );
}
