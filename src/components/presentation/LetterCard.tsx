"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ThemeAssets } from "@/types/theme";
import { cn } from "@/lib/cn";

interface LetterCardProps {
  recipientName: string;
  senderName: string;
  body: string;
  variant?: ThemeAssets["letter"];
  signature?: boolean;
  className?: string;
  revealMode?: "ink" | "fade" | "typewriter";
  animate?: boolean;
}

/**
 * The paper itself. Variants change ruling, edges and shadow — the *content*
 * layout stays legible at 360px.
 */
export function LetterCard({
  recipientName,
  senderName,
  body,
  variant = "plain",
  signature = true,
  className,
  revealMode = "fade",
  animate = true,
}: LetterCardProps) {
  const reduce = useReducedMotion();
  const still = reduce || !animate;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-[18px] px-5 pb-6 pt-7 shadow-[0_18px_50px_-24px_rgba(30,16,40,0.55)] sm:px-7 sm:pb-8 sm:pt-9",
        className,
      )}
      style={{
        background: "var(--t-surface)",
        color: "var(--t-text)",
        border: "1px solid var(--t-border)",
      }}
    >
      {variant === "ruled" ? <Ruled /> : null}
      {variant === "deckle" ? <Deckle /> : null}
      {variant === "note" ? <NoteEdges /> : null}

      <div className="relative">
        <p
          className="mb-4 text-sm sm:text-base"
          style={{
            fontFamily: "var(--t-font-deco)",
            color: "var(--t-primary)",
            fontSize: "1.15rem",
          }}
        >
          {recipientName || "you"},
        </p>

        <motion.div
          initial={still ? false : { opacity: 0 }}
          animate={still ? undefined : { opacity: 1 }}
          transition={{ duration: revealMode === "typewriter" ? 0.2 : 0.9 }}
          className="whitespace-pre-wrap text-[0.95rem] leading-[1.75] sm:text-base"
          style={{
            fontFamily:
              revealMode === "typewriter" ? "var(--t-font-deco)" : "var(--t-font-body)",
            fontSize: revealMode === "typewriter" ? "1.15rem" : undefined,
          }}
        >
          {body}
        </motion.div>

        {signature ? (
          <motion.div
            initial={still ? false : { opacity: 0, y: 8 }}
            animate={still ? undefined : { opacity: 1, y: 0 }}
            transition={{ delay: still ? 0 : 0.7, duration: 0.7 }}
            className="mt-7 text-right"
          >
            <span
              className="block text-[0.7rem] uppercase tracking-[0.18em]"
              style={{ color: "var(--t-muted)" }}
            >
              with all of me
            </span>
            <span
              className="block text-2xl"
              style={{ fontFamily: "var(--t-font-deco)", color: "var(--t-primary)" }}
            >
              {senderName || "me"}
            </span>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

function Ruled() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 opacity-[0.5]"
      style={{
        backgroundImage:
          "repeating-linear-gradient(to bottom, transparent 0 25px, color-mix(in oklab, var(--t-border) 70%, transparent) 25px 26px)",
        maskImage: "linear-gradient(to bottom, transparent, black 8%, black 92%, transparent)",
      }}
    />
  );
}

function Deckle() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        boxShadow:
          "inset 0 0 0 1px color-mix(in oklab, var(--t-border) 80%, transparent), inset 0 0 42px rgba(120, 90, 60, 0.07)",
        borderRadius: "18px",
      }}
    />
  );
}

function NoteEdges() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in oklab, var(--t-secondary) 16%, transparent), transparent 42%)",
      }}
    />
  );
}
