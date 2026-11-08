"use client";

import type { CSSProperties } from "react";
import type { ThemeSkinProps } from "@/themes/types";

type Vars = CSSProperties & Record<`--${string}`, string | number>;
const cv = (d: CSSProperties & Record<`--${string}`, string | number>): Vars => d as Vars;

const FIBRE = [
  "repeating-linear-gradient(0deg, rgba(90, 70, 50, 0.05) 0 1px, transparent 1px 4px)",
  "repeating-linear-gradient(90deg, rgba(90, 70, 50, 0.033) 0 1px, transparent 1px 7px)",
  "repeating-linear-gradient(46deg, rgba(156, 124, 82, 0.045) 0 1px, transparent 1px 11px)",
].join(", ");

const DECKLE_TOP = "M0 0H600V22c-18 9-33-5-51 2s-33 11-51 3-33-9-51-2-33 10-51 3-33-9-51-2-33 10-51 3-33-9-51-2-33 9-51 3-33-8-51-2-33 9-51 3-33-7-51-1-33 8-51 2S18 26 0 21Z";
const DECKLE_BOTTOM = "M0 52H600V30c-18-9-33 5-51-2s-33-11-51-3-33 9-51 2-33-10-51-3-33 9-51 2-33-10-51-3-33 9-51 2-33-9-51-3-33 8-51 2-33-9-51-3-33 7-51 1-33-8-51-2S18.5 26 0 31Z";

const RULES = "repeating-linear-gradient(180deg, transparent 0 27px, rgba(90, 70, 50, 0.17) 27px 28px)";
const FADE = "linear-gradient(180deg, transparent, #000 12%, #000 86%, transparent)";

const BLOOMS = [
  { left: "10%", top: "14%", size: 250, opacity: 0.6 },
  { left: "72%", top: "56%", size: 210, opacity: 0.45 },
  { left: "34%", top: "70%", size: 160, opacity: 0.35 },
];

const POSTMARKS = [
  { left: "64%", top: "12%", size: 108, rotate: -14 },
  { left: "12%", top: "62%", size: 84, rotate: 9 },
];

const STAMPS = [
  { left: "18%", top: "20%", rotate: -6 },
  { left: "73%", top: "34%", rotate: 8 },
  { left: "46%", top: "72%", rotate: -3 },
];

function Fibre() {
  return (
    <>
      <div className="absolute inset-0" style={{ backgroundImage: FIBRE, opacity: 0.9 }} />
      <div className="absolute inset-0" style={{ backgroundColor: "rgba(255, 250, 238, 0.22)", opacity: 0.7 }} />
    </>
  );
}

function InkBloom({ left, top, size, opacity, paused }: { left: string; top: string; size: number; opacity: number; paused: boolean }) {
  const ink = {
    left, top, width: size, height: size, borderRadius: "58% 42% 52% 48% / 46% 54% 46% 54%", filter: "blur(9px)", opacity,
    background: "radial-gradient(circle at 42% 44%, rgba(90, 70, 50, 0.22), transparent 62%), radial-gradient(circle at 62% 60%, rgba(156, 124, 82, 0.2), transparent 58%)",
  };
  const anim = paused ? { animation: "none" } : cv({ animation: "cc-breathe 19s ease-in-out infinite", transformOrigin: "center" });
  return <div className="absolute" style={{ ...ink, ...anim }} />;
}

function Deckle({ edge }: { edge: "top" | "bottom" }) {
  return (
    <svg viewBox="0 0 600 52" preserveAspectRatio="none" className={`absolute inset-x-0 h-[52px] w-full ${edge === "top" ? "top-0" : "bottom-0"}`}>
      <path d={edge === "top" ? DECKLE_TOP : DECKLE_BOTTOM} fill="var(--t-surface)" opacity="0.92" />
    </svg>
  );
}

