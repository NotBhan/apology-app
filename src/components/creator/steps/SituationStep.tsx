"use client";

import { Button } from "@/components/ui/Button";
import { SITUATIONS } from "@/content/situations";
import type { SituationKey } from "@/types/apology";
import { cn } from "@/lib/cn";

interface SituationStepProps {
  situation: SituationKey;
  situationCustom: string;
  recipientName: string;
  onChange: (patch: { situation?: SituationKey; situationCustom?: string }) => void;
  onNext: () => void;
  onBack: () => void;
}

export function SituationStep({
  situation,
  situationCustom,
  recipientName,
  onChange,
  onNext,
  onBack,
}: SituationStepProps) {
  const ready = situation !== "other" || situationCustom.trim().length > 2;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[#a394b4]">step two</p>
        <h1
          className="text-[clamp(1.6rem,6vw,2rem)] leading-tight text-[#203f33]"
          style={{ fontFamily: "var(--font-display)", color: "#33203f" }}
        >
          What happened?
        </h1>
        <p className="text-[0.86rem] leading-relaxed text-[#7c6892]">
          This only shapes the wording suggestions for {recipientName || "them"}. Nothing is
          assumed about how they feel.
        </p>
      </header>

      <div role="radiogroup" aria-label="What happened" className="grid gap-2.5">
        {SITUATIONS.map((option) => {
          // "Anything else" only reads as chosen once it has an explanation.
          const active =
            situation === option.key &&
            (option.key !== "other" || situationCustom.trim().length > 0);
          return (
            <button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange({ situation: option.key })}
              className={cn(
                "flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition active:scale-[0.99]",
                active
                  ? "border-[#8a5bc4] bg-[#f7f1ff]"
                  : "border-[#ece2f6] bg-white hover:border-[#d9c8ec]",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full border",
                  active ? "border-[#6d3fa8]" : "border-[#d8c9e8]",
                )}
              >
                {active ? <span className="h-2 w-2 rounded-full bg-[#6d3fa8]" /> : null}
              </span>
              <span>
                <span className="block text-[0.9rem] font-semibold text-[#33203f]">
                  {option.label}
                </span>
                <span className="block text-[0.75rem] text-[#8a7a9c]">{option.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      {situation === "other" ? (
        <div className="space-y-1.5">
          <label
            htmlFor="custom-situation"
            className="block text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#7c6892]"
          >
            In your words
          </label>
          <input
            id="custom-situation"
            value={situationCustom}
            onChange={(event) => onChange({ situationCustom: event.target.value })}
            maxLength={120}
            placeholder="I let them down when they needed me"
            className="w-full rounded-2xl border border-[#e6dcf1] bg-white px-4 py-3 text-[0.92rem] text-[#33203f] outline-none focus:border-[#b18ade] focus:ring-4 focus:ring-[#e7dcf7]"
          />
        </div>
      ) : null}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={onNext} disabled={!ready} className="flex-[1.4]">
          Continue
        </Button>
      </div>
    </div>
  );
}
