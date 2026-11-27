"use client";

import type { ApologyInteractionCustomization, VisualCustomization } from "@/types/customization";
import { cn } from "@/lib/cn";

interface StyleAndMotionPanelProps {
  visual: VisualCustomization;
  interaction: ApologyInteractionCustomization;
  onVisualChange: (patch: Partial<VisualCustomization>) => void;
  onInteractionChange: (patch: Partial<ApologyInteractionCustomization>) => void;
}

const FONT_OPTIONS = [
  { value: "theme", label: "Theme" },
  { value: "editorial", label: "Editorial" },
  { value: "handwritten", label: "Handwritten" },
  { value: "clean", label: "Clean" },
] as const;

const SIZE_OPTIONS = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Standard" },
  { value: "expressive", label: "Expressive" },
] as const;

const ALIGN_OPTIONS = [
  { value: "theme", label: "Theme" },
  { value: "left", label: "Left" },
  { value: "center", label: "Centered" },
] as const;

const DENSITY_OPTIONS = [
  { value: "minimal", label: "Minimal" },
  { value: "balanced", label: "Balanced" },
  { value: "lush", label: "Lush" },
] as const;

const ENVELOPE_OPTIONS = [
  { value: "wax-seal", label: "Wax seal", hint: "Tap the seal to unfold" },
  { value: "ribbon", label: "Silk ribbon", hint: "Untie the sash to open" },
  { value: "open-letter", label: "Open stationery", hint: "Show the note directly" },
] as const;

const TRANSITION_OPTIONS = [
  { value: "theme", label: "Theme default" },
  { value: "crossfade", label: "Crossfade" },
  { value: "card", label: "Card lift" },
  { value: "paper", label: "Paper fold" },
  { value: "scale", label: "Soft zoom" },
  { value: "curtain", label: "Curtain" },
] as const;

const REVEAL_OPTIONS = [
  { value: "theme", label: "Theme default" },
  { value: "word-stagger", label: "Word stagger" },
  { value: "ink", label: "Ink bloom" },
  { value: "typewriter", label: "Typewriter" },
  { value: "line-reveal", label: "Line reveal" },
  { value: "fade", label: "Gentle fade" },
] as const;

const MOTION_OPTIONS = [
  { value: "gentle", label: "Gentle" },
  { value: "expressive", label: "Expressive" },
  { value: "still", label: "Reduced / Still" },
] as const;

function OptionPills<T extends string>({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onSelect: (next: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#7c6892]">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              aria-pressed={active}
              className={cn(
                "min-h-9 rounded-full border px-3 py-1.5 text-[0.74rem] font-semibold transition active:scale-[0.98]",
                active
                  ? "border-[#8a5bc4] bg-[#f4eefb] text-[#4b2f6b]"
                  : "border-[#ece2f6] bg-white text-[#7c6892] hover:border-[#d5c3eb]",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StyleAndMotionPanel({
  visual,
  interaction,
  onVisualChange,
  onInteractionChange,
}: StyleAndMotionPanelProps) {
  const decoOn = visual.decorationsEnabled !== false;

  return (
    <div className="space-y-6 border-t border-[#ece2f6] pt-5">
      <section className="space-y-4">
        <div>
          <h2 className="text-[0.86rem] font-semibold text-[#33203f]">
            Typography &amp; Atmosphere
          </h2>
          <p className="text-[0.72rem] text-[#8a7a9c]">
            Curated pairings and backdrop texture — stays readable at every width.
          </p>
        </div>

        <OptionPills
          label="Font pairing"
          value={visual.fontPairing ?? "theme"}
          options={FONT_OPTIONS}
          onSelect={(fontPairing) => onVisualChange({ fontPairing })}
        />

        <OptionPills
          label="Text size"
          value={visual.textSize ?? "comfortable"}
          options={SIZE_OPTIONS}
          onSelect={(textSize) => onVisualChange({ textSize })}
        />

        <OptionPills
          label="Alignment"
          value={visual.alignment ?? "theme"}
          options={ALIGN_OPTIONS}
          onSelect={(alignment) => onVisualChange({ alignment })}
        />

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#ece2f6] bg-white px-3.5 py-3">
          <div>
            <p className="text-[0.82rem] font-semibold text-[#33203f]">Scene decorations</p>
            <p className="text-[0.7rem] text-[#8a7a9c]">
              Show theme artwork and texture behind the words
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={decoOn}
            onClick={() => onVisualChange({ decorationsEnabled: !decoOn })}
            className={cn(
              "min-h-9 rounded-full px-3.5 text-[0.74rem] font-semibold transition",
              decoOn ? "bg-[#6d3fa8] text-white" : "bg-[#f2ecfa] text-[#6b5580]",
            )}
          >
            {decoOn ? "On" : "Off"}
          </button>
        </div>

        {decoOn ? (
          <OptionPills
            label="Decoration density"
            value={visual.decorationDensity ?? "balanced"}
            options={DENSITY_OPTIONS}
            onSelect={(decorationDensity) => onVisualChange({ decorationDensity })}
          />
        ) : null}
      </section>

      <section className="space-y-4 border-t border-[#ece2f6] pt-5">
        <div>
          <h2 className="text-[0.86rem] font-semibold text-[#33203f]">
            Note &amp; Motion Flow
          </h2>
          <p className="text-[0.72rem] text-[#8a7a9c]">
            Shape how the personal note opens and how each scene enters.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#7c6892]">
            Personal note presentation
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {ENVELOPE_OPTIONS.map((opt) => {
              const active = (interaction.envelopeStyle ?? "wax-seal") === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onInteractionChange({ envelopeStyle: opt.value })}
                  aria-pressed={active}
                  className={cn(
                    "min-h-11 rounded-2xl border px-3 py-2.5 text-left transition active:scale-[0.98]",
                    active
                      ? "border-[#8a5bc4] bg-[#f7f1ff] text-[#4b2f6b]"
                      : "border-[#ece2f6] bg-white text-[#5b4a6d] hover:border-[#d5c3eb]",
                  )}
                >
                  <span className="block text-[0.78rem] font-semibold">{opt.label}</span>
                  <span className="block text-[0.68rem] text-[#8a7a9c]">{opt.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        <OptionPills
          label="Scene transition"
          value={interaction.transitionStyle ?? "theme"}
          options={TRANSITION_OPTIONS}
          onSelect={(transitionStyle) => onInteractionChange({ transitionStyle })}
        />

        <OptionPills
          label="Message reveal"
          value={interaction.revealStyle ?? "theme"}
          options={REVEAL_OPTIONS}
          onSelect={(revealStyle) => onInteractionChange({ revealStyle })}
        />

        <OptionPills
          label="Motion pace"
          value={interaction.motionPreset ?? "gentle"}
          options={MOTION_OPTIONS}
          onSelect={(motionPreset) => onInteractionChange({ motionPreset })}
        />
      </section>
    </div>
  );
}
