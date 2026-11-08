"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ApologyMessages, Language, SituationKey } from "@/types/apology";
import { FIELD_LIMITS, pickStarters, type StarterField } from "@/content/message-starters";
import { Counter, TextArea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

interface MessagesStepProps {
  messages: ApologyMessages;
  language: Language;
  situation: SituationKey;
  recipientName: string;
  onChange: (patch: { messages?: Partial<ApologyMessages>; language?: Language }) => void;
  onNext: () => void;
  onBack: () => void;
}

const FIELDS: {
  key: StarterField;
  label: string;
  helper: string;
  rows: number;
}[] = [
  {
    key: "message1",
    label: "Acknowledge what happened",
    helper: "Name it plainly. No excuses yet.",
    rows: 4,
  },
  {
    key: "message2",
    label: "Say what they mean to you",
    helper: "This is the part people remember.",
    rows: 4,
  },
  {
    key: "message3",
    label: "Say what you'll do differently",
    helper: "A small, real change beats a big promise.",
    rows: 4,
  },
  {
    key: "personalNote",
    label: "A personal note",
    helper: "Optional. This becomes the sealed letter.",
    rows: 6,
  },
];

export function MessagesStep({
  messages,
  language,
  situation,
  recipientName,
  onChange,
  onNext,
  onBack,
}: MessagesStepProps) {
  const [activeField, setActiveField] = useState<StarterField | null>(null);

  const ready =
    messages.message1.trim().length > 0 &&
    messages.message2.trim().length > 0 &&
    messages.message3.trim().length > 0;

  function append(field: StarterField, text: string) {
    const current = messages[field];
    const next = current.trim().length === 0 ? text : `${current.trim()} ${text}`;
    onChange({ messages: { [field]: next.slice(0, FIELD_LIMITS[field]) } });
    setActiveField(null);
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[#a394b4]">step three</p>
        <h1
          className="text-[clamp(1.6rem,6vw,2rem)] leading-tight text-[#33203f]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Say it in your words
        </h1>
        <p className="text-[0.86rem] leading-relaxed text-[#7c6892]">
          Three short messages for {recipientName || "them"}. Starters are seeds, not scripts —
          rewrite anything.
        </p>
      </header>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#ece2f6] bg-white px-3.5 py-2.5">
        <span className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[#7c6892]">
          Starter language
        </span>
        <div className="flex rounded-full bg-[#f4eefb] p-0.5">
          {(["en", "hinglish"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onChange({ language: option })}
              aria-pressed={language === option}
              className={cn(
                "rounded-full px-3 py-1 text-[0.72rem] font-semibold transition",
                language === option ? "bg-white text-[#4b2f6b] shadow-sm" : "text-[#8a7a9c]",
              )}
            >
              {option === "en" ? "English" : "Hinglish"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        {FIELDS.map((field) => {
          const value = messages[field.key];
          const starters = pickStarters(field.key, situation, language, 3);
          const open = activeField === field.key;

          return (
            <section key={field.key} className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <label
                  htmlFor={field.key}
                  className="text-[0.82rem] font-semibold text-[#3d2a50]"
                >
                  {field.label}
                </label>
                <Counter value={value.length} max={FIELD_LIMITS[field.key]} />
              </div>
              <p className="text-[0.7rem] text-[#8a7a9c]">{field.helper}</p>

              <TextArea
                id={field.key}
                value={value}
                rows={field.rows}
                maxLength={FIELD_LIMITS[field.key]}
                onChange={(event) =>
                  onChange({ messages: { [field.key]: event.target.value } })
                }
                placeholder={field.key === "personalNote" ? "Only they will read this…" : "Start typing…"}
              />

              {starters.length > 0 ? (
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveField(open ? null : field.key)}
                    aria-expanded={open}
                    className="text-[0.7rem] font-semibold text-[#7a4fb0] underline underline-offset-4"
                  >
                    {open ? "Hide starters" : "Need a starting point?"}
                  </button>

                  <AnimatePresence initial={false}>
                    {open ? (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-1.5 pt-1">
                          {starters.map((starter) => (
                            <button
                              key={starter.id}
                              type="button"
                              onClick={() => append(field.key, starter.text)}
                              className="w-full rounded-xl border border-[#ece2f6] bg-[#fbf8ff] px-3 py-2 text-left text-[0.76rem] leading-relaxed text-[#5b4a6d] transition hover:border-[#cdb8e6] hover:bg-white"
                            >
                              {starter.text}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={onNext} disabled={!ready} className="flex-[1.4]">
          Continue
        </Button>
      </div>

      {!ready ? (
        <p className="text-center text-[0.7rem] text-[#a394b4]">
          The first three messages are needed to build the experience.
        </p>
      ) : null}
    </div>
  );
}
