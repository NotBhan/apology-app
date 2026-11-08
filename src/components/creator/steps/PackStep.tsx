"use client";

import type { StickerPackId } from "@/types/sticker";
import { STICKER_PACK_LIST, getStickerPack } from "@/sticker-packs/registry";
import { PackCard } from "@/components/sticker-selector/PackCard";
import { StickerRenderer } from "@/components/presentation/StickerRenderer";
import { Button } from "@/components/ui/Button";

interface PackStepProps {
  packId: StickerPackId;
  suggestedPackId: StickerPackId;
  onChange: (packId: StickerPackId) => void;
  onNext: () => void;
  onBack: () => void;
}

const PREVIEW_STATES = ["apologizing", "heart", "celebrate"] as const;
const STATE_LABELS: Record<(typeof PREVIEW_STATES)[number], string> = {
  apologizing: "Sorry",
  heart: "Sincere",
  celebrate: "Hopeful",
};

export function PackStep({ packId, suggestedPackId, onChange, onNext, onBack }: PackStepProps) {
  const pack = getStickerPack(packId);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[#a394b4]">step five</p>
        <h1
          className="text-[clamp(1.6rem,6vw,2rem)] leading-tight text-[#33203f]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Who&apos;s telling it?
        </h1>
        <p className="text-[0.86rem] leading-relaxed text-[#7c6892]">
          Characters are independent of the theme — mix any pack with any world. Your words stay
          exactly the same.
        </p>
      </header>

      <div className="rounded-3xl border border-[#ece2f6] bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#7c6892]">
            {pack.characterName}
          </p>
          {suggestedPackId === packId ? (
            <span className="rounded-full bg-[#f2ecfa] px-2 py-0.5 text-[0.62rem] font-semibold text-[#5b3f7d]">
              suggested for this theme
            </span>
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {PREVIEW_STATES.map((state) => (
            <div key={state} className="flex flex-col items-center gap-1">
              <div className="aspect-square w-full">
                <StickerRenderer packId={packId} state={state} animate />
              </div>
              <span className="text-[0.62rem] uppercase tracking-[0.1em] text-[#a394b4]">
                {STATE_LABELS[state]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {STICKER_PACK_LIST.map((item) => (
          <PackCard
            key={item.id}
            pack={item}
            selected={item.id === packId}
            onSelect={() => onChange(item.id)}
          />
        ))}
      </div>

      <p className="text-[0.68rem] leading-relaxed text-[#a394b4]">
        All character art here is original to this project. No third-party sticker artwork is
        bundled.
      </p>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={onNext} className="flex-[1.4]">
          Continue
        </Button>
      </div>
    </div>
  );
}
