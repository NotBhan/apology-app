"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { ThemeAssets } from "@/types/theme";
import { LetterCard } from "./LetterCard";
import { paginateLetter } from "./paginateLetter";
import { cn } from "@/lib/cn";

type Stage = "sealed" | "cracking" | "opening" | "rising" | "unfolded";

interface EnvelopeAnimationProps {
  recipientName: string;
  senderName: string;
  body: string;
  variant?: ThemeAssets["envelope"];
  letterVariant?: ThemeAssets["letter"];
  ctaLabel?: string;
  onOpened?: () => void;
  className?: string;
}

const ENVELOPE_PAINT: Record<NonNullable<ThemeAssets["envelope"]>, { paper: string; flap: string; seal: string; sealInk: string }> = {
  classic: { paper: "#f4e7d3", flap: "#e8d6bd", seal: "#8b2f3a", sealInk: "#f6e6e6" },
  kraft: { paper: "#e2c9a4", flap: "#d3b68c", seal: "#7a4a2b", sealInk: "#f7ece0" },
  blush: { paper: "#fbe4ee", flap: "#f4cfdf", seal: "#c04b74", sealInk: "#ffeef5" },
  midnight: { paper: "#232a52", flap: "#1b2144", seal: "#8b7bd8", sealInk: "#eeeaff" },
  ivory: { paper: "#fbf7f0", flap: "#f2ebdf", seal: "#b08d3f", sealInk: "#fdf7e8" },
};

/**
 * Real multi-stage envelope: seal cracks, flap swings on its hinge, the letter
 * rises out of the pocket, then unfolds into a readable card.
 */
