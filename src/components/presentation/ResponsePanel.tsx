"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { EmotionOption, ResponseOption } from "@/types/scene";
import type { CharacterState } from "@/types/sticker";
import { RESPONSE_COPY } from "@/lib/api/responses";
import { cn } from "@/lib/cn";

interface ResponsePanelProps {
  senderName: string;
  onReplay: () => void;
  onCharacterState: (state: CharacterState) => void;
  /** Lets the scene render a restrained celebration for one answer only. */
  onChoiceChange?: (choice: ResponseOption | null) => void;
  onRestart?: () => void;
  className?: string;
}

const OPTIONS: { key: ResponseOption; label: string; hint: string }[] = [
  { key: "forgive", label: "I forgive you", hint: "I'm ready to move on" },
  { key: "time", label: "I need some time", hint: "Not yet, but not never" },
  { key: "talk", label: "Let's talk properly", hint: "In person, when we're calm" },
  { key: "appreciate", label: "I appreciate this", hint: "Thank you for saying it" },
];

const EMOTIONS: { key: EmotionOption; label: string }[] = [
  { key: "upset", label: "I'm really upset" },
  { key: "getting-there", label: "I'm getting there" },
  { key: "okay", label: "I'm okay" },
];

/**
 * Optional, non-coercive response. Nothing is transmitted: the recipient's
 * answer never leaves their device unless they copy it themselves.
 */
export function ResponsePanel({
  senderName,
  onReplay,
  onCharacterState,
  onChoiceChange,
  className,
}: ResponsePanelProps) {
  const reduce = useReducedMotion();
  const [choice, setChoice] = useState<ResponseOption | null>(null);
  const [emotion, setEmotion] = useState<EmotionOption | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = choice ? RESPONSE_COPY[choice] : null;

  function choose(option: ResponseOption) {
    setChoice(option);
    onCharacterState(RESPONSE_COPY[option].characterState);
    onChoiceChange?.(option);
  }

  const shareText = choice
    ? `I opened your apology. My answer for now: ${OPTIONS.find((o) => o.key === choice)?.label}.`
    : "";

  async function copyShareText() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={cn("w-full", className)}>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={reduce ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        {!choice ? (
          <>
            <div className="mb-5 space-y-3">
              <p
                className="text-[0.68rem] uppercase tracking-[0.22em]"
                style={{ color: "var(--t-muted)" }}
              >
                optional
              </p>
              <p className="text-[0.8rem] leading-snug" style={{ color: "var(--t-text)" }}>
                Optional. This only changes the little character — it is not sent to {senderName}.
              </p>
              <div className="flex flex-wrap gap-2">
                {EMOTIONS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    aria-pressed={emotion === item.key}
                    onClick={() => {
                      setEmotion(item.key);
                      onCharacterState(
                        item.key === "upset" ? "sad" : item.key === "okay" ? "happy" : "hopeful",
                      );
                    }}
                    className="rounded-full border px-3 py-1.5 text-xs transition active:scale-95"
                    style={{
                      borderColor: emotion === item.key ? "var(--t-primary)" : "var(--t-border)",
                      background:
                        emotion === item.key ? "color-mix(in oklab, var(--t-primary) 12%, transparent)" : "transparent",
                      color: "var(--t-text)",
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2.5">
              {OPTIONS.map((option, index) => (
                <motion.button
                  key={option.key}
                  type="button"
                  onClick={() => choose(option.key)}
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={reduce ? undefined : { opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * index, duration: 0.4 }}
                  className="group flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition active:scale-[0.985]"
                  style={{
                    borderColor: "var(--t-border)",
                    background: "color-mix(in oklab, var(--t-surface) 88%, transparent)",
                  }}
                >
                  <span>
                    <span className="block text-sm font-semibold" style={{ color: "var(--t-text)" }}>
                      {option.label}
                    </span>
                    <span className="block text-[0.72rem]" style={{ color: "var(--t-muted)" }}>
                      {option.hint}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className="text-lg transition-transform group-hover:translate-x-0.5"
                    style={{ color: "var(--t-primary)" }}
                  >
                    →
                  </span>
                </motion.button>
              ))}
            </div>

            <p className="mt-4 text-center text-[0.68rem]" style={{ color: "var(--t-muted)" }}>
              You can close this any time. No answer is required.
            </p>
          </>
        ) : (
          <div className="space-y-4">
            <motion.div
              initial={reduce ? false : { opacity: 0, scale: 0.96 }}
              animate={reduce ? undefined : { opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl border p-5"
              style={{
                borderColor: "var(--t-border)",
                background: "color-mix(in oklab, var(--t-surface) 92%, transparent)",
              }}
            >
              <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>
                {copy?.title}
              </p>
              <p className="mt-2 text-[0.85rem] leading-relaxed" style={{ color: "var(--t-muted)" }}>
                {copy?.body}
              </p>
            </motion.div>

            <div className="rounded-2xl border p-4" style={{ borderColor: "var(--t-border)" }}>
              <label className="flex cursor-pointer items-start gap-2.5 text-[0.78rem]" style={{ color: "var(--t-text)" }}>
                <input
                  type="checkbox"
                  checked={showShare}
                  onChange={(event) => setShowShare(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-current"
                />
                <span>
                  Let me copy a short reply I can send myself
                  <span className="block text-[0.68rem]" style={{ color: "var(--t-muted)" }}>
                    Nothing is shared automatically. {senderName} will not see your choice here.
                  </span>
                </span>
              </label>

              {showShare ? (
                <div className="mt-3 space-y-2">
                  <p
                    className="rounded-lg px-3 py-2 text-[0.78rem]"
                    style={{
                      background: "color-mix(in oklab, var(--t-primary) 8%, transparent)",
                      color: "var(--t-text)",
                    }}
                  >
                    {shareText}
                  </p>
                  <button
                    type="button"
                    onClick={copyShareText}
                    className="rounded-full border px-3 py-1.5 text-[0.72rem] font-semibold transition active:scale-95"
                    style={{ borderColor: "var(--t-primary)", color: "var(--t-primary)" }}
                  >
                    {copied ? "Copied" : "Copy reply"}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setChoice(null);
                  setShowShare(false);
                  onCharacterState("hopeful");
                  onChoiceChange?.(null);
                }}
                className="text-[0.75rem] underline underline-offset-4"
                style={{ color: "var(--t-muted)" }}
              >
                Change my answer
              </button>
              <button
                type="button"
                onClick={onReplay}
                className="rounded-full px-4 py-2 text-[0.75rem] font-semibold transition active:scale-95"
                style={{ background: "var(--t-primary)", color: "var(--t-surface)" }}
              >
                Watch it again
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