function CornerFold({ corner }: { corner: "tl" | "br" | "tr" }) {
  const place = corner === "br" ? "bottom-0 right-0" : corner === "tr" ? "right-0 top-0" : "left-0 top-0";
  const shape =
    corner === "br" ? "polygon(100% 0, 100% 100%, 0 100%)" : corner === "tr" ? "polygon(100% 0, 100% 100%, 0 0)" : "polygon(0 0, 100% 0, 0 100%)";
  return (
    <div className={`absolute ${place} h-[104px] w-[104px]`} style={{ clipPath: shape, background: "linear-gradient(135deg, rgba(255, 251, 242, 0.95), rgba(226, 213, 187, 0.85))", opacity: 0.85 }} />
  );
}

function WaxSeal({ size, paused, subtle }: { size: number; paused: boolean; subtle?: boolean }) {
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: size, height: size, opacity: subtle ? 0.75 : 1 }}>
      <div className="absolute inset-0" style={paused ? { animation: "none" } : cv({ animation: "cc-breathe 15s ease-in-out infinite", transformOrigin: "center" })}>
        <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 34% 28%, #b7504a 0%, var(--t-accent) 54%, #5b1c1c 100%)", boxShadow: "inset 0 -7px 14px rgba(0, 0, 0, 0.38), 0 14px 26px -16px rgba(48, 36, 25, 0.85)" }} />
        <div className="absolute inset-[11%] rounded-full border border-dashed" style={{ borderColor: "rgba(255, 238, 214, 0.42)" }} />
        <div className="absolute inset-[38%] rounded-full" style={{ background: "radial-gradient(circle at 40% 34%, rgba(255, 238, 214, 0.6), rgba(255, 238, 214, 0.04))" }} />
      </div>
    </div>
  );
}

function Envelope({ narrow, paused }: { narrow?: boolean; paused: boolean }) {
  const width = narrow ? "min(56vw, 300px)" : "min(80vw, 470px)";
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width, aspectRatio: "1.52 / 1" }}>
      <div className="absolute inset-0" style={{ background: "linear-gradient(176deg, var(--t-surface) 0%, var(--t-surface-alt) 100%)", boxShadow: "0 30px 52px -36px rgba(48, 36, 25, 0.9)" }} />
      <div className="absolute inset-x-0 top-0 h-[58%]" style={{ background: "linear-gradient(180deg, rgba(255, 251, 242, 0.9), rgba(239, 228, 207, 0.85))", clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
      <svg viewBox="0 0 300 200" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" fill="none">
        <path d="M0 200L112 104M300 200L188 104" stroke="rgba(90, 70, 50, 0.24)" strokeWidth="1.4" />
        <path d="M0 0L150 118 300 0" stroke="rgba(90, 70, 50, 0.16)" strokeWidth="1.2" />
      </svg>
      <div style={{ position: "absolute", inset: 0 }}>
        <WaxSeal size={narrow ? 58 : 76} paused={paused} />
      </div>
    </div>
  );
}

function RuledSheet({ paused }: { paused: boolean }) {
  return (
    <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
      <div className="relative h-[54vh] w-[min(80vw,460px)]" style={paused ? { animation: "none" } : cv({ animation: "cc-float 17s ease-in-out infinite", "--float-y": "4px" })}>
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, var(--t-surface) 0%, var(--t-surface-alt) 100%)", boxShadow: "0 28px 48px -38px rgba(48, 36, 25, 0.85)", opacity: 0.92 }} />
        <div className="absolute inset-x-[4%] bottom-[8%] top-[14%]" style={{ background: RULES, maskImage: FADE, WebkitMaskImage: FADE }} />
        <div className="absolute inset-x-[4%] top-[12%] h-px" style={{ background: "var(--t-secondary)", opacity: 0.4 }} />
      </div>
    </div>
  );
}