export function EnvelopeAnimation({
  recipientName,
  senderName,
  body,
  variant = "classic",
  letterVariant = "plain",
  ctaLabel = "Tap the seal",
  onOpened,
  className,
}: EnvelopeAnimationProps) {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState<Stage>("sealed");
  const pages = useMemo(() => paginateLetter(body), [body]);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [body]);

  /**
   * The letter card clips long copy, so the note is paginated. `onOpened` — the
   * signal that lets the scene's Continue button enable — waits until the last
   * page has actually been read.
   */
  const singlePage = pages.length <= 1;
  const paint = ENVELOPE_PAINT[variant] ?? ENVELOPE_PAINT.classic;

  const open = useCallback(() => {
    if (stage !== "sealed") return;
    if (reduce) {
      setStage("unfolded");
      if (pages.length <= 1) onOpened?.();
      return;
    }
    setStage("cracking");
    window.setTimeout(() => setStage("opening"), 380);
    window.setTimeout(() => setStage("rising"), 1080);
    window.setTimeout(() => {
      setStage("unfolded");
      if (pages.length <= 1) onOpened?.();
    }, 1750);
  }, [stage, reduce, onOpened, pages.length]);

  const revealed = stage === "unfolded";
  const flapOpen = stage === "opening" || stage === "rising" || revealed;
  const letterRising = stage === "rising" || revealed;

  return (
    <div className={cn("relative flex w-full flex-col items-center", className)}>
      <motion.div
        className="relative"
        style={{
          // Height derived from the same expression as the width so the pocket,
          // flap and seal stay in proportion inside a phone-shaped preview frame.
          width: "min(86vw, 340px)",
          height: "calc(min(86vw, 340px) / 1.5)",
        }}
        animate={{ opacity: revealed ? 0.4 : 1, scale: revealed ? 0.96 : 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Back panel */}
        <div
          className="absolute inset-0 rounded-[10px] shadow-[0_26px_60px_-30px_rgba(0,0,0,0.6)]"
          style={{ background: paint.paper }}
        />

        {/* Letter inside the pocket */}
        <motion.div
          className="absolute left-[6%] right-[6%] origin-bottom overflow-hidden rounded-[6px]"
          style={{
            top: "10%",
            height: "86%",
            background: "var(--t-surface)",
            border: "1px solid var(--t-border)",
            zIndex: letterRising ? 30 : 5,
          }}
          initial={false}
          animate={{
            y: letterRising ? "-22%" : "6%",
            scale: letterRising ? 1 : 0.94,
            rotateX: letterRising ? 0 : 12,
          }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex h-full flex-col gap-2 p-4">
            <span
              className="text-[11px] uppercase tracking-[0.2em]"
              style={{ color: "var(--t-muted)" }}
            >
              for {recipientName || "you"}
            </span>
            <div
              className="space-y-1.5 opacity-70"
              aria-hidden
              style={{ color: "var(--t-text)" }}
            >
              <span className="block h-[3px] w-[78%] rounded-full bg-current opacity-20" />
              <span className="block h-[3px] w-[64%] rounded-full bg-current opacity-20" />
              <span className="block h-[3px] w-[71%] rounded-full bg-current opacity-20" />
            </div>
          </div>
        </motion.div>

        {/* Pocket front with V fold */}
        <div className="absolute inset-0 z-20 overflow-hidden rounded-[10px]">
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, ${paint.paper} 0%, ${paint.flap} 100%)`,
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 top-[18%]"
            style={{
              background: `linear-gradient(160deg, ${paint.flap}, ${paint.paper})`,
              clipPath: "polygon(0 100%, 50% 26%, 100% 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(200deg, ${paint.flap} 0%, transparent 45%)`,
              clipPath: "polygon(0 0, 46% 46%, 0 100%)",
              opacity: 0.55,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(340deg, ${paint.flap} 0%, transparent 45%)`,
              clipPath: "polygon(100% 0, 54% 46%, 100% 100%)",
              opacity: 0.45,
            }}
          />
        </div>

        {/* Flap on its hinge */}
        <motion.div
          className="absolute inset-x-0 top-0 origin-top"
          style={{ height: "56%", zIndex: flapOpen ? 10 : 25, transformStyle: "preserve-3d" }}
          initial={false}
          animate={{ rotateX: flapOpen ? -172 : 0 }}
          transition={{ duration: 0.72, ease: [0.34, 1.2, 0.4, 1] }}
        >
          <div
            className="h-full w-full"
            style={{
              background: `linear-gradient(180deg, ${paint.flap}, ${paint.paper})`,
              clipPath: "polygon(0 0, 100% 0, 50% 100%)",
              filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.12))",
            }}
          />
        </motion.div>

        {/* Wax seal */}
        {!revealed ? (
          <motion.button
            type="button"
            onClick={open}
            disabled={stage !== "sealed"}
            aria-label={ctaLabel}
            className="absolute left-1/2 z-40 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full text-[11px] font-semibold uppercase tracking-[0.1em]"
            style={{
              top: "46%",
              background: `radial-gradient(circle at 35% 30%, ${paint.seal}, ${paint.seal}dd 60%, ${paint.seal}bb)`,
              color: paint.sealInk,
              boxShadow: "0 6px 16px rgba(0,0,0,0.28), inset 0 -2px 6px rgba(0,0,0,0.25)",
              cursor: stage === "sealed" ? "pointer" : "default",
            }}
            initial={false}
            animate={
              stage === "cracking"
                ? { scale: [1, 1.16, 0.9, 0], rotate: [0, -8, 8, 0], opacity: [1, 1, 1, 0] }
                : { scale: 1, rotate: 0, opacity: 1 }
            }
            transition={{ duration: 0.42, ease: "easeInOut" }}
            whileHover={stage === "sealed" ? { scale: 1.06 } : undefined}
            whileTap={stage === "sealed" ? { scale: 0.94 } : undefined}
          >
            <span aria-hidden>{stage === "sealed" ? "open" : ""}</span>
          </motion.button>
        ) : null}
      </motion.div>

      <div className="mt-5 w-[min(92vw,380px)]">
        {revealed ? (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 22 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ perspective: 1200 }}
          >
            <LetterCard
              recipientName={recipientName}
              senderName={senderName}
              body={pages[page] ?? ""}
              variant={letterVariant}
              className="origin-top"
            />

            {pages.length > 1 ? (
              <div className="mt-3 flex items-center justify-between gap-3 px-1">
                <span
                  className="text-[0.64rem] uppercase tracking-[0.14em]"
                  style={{ color: "var(--t-muted)" }}
                  aria-live="polite"
                >
                  page {page + 1} of {pages.length}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (singlePage || page >= pages.length - 1) return;
                    const next = page + 1;
                    setPage(next);
                    if (next === pages.length - 1) onOpened?.();
                  }}
                  disabled={page >= pages.length - 1}
                  className="rounded-full px-4 py-1.5 text-[0.74rem] font-semibold text-white disabled:opacity-50"
                  style={{ background: "var(--t-accent, #6d3fa8)" }}
                >
                  {page >= pages.length - 1 ? "End of letter" : "Next page"}
                </button>
              </div>
            ) : null}
          </motion.div>
        ) : (
          <p
            className="text-center text-xs tracking-wide"
            style={{ color: "var(--t-muted)" }}
            aria-live="polite"
          >
            {stage === "sealed" ? ctaLabel : "opening…"}
          </p>
        )}
      </div>
    </div>
  );
}
