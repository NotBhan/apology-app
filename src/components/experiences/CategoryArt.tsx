import type { ReactElement } from "react";

/**
 * Per-category decorative artwork.
 *
 * Each category gets its own composition rather than a recoloured card: a
 * folded note for apologies, balloons for celebrations, layered hearts for
 * affection, a ring for proposals, a starburst for appreciation. Pure SVG so
 * there are no external images and no emoji.
 */
export function CategoryArt({
  id,
  accent,
  className,
}: {
  id: string;
  accent: string;
  className?: string;
}): ReactElement {
  const common = { fill: "none", stroke: accent, strokeWidth: 2.5, strokeLinecap: "round" as const };

  switch (id) {
    case "apology":
      return (
        <svg viewBox="0 0 320 160" className={className} aria-hidden>
          <rect x="88" y="38" width="144" height="88" rx="12" fill="#ffffff" stroke={accent} strokeWidth="2.5" />
          <path d="M92 50 L160 98 L228 50" {...common} />
          <path d="M100 118 l10 10 M220 118 l-10 10" {...common} strokeDasharray="4 6" />
          <circle cx="72" cy="52" r="16" fill={accent} fillOpacity="0.12" />
          <circle cx="248" cy="104" r="22" fill={accent} fillOpacity="0.08" />
        </svg>
      );
    case "celebration":
      return (
        <svg viewBox="0 0 320 160" className={className} aria-hidden>
          <circle cx="124" cy="56" r="26" fill={accent} fillOpacity="0.85" />
          <circle cx="182" cy="44" r="20" fill={accent} fillOpacity="0.55" />
          <circle cx="212" cy="70" r="16" fill={accent} fillOpacity="0.35" />
          <path d="M124 82 v42 M182 64 v48 M212 86 v34" {...common} strokeDasharray="3 5" />
          <path d="M84 40 l6 10 M60 84 l10 4 M248 34 l10 6" {...common} />
          <rect x="96" y="112" width="10" height="6" rx="2" fill={accent} fillOpacity="0.6" transform="rotate(-18 101 115)" />
          <rect x="232" y="108" width="10" height="6" rx="2" fill={accent} fillOpacity="0.6" transform="rotate(22 237 111)" />
        </svg>
      );
    case "affection":
      return (
        <svg viewBox="0 0 320 160" className={className} aria-hidden>
          <path
            d="M160 118 C120 92 96 76 96 56 a26 26 0 0 1 48-14 a26 26 0 0 1 48 14 c0 20-24 36-64 62 Z"
            fill={accent}
            fillOpacity="0.18"
            stroke={accent}
            strokeWidth="2.5"
          />
          <path
            d="M196 106 C176 92 164 84 164 72 a14 14 0 0 1 26-8 a14 14 0 0 1 26 8 c0 12-12 20-32 34 Z"
            fill={accent}
            fillOpacity="0.35"
          />
          <circle cx="86" cy="44" r="14" fill={accent} fillOpacity="0.12" />
          <circle cx="240" cy="48" r="10" fill={accent} fillOpacity="0.12" />
        </svg>
      );
    case "proposal":
      return (
        <svg viewBox="0 0 320 160" className={className} aria-hidden>
          <circle cx="160" cy="86" r="32" {...common} strokeWidth="3" />
          <path d="M160 34 l12 14 -12 14 -12-14 Z" fill={accent} fillOpacity="0.85" />
          <path d="M110 54 l5 9 M210 54 l-5 9 M96 96 l10 3 M224 96 l-10 3" {...common} />
          <circle cx="118" cy="120" r="18" fill={accent} fillOpacity="0.1" />
          <circle cx="204" cy="122" r="14" fill={accent} fillOpacity="0.1" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 320 160" className={className} aria-hidden>
          <path
            d="M160 34 l10 26 26 10 -26 10 -10 26 -10-26 -26-10 26-10 Z"
            fill={accent}
            fillOpacity="0.85"
          />
          <path d="M104 44 l4 10 10 4 -10 4 -4 10 -4-10 -10-4 10-4 Z" fill={accent} fillOpacity="0.35" />
          <path d="M222 92 l4 10 10 4 -10 4 -4 10 -4-10 -10-4 10-4 Z" fill={accent} fillOpacity="0.3" />
          <circle cx="160" cy="118" r="26" fill={accent} fillOpacity="0.08" />
        </svg>
      );
  }
}
