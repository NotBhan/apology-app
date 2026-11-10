"use client";

import { useState } from "react";
import type { BirthdayContent } from "@/experiences/birthday/schema";
import { BIRTHDAY_THEMES, getBirthdayTheme } from "@/experiences/birthday/themes";

/**
 * Birthday presentation.
 *
 * Independent of the apology engine: its own scenes, its own palette, its own
 * interaction. Nothing here imports the apology theme types or scene types, so
 * the two experiences cannot drift into being the same template.
 */
const SCENES = ["opening", "wish", "message", "gallery", "finale"] as const;
type Scene = (typeof SCENES)[number];

export function BirthdayLetter({ content }: { content: BirthdayContent }) {
  const theme = getBirthdayTheme(content.themeId) ?? BIRTHDAY_THEMES[0];
  const [scene, setScene] = useState<Scene>("opening");
  const [candleOut, setCandleOut] = useState(false);
  const index = SCENES.indexOf(scene);

  const next = () => setScene(SCENES[Math.min(index + 1, SCENES.length - 1)]);

  return (
    <div
      className="flex min-h-svh flex-col items-center justify-center px-6 py-10 text-center"
      style={{ background: theme.palette.background, color: theme.palette.text }}
    >
      <div className="w-full max-w-[620px]">
        {scene === "opening" ? (
          <div className="space-y-5">
            <p className="text-[0.68rem] uppercase tracking-[0.24em]" style={{ color: theme.palette.accent }}>
              a birthday
            </p>
            <h1 className="text-[clamp(2rem,7vw,3.2rem)] leading-tight">
              {content.headline}
            </h1>
            <p className="text-sm opacity-80">For {content.recipientName}</p>
            <button
              type="button"
              onClick={next}
              className="rounded-full px-6 py-3 text-sm font-semibold"
              style={{ background: theme.palette.primary, color: theme.palette.background }}
            >
              Open it
            </button>
          </div>
        ) : null}

        {scene === "wish" ? (
          <div className="space-y-6">
            <p className="text-[0.68rem] uppercase tracking-[0.24em]" style={{ color: theme.palette.accent }}>
              make a wish
            </p>
            <p className="text-lg">{content.age ? `${content.age} looks good on you.` : "Another year, well earned."}</p>
            <button
              type="button"
              onClick={() => setCandleOut(true)}
              className="rounded-full px-6 py-3 text-sm font-semibold"
              style={{ background: candleOut ? theme.palette.surface : theme.palette.primary, color: candleOut ? theme.palette.accent : theme.palette.background }}
            >
              {candleOut ? "Wish made" : "Blow out the candle"}
            </button>
            <button type="button" onClick={next} className="block w-full text-xs underline opacity-70">
              Continue
            </button>
          </div>
        ) : null}

        {scene === "message" ? (
          <div className="space-y-5">
            <p className="text-[0.68rem] uppercase tracking-[0.24em]" style={{ color: theme.palette.accent }}>
              from {content.senderName}
            </p>
            <p className="whitespace-pre-line text-[clamp(1.1rem,3.4vw,1.5rem)] leading-relaxed">
              {content.message}
            </p>
            <button type="button" onClick={next} className="text-sm underline opacity-80">
              Continue
            </button>
          </div>
        ) : null}

        {scene === "gallery" ? (
          <div className="space-y-5">
            <h2 className="text-2xl">Some moments</h2>
            {content.photos.length > 0 ? (
              <ul className="grid grid-cols-2 gap-3">
                {content.photos.map((photo) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <li key={photo}>
                    <img src={photo} alt="" className="h-40 w-full rounded-xl object-cover" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm opacity-70">No photos this time — the words are the gift.</p>
            )}
            <button type="button" onClick={next} className="text-sm underline opacity-80">
              One last thing
            </button>
          </div>
        ) : null}

        {scene === "finale" ? (
          <div className="space-y-5">
            <h2 className="text-[clamp(1.8rem,6vw,2.6rem)]">{content.wish ?? "Happy birthday."}</h2>
            <p className="text-sm opacity-80">— {content.senderName}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
