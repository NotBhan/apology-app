"use client";

import type {
  BirthdayCakeFlavor,
  BirthdayCakeTopping,
  BirthdayCandleMode,
  BirthdayCelebrationIntensity,
  BirthdayCustomization,
  BirthdayGiftReveal,
} from "@/experiences/birthday/schema";
import {
  BIRTHDAY_CAKE_FLAVORS,
  BIRTHDAY_CAKE_TOPPINGS,
  BIRTHDAY_CANDLE_MODES,
  BIRTHDAY_CELEBRATION_INTENSITIES,
  BIRTHDAY_GIFT_REVEALS,
} from "@/experiences/birthday/schema";
import {
  BIRTHDAY_CAKE_FLAVOR_PRESETS,
  BIRTHDAY_COLOR_PRESETS,
  type ResolvedBirthdayConfig,
} from "@/experiences/birthday/resolve";
import {
  DECORATION_DENSITIES,
  ENVELOPE_STYLES,
  FONT_PAIRINGS,
  MOTION_PRESETS,
  TEXT_ALIGNMENTS,
  TEXT_SIZES,
  TRANSITION_STYLES,
} from "@/types/customization";

export type CustomizationUpdater =
  | BirthdayCustomization
  | ((prev: BirthdayCustomization) => BirthdayCustomization);

interface PanelBaseProps {
  customization: BirthdayCustomization;
  onChange: (next: CustomizationUpdater) => void;
}

const FONT_LABELS: Record<(typeof FONT_PAIRINGS)[number], string> = {
  theme: "Theme default",
  editorial: "Editorial serif",
  handwritten: "Handwritten script",
  clean: "Modern sans",
};

const TEXT_SIZE_LABELS: Record<(typeof TEXT_SIZES)[number], string> = {
  compact: "Compact",
  comfortable: "Balanced",
  expressive: "Large",
};

const ENVELOPE_LABELS: Record<(typeof ENVELOPE_STYLES)[number], string> = {
  "wax-seal": "Wax seal",
  ribbon: "Ribbon wrap",
  "open-letter": "Open card",
};

const TRANSITION_LABELS: Record<(typeof TRANSITION_STYLES)[number], string> = {
  theme: "Theme",
  crossfade: "Crossfade",
  scale: "Scale",
  card: "Card turn",
  curtain: "Curtain",
  paper: "Card lift",
};

const MOTION_LABELS: Record<(typeof MOTION_PRESETS)[number], string> = {
  gentle: "Gentle",
  still: "Still",
  expressive: "Lively",
};

const ALIGNMENT_LABELS: Record<(typeof TEXT_ALIGNMENTS)[number], string> = {
  theme: "Theme default",
  center: "Centered",
  left: "Left aligned",
};

const GIFT_REVEAL_LABELS: Record<BirthdayGiftReveal, string> = {
  "tap-unwrap": "Tap to unwrap",
  direct: "Instant reveal",
};

const CANDLE_MODE_LABELS: Record<BirthdayCandleMode, string> = {
  "tap-relight": "Blow & relight",
  "single-wish": "Single wish",
};

const CELEBRATION_LABELS: Record<BirthdayCelebrationIntensity, string> = {
  subtle: "Subtle",
  festive: "Festive",
  grand: "Grand",
};

function chipClass(active: boolean) {
  return `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
    active
      ? "border-[#e8590c] bg-[#fff4ee] text-[#9a3412] font-semibold shadow-2xs"
      : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
  }`;
}

