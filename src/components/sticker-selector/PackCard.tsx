"use client";

import { motion } from "framer-motion";
import type { StickerPack } from "@/sticker-packs/types";
import { StickerRenderer } from "@/components/presentation/StickerRenderer";
import { cn } from "@/lib/cn";

interface PackCardProps {
  pack: StickerPack;
  selected: boolean;
  onSelect: () => void;
}

export function PackCard({ pack, selected, onSelect }: PackCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[20px] border bg-white text-left transition active:scale-[0.99]",
        selected
          ? "border-[#8a5bc4] shadow-[0_16px_36px_-24px_rgba(109,63,168,0.9)]"
          : "border-[#e8ddf3] hover:border-[#cdb8e6]",
      )}
    >
      <div
        className="relative aspect-square w-full overflow-hidden"
        style={{ background: `linear-gradient(155deg, ${pack.accent}1f, #ffffff 72%)` }}
      >
        <div className="absolute inset-[10%]">
          <StickerRenderer packId={pack.id} state="apologizing" animate className="h-full w-full" />
        </div>
        {selected ? (
          <motion.span
            layoutId="pack-selected"
            className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-[#8a5bc4] text-white"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            <svg width="11" height="11" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
              <path d="M2 5.2 4 7.2 8 2.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.span>
        ) : null}
      </div>

      <div className="px-3 pb-3 pt-2">
        <h3 className="text-[0.85rem] font-semibold text-[#33203f]">{pack.name}</h3>
        <p className="mt-0.5 line-clamp-2 text-[0.68rem] leading-snug text-[#8a7a9c]">
          {pack.tagline}
        </p>
      </div>
    </button>
  );
}