function LetterheadRule({ className, tone }: { className: string; tone: string }) {
  return (
    <div className={`absolute ${className}`}>
      <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${tone}, transparent)` }} />
      <div className="mx-auto -mt-[4px] h-[8px] w-[8px] rotate-45" style={{ background: "var(--t-accent)", opacity: 0.6 }} />
    </div>
  );
}

export default function Skin({ sceneId, paused = false, className }: ThemeSkinProps) {
  const scene = sceneId ?? "opening";
  const opening = scene === "opening";
  const sealed = scene === "envelope";
  const letter = scene === "letter";
  const memory = scene === "memory";
  const closing = scene === "closing";
  const answering = scene === "response";

  return (
    <div className={["pointer-events-none absolute inset-0 overflow-hidden", className].filter(Boolean).join(" ")} aria-hidden>
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #fbf7ee 0%, var(--t-bg) 52%, var(--t-bg-alt) 100%)" }} />
      <Fibre />
      <div className="absolute inset-0" style={{ background: "radial-gradient(108% 82% at 50% 42%, transparent 40%, rgba(90, 70, 50, 0.16) 100%)", opacity: 0.85 }} />
      {BLOOMS.map((bloom) => (
        <InkBloom key={bloom.left} left={bloom.left} top={bloom.top} size={bloom.size} opacity={bloom.opacity} paused={paused} />
      ))}
      {(letter || opening) && <><Deckle edge="top" /><Deckle edge="bottom" /></>}
      {letter && <RuledSheet paused={paused} />}
      {letter && <CornerFold corner="tl" />}
      {opening && <Envelope narrow paused={paused} />}
      {sealed && (
        <>
          <div className="absolute inset-0" style={{ background: "radial-gradient(82% 66% at 50% 54%, rgba(255, 251, 242, 0.5), transparent 68%)" }} />
          <Envelope paused={paused} />
          {POSTMARKS.map((mark) => (
            <svg key={mark.left} viewBox="-50 -50 100 100" width={mark.size} height={mark.size} className="absolute" style={{ left: mark.left, top: mark.top, transform: `rotate(${mark.rotate}deg)`, color: "var(--t-secondary)" }}>
              <circle r="43" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.42" />
              <circle r="34" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 5" opacity="0.34" />
              <path d="M-47 5h94M-47 13h70" stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
            </svg>
          ))}
        </>
      )}
      {memory && (
        <>
          <CornerFold corner="tr" />
          {STAMPS.map((stamp) => (
            <div key={stamp.left} className="absolute h-[68px] w-[54px]" style={{ left: stamp.left, top: stamp.top, transform: `rotate(${stamp.rotate}deg)`, background: "var(--t-surface)", border: "1px dashed rgba(90, 70, 50, 0.42)" }}>
              <div className="absolute inset-[6px]" style={{ background: "linear-gradient(140deg, rgba(156, 124, 82, 0.3), rgba(140, 47, 47, 0.2))" }} />
            </div>
          ))}
          {POSTMARKS.map((mark) => (
            <div key={`${mark.left}-ring`} className="absolute rounded-full border" style={{ left: mark.left, top: mark.top, width: mark.size * 0.7, height: mark.size * 0.7, borderColor: "var(--t-secondary)", opacity: 0.28 }} />
          ))}
        </>
      )}
      {closing && <><CornerFold corner="br" /><div className="absolute left-1/2 top-[38%] h-[110px] w-[110px] -translate-x-1/2"><WaxSeal size={110} paused={paused} subtle /></div></>}
      {answering && <div className="absolute left-[7%] top-[64%] h-[58px] w-[58px] -translate-y-1/2 opacity-70"><WaxSeal size={58} paused={paused} subtle /></div>}
      <LetterheadRule className="left-1/2 top-[9%] w-[min(56vw,300px)] -translate-x-1/2" tone="var(--t-secondary)" />
      {(letter || sealed || closing || answering) && (
        <LetterheadRule className="left-1/2 bottom-[9%] w-[min(44vw,240px)] -translate-x-1/2" tone="var(--t-secondary)" />
      )}
      <div className="absolute inset-0" style={{ background: "linear-gradient(200deg, rgba(255, 251, 242, 0.28) 0%, transparent 38%, rgba(90, 70, 50, 0.12) 100%)" }} />
    </div>
  );
}