export function BirthdayVisualCustomizePanel({
  customization,
  resolved,
  onChange,
}: PanelBaseProps & { resolved: ResolvedBirthdayConfig }) {
  const colors = customization.colors ?? {};
  const visual = customization.visual ?? {};

  function setColor(key: keyof NonNullable<BirthdayCustomization["colors"]>, val?: string) {
    onChange((prev) => ({
      ...prev,
      colors: { ...(prev.colors ?? {}), [key]: val },
    }));
  }

  function setVisual(patch: Partial<NonNullable<BirthdayCustomization["visual"]>>) {
    onChange((prev) => ({
      ...prev,
      visual: { ...(prev.visual ?? {}), ...patch },
    }));
  }

  return (
    <div className="space-y-4 rounded-xl border border-stone-200 bg-stone-50/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-700">
            Palette, Typography & Atmosphere
          </h3>
          <p className="text-[11px] text-stone-500">
            Keep the theme styling or fine-tune colors, fonts, spacing, and ambient particles.
          </p>
        </div>
        {Object.values(colors).some(Boolean) && (
          <button
            type="button"
            onClick={() => onChange((prev) => ({ ...prev, colors: undefined }))}
            className="text-[11px] font-semibold text-[#e8590c] hover:underline cursor-pointer"
          >
            Reset colors
          </button>
        )}
      </div>

      {/* Curated color presets */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-medium text-stone-600">Curated palettes</span>
        <div className="flex flex-wrap gap-1.5">
          {BIRTHDAY_COLOR_PRESETS.map((preset) => {
            const active =
              colors.background === preset.colors.background &&
              colors.primary === preset.colors.primary;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  onChange((prev) => ({
                    ...prev,
                    colors: { ...preset.colors },
                  }))
                }
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition cursor-pointer ${
                  active
                    ? "border-[#e8590c] bg-[#fff4ee] text-[#9a3412]"
                    : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="h-3 w-3 rounded-full border border-black/15"
                  style={{ background: preset.colors.primary }}
                />
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fine color pickers */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {(
          [
            { key: "background", label: "Backdrop", fallback: resolved.palette.background },
            { key: "surface", label: "Card", fallback: resolved.palette.surface },
            { key: "primary", label: "Primary", fallback: resolved.palette.primary },
            { key: "accent", label: "Accent", fallback: resolved.palette.accent },
            { key: "text", label: "Text", fallback: resolved.palette.text },
          ] as const
        ).map((item) => (
          <label
            key={item.key}
            className="flex items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-stone-700"
          >
            <span>{item.label}</span>
            <input
              type="color"
              aria-label={`${item.label} color`}
              value={colors[item.key] ?? item.fallback}
              onChange={(e) => setColor(item.key, e.target.value)}
              className="h-6 w-7 cursor-pointer rounded border border-stone-200 bg-transparent p-0"
            />
          </label>
        ))}
      </div>

      {resolved.hasLowContrast && (
        <p
          role="status"
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-900"
        >
          Contrast between text and card/backdrop is low ({resolved.contrastRatioValue.toFixed(1)}:1).
          Consider darkening text or lightening the surface for easy reading.
        </p>
      )}

      {/* Typography, size, alignment */}
      <div className="grid gap-3 sm:grid-cols-3 pt-1">
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-stone-600">Font pairing</span>
          <div className="flex flex-wrap gap-1">
            {FONT_PAIRINGS.map((fp) => (
              <button
                key={fp}
                type="button"
                aria-pressed={(visual.fontPairing ?? "theme") === fp}
                onClick={() => setVisual({ fontPairing: fp })}
                className={chipClass((visual.fontPairing ?? "theme") === fp)}
              >
                {FONT_LABELS[fp]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-medium text-stone-600">Text size</span>
          <div className="flex flex-wrap gap-1">
            {TEXT_SIZES.map((sz) => (
              <button
                key={sz}
                type="button"
                aria-pressed={(visual.textSize ?? "comfortable") === sz}
                onClick={() => setVisual({ textSize: sz })}
                className={chipClass((visual.textSize ?? "comfortable") === sz)}
              >
                {TEXT_SIZE_LABELS[sz]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-medium text-stone-600">Alignment</span>
          <div className="flex flex-wrap gap-1">
            {TEXT_ALIGNMENTS.map((align) => (
              <button
                key={align}
                type="button"
                aria-pressed={(visual.alignment ?? "theme") === align}
                onClick={() => setVisual({ alignment: align })}
                className={chipClass((visual.alignment ?? "theme") === align)}
              >
                {ALIGNMENT_LABELS[align]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Decorations toggle & density */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-stone-200/80">
        <label className="inline-flex items-center gap-2 text-xs font-medium text-stone-800 cursor-pointer">
          <input
            type="checkbox"
            checked={visual.decorationsEnabled ?? true}
            onChange={(e) => setVisual({ decorationsEnabled: e.target.checked })}
            className="h-4 w-4 rounded accent-[#e8590c]"
          />
          <span>Show ambient confetti & card ornaments</span>
        </label>

        {(visual.decorationsEnabled ?? true) && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-stone-500">Density:</span>
            {DECORATION_DENSITIES.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={(visual.decorationDensity ?? "balanced") === d}
                onClick={() => setVisual({ decorationDensity: d })}
                className={chipClass((visual.decorationDensity ?? "balanced") === d)}
              >
                {d === "minimal" ? "Minimal" : d === "balanced" ? "Balanced" : "Lush"}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function BirthdayContentAndAudioPanel({
  customization,
  audio,
  onChange,
  onAudioChange,
}: PanelBaseProps & {
  audio: "none" | "celebration" | "soft";
  onAudioChange: (next: "none" | "celebration" | "soft") => void;
}) {
  const content = customization.content ?? {};

  function setCopy(
    key: keyof NonNullable<BirthdayCustomization["content"]>,
    val: string | boolean,
  ) {
    onChange((prev) => ({
      ...prev,
      content: {
        ...(prev.content ?? {}),
        [key]: typeof val === "string" ? (val.trim() ? val : undefined) : val,
      },
    }));
  }

  return (
    <div className="space-y-4 rounded-xl border border-stone-200 bg-stone-50/70 p-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-700">
          Scene Copy, Visibility & Soundtrack
        </h3>
        <p className="text-[11px] text-stone-500">
          Customize labels, hide optional scenes, or attach optional background music.
        </p>
      </div>

      {/* Scene visibility checkboxes */}
      <div className="flex flex-wrap gap-4 text-xs font-medium text-stone-800">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={content.showAgeBadge ?? true}
            onChange={(e) => setCopy("showAgeBadge", e.target.checked)}
            className="h-4 w-4 rounded accent-[#e8590c]"
          />
          <span>Show age chapter badge</span>
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={content.showCakeScene ?? true}
            onChange={(e) => setCopy("showCakeScene", e.target.checked)}
            className="h-4 w-4 rounded accent-[#e8590c]"
          />
          <span>Include cake & wish scene</span>
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={content.showGalleryScene ?? true}
            onChange={(e) => setCopy("showGalleryScene", e.target.checked)}
            className="h-4 w-4 rounded accent-[#e8590c]"
          />
          <span>Include photo gallery scene</span>
        </label>
      </div>

      {/* Copy overrides */}
      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            { key: "openingEyebrow", label: "Opening label", placeholder: "a birthday invitation", max: 60 },
            { key: "openingCta", label: "Open button", placeholder: "Open it", max: 40 },
            { key: "cakeHeading", label: "Cake heading", placeholder: "make a wish", max: 60 },
            { key: "cakeCta", label: "Cake button", placeholder: "Blow out the candles", max: 50 },
            { key: "letterHeading", label: "Letter badge", placeholder: "Personal Letter", max: 60 },
            { key: "letterSignOff", label: "Letter sign-off", placeholder: "With warmest wishes,", max: 60 },
            { key: "galleryHeading", label: "Gallery title", placeholder: "Some moments", max: 60 },
            { key: "finaleHeading", label: "Finale title", placeholder: "Happy birthday.", max: 80 },
          ] as const
        ).map((field) => (
          <label key={field.key} className="block space-y-1">
            <span className="text-[11px] font-medium text-stone-600">{field.label}</span>
            <input
              type="text"
              maxLength={field.max}
              value={typeof content[field.key] === "string" ? content[field.key] : ""}
              onChange={(e) => setCopy(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs text-stone-800 placeholder:text-stone-400 focus:border-[#e8590c] focus:outline-none focus:ring-1 focus:ring-[#e8590c]"
            />
          </label>
        ))}
      </div>

      {/* Optional background audio */}
      <div className="space-y-1.5 pt-1 border-t border-stone-200/80">
        <span className="text-[11px] font-medium text-stone-600">
          Background music (starts after recipient taps to open)
        </span>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: "none", label: "No music" },
              { id: "soft", label: "Soft & Warm" },
              { id: "celebration", label: "Celebration Glow" },
            ] as const
          ).map((track) => (
            <button
              key={track.id}
              type="button"
              aria-pressed={audio === track.id}
              onClick={() => onAudioChange(track.id)}
              className={chipClass(audio === track.id)}
            >
              {track.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BirthdayCakeAndInteractionPanel({
  customization,
  onChange,
}: PanelBaseProps) {
  const cake = customization.visual?.cake ?? {};
  const interaction = customization.interaction ?? {};

  function setCake(patch: Partial<NonNullable<NonNullable<BirthdayCustomization["visual"]>["cake"]>>) {
    onChange((prev) => ({
      ...prev,
      visual: {
        ...(prev.visual ?? {}),
        cake: { ...(prev.visual?.cake ?? {}), ...patch },
      },
    }));
  }

  function setInteraction(patch: Partial<NonNullable<BirthdayCustomization["interaction"]>>) {
    onChange((prev) => ({
      ...prev,
      interaction: { ...(prev.interaction ?? {}), ...patch },
    }));
  }

  return (
    <div className="space-y-4 rounded-xl border border-stone-200 bg-stone-50/70 p-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-700">
          Cake Style & Interaction Behavior
        </h3>
        <p className="text-[11px] text-stone-500">
          Tailor the cake tiers, flavor, toppings, letter opening style, and animation pace.
        </p>
      </div>

      {/* Cake customization */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-stone-600">Cake tiers</span>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              aria-pressed={cake.tiers === undefined}
              onClick={() => setCake({ tiers: undefined })}
              className={chipClass(cake.tiers === undefined)}
            >
              Theme
            </button>
            <button
              type="button"
              aria-pressed={cake.tiers === 2}
              onClick={() => setCake({ tiers: 2 })}
              className={chipClass(cake.tiers === 2)}
            >
              2 Tiers
            </button>
            <button
              type="button"
              aria-pressed={cake.tiers === 3}
              onClick={() => setCake({ tiers: 3 })}
              className={chipClass(cake.tiers === 3)}
            >
              3 Tiers
            </button>
          </div>
        </div>

        <div className="space-y-1 sm:col-span-2">
          <span className="text-[11px] font-medium text-stone-600">Flavor & frosting</span>
          <div className="flex flex-wrap gap-1">
            {BIRTHDAY_CAKE_FLAVORS.map((fl: BirthdayCakeFlavor) => (
              <button
                key={fl}
                type="button"
                aria-pressed={(cake.flavor ?? "theme") === fl}
                onClick={() => setCake({ flavor: fl })}
                className={chipClass((cake.flavor ?? "theme") === fl)}
              >
                {fl === "theme" ? "Theme" : BIRTHDAY_CAKE_FLAVOR_PRESETS[fl].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-[11px] font-medium text-stone-600">Cake toppings</span>
        <div className="flex flex-wrap gap-1">
          {BIRTHDAY_CAKE_TOPPINGS.map((top: BirthdayCakeTopping) => (
            <button
              key={top}
              type="button"
              aria-pressed={(cake.topping ?? "theme") === top}
              onClick={() => setCake({ topping: top })}
              className={chipClass((cake.topping ?? "theme") === top)}
            >
              {top === "theme" ? "Theme" : top.charAt(0).toUpperCase() + top.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Interaction behavior controls */}
      <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-stone-200/80">
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-stone-600">Letter presentation</span>
          <div className="flex flex-wrap gap-1">
            {ENVELOPE_STYLES.map((style) => (
              <button
                key={style}
                type="button"
                aria-pressed={(interaction.envelopeStyle ?? "wax-seal") === style}
                onClick={() => setInteraction({ envelopeStyle: style })}
                className={chipClass((interaction.envelopeStyle ?? "wax-seal") === style)}
              >
                {ENVELOPE_LABELS[style]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-medium text-stone-600">Candle interaction</span>
          <div className="flex flex-wrap gap-1">
            {BIRTHDAY_CANDLE_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={(interaction.candleMode ?? "tap-relight") === mode}
                onClick={() => setInteraction({ candleMode: mode })}
                className={chipClass((interaction.candleMode ?? "tap-relight") === mode)}
              >
                {CANDLE_MODE_LABELS[mode]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-medium text-stone-600">Gift box unwrap</span>
          <div className="flex flex-wrap gap-1">
            {BIRTHDAY_GIFT_REVEALS.map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={(interaction.giftReveal ?? "tap-unwrap") === mode}
                onClick={() => setInteraction({ giftReveal: mode })}
                className={chipClass((interaction.giftReveal ?? "tap-unwrap") === mode)}
              >
                {GIFT_REVEAL_LABELS[mode]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-medium text-stone-600">Celebration burst</span>
          <div className="flex flex-wrap gap-1">
            {BIRTHDAY_CELEBRATION_INTENSITIES.map((level) => (
              <button
                key={level}
                type="button"
                aria-pressed={(interaction.celebrationIntensity ?? "festive") === level}
                onClick={() => setInteraction({ celebrationIntensity: level })}
                className={chipClass((interaction.celebrationIntensity ?? "festive") === level)}
              >
                {CELEBRATION_LABELS[level]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-medium text-stone-600">Scene transition</span>
          <div className="flex flex-wrap gap-1">
            {TRANSITION_STYLES.map((style) => (
              <button
                key={style}
                type="button"
                aria-pressed={(interaction.transitionStyle ?? "theme") === style}
                onClick={() => setInteraction({ transitionStyle: style })}
                className={chipClass((interaction.transitionStyle ?? "theme") === style)}
              >
                {TRANSITION_LABELS[style]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-medium text-stone-600">Motion preset</span>
          <div className="flex flex-wrap gap-1">
            {MOTION_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-pressed={(interaction.motionPreset ?? "gentle") === preset}
                onClick={() => setInteraction({ motionPreset: preset })}
                className={chipClass((interaction.motionPreset ?? "gentle") === preset)}
              >
                {MOTION_LABELS[preset]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
