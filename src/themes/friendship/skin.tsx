"use client";

import type { CSSProperties } from "react";
import type { ThemeSkinProps } from "@/themes/types";

type Vars = CSSProperties & Record<`--${string}`, string | number>;
// Three decimals keeps SSR and client SVG attributes identical.
const r = (n: number) => Math.round(n * 1000) / 1000;

const cv = (d: CSSProperties & Record<`--${string}`, string | number>): Vars => d as Vars;

interface Frame { left: string; top: string; w: number; rotate: number; tint: [string, string]; delay: number }
interface TapeSpec { left: string; top: string; rotate: number; width: number; tone: string; striped?: boolean }
interface Sketch { d: string; viewBox: string; className: string; tone: string; dash?: string }

const FRAMES: Record<string, Frame[]> = {
  opening: [
    { left: "7%", top: "14%", w: 116, rotate: -9, tint: ["#bfe3f6", "#eaf6fc"], delay: 0 },
    { left: "37%", top: "54%", w: 128, rotate: 5, tint: ["#ffd9a8", "#fff2da"], delay: 1.1 },
    { left: "66%", top: "9%", w: 104, rotate: 11, tint: ["#cfe9d2", "#edf8ee"], delay: 2.2 },
  ],
  memory: [
    { left: "4%", top: "7%", w: 112, rotate: -11, tint: ["#bfe3f6", "#eaf6fc"], delay: 0 },
    { left: "35%", top: "3%", w: 96, rotate: 6, tint: ["#ffd9a8", "#fff2da"], delay: 0.8 },
    { left: "64%", top: "11%", w: 118, rotate: -4, tint: ["#f8c9c4", "#fdeceb"], delay: 1.6 },
    { left: "10%", top: "46%", w: 100, rotate: 8, tint: ["#cfe9d2", "#edf8ee"], delay: 2.4 },
    { left: "45%", top: "42%", w: 118, rotate: -7, tint: ["#d8d1f2", "#f1eefb"], delay: 3.2 },
    { left: "76%", top: "52%", w: 92, rotate: 13, tint: ["#ffd9a8", "#fff2da"], delay: 4 },
  ],
};

const TAPES: Record<string, TapeSpec[]> = {
  opening: [
    { left: "15%", top: "9%", rotate: -14, width: 128, tone: "rgba(47, 111, 158, 0.35)", striped: true },
    { left: "64%", top: "40%", rotate: 9, width: 112, tone: "rgba(240, 147, 47, 0.4)" },
    { left: "44%", top: "70%", rotate: -6, width: 96, tone: "rgba(228, 87, 79, 0.3)", striped: true },
  ],
  memory: [
    { left: "10%", top: "3%", rotate: -11, width: 120, tone: "rgba(47, 111, 158, 0.32)", striped: true },
    { left: "44%", top: "0%", rotate: 7, width: 104, tone: "rgba(240, 147, 47, 0.36)" },
    { left: "72%", top: "6%", rotate: -4, width: 116, tone: "rgba(228, 87, 79, 0.28)", striped: true },
    { left: "18%", top: "42%", rotate: 12, width: 92, tone: "rgba(47, 111, 158, 0.26)" },
  ],
  letter: [
    { left: "16%", top: "24%", rotate: -13, width: 124, tone: "rgba(240, 147, 47, 0.38)", striped: true },
    { left: "62%", top: "26%", rotate: 8, width: 108, tone: "rgba(47, 111, 158, 0.32)" },
  ],
  envelope: [
    { left: "12%", top: "22%", rotate: -15, width: 136, tone: "rgba(255, 253, 246, 0.72)", striped: true },
    { left: "68%", top: "18%", rotate: 11, width: 120, tone: "rgba(240, 147, 47, 0.34)" },
  ],
};

const SKETCHES: Record<string, Sketch[]> = {
  opening: [{ d: "M4 40c30 24 58-24 90 0s58 26 92-2", viewBox: "0 0 200 60", className: "inset-x-0 bottom-[6%] h-[10vh] w-full", tone: "var(--t-secondary)" }],
  closing: [
    { d: "M8 92C40 22 106 110 148 46c14-22 44-26 62-8", viewBox: "0 0 220 120", className: "right-[4%] top-[26%] h-[26vh] w-[48vw]", tone: "var(--t-primary)" },
    { d: "M176 12l22 14-22 14", viewBox: "0 0 220 120", className: "right-[4%] top-[26%] h-[26vh] w-[48vw]", tone: "var(--t-primary)" },
  ],
  response: [{ d: "M6 34c26-22 44 22 66-4s40 26 62 0 40 22 60-2", viewBox: "0 0 200 60", className: "inset-x-0 bottom-[10%] h-[9vh] w-full", tone: "var(--t-accent)" }],
  default: [{ d: "M4 30C24 8 44 52 64 26s40 22 60-4 42 26 62 2", viewBox: "0 0 200 60", className: "inset-x-0 bottom-[12%] h-[8vh] w-full", tone: "var(--t-primary)" }],
};

const CONFETTI = [
  { x: 8, y: 26, s: 8, r: 18, tone: "#2f6f9e", delay: 0, dur: 7 },
  { x: 18, y: 74, s: 6, r: -22, tone: "#e4574f", delay: 1.1, dur: 9 },
  { x: 31, y: 16, s: 9, r: 34, tone: "#f0932f", delay: 0.4, dur: 8 },
  { x: 44, y: 88, s: 7, r: -12, tone: "#2f6f9e", delay: 2.2, dur: 10 },
  { x: 58, y: 22, s: 6, r: 47, tone: "#e4574f", delay: 1.7, dur: 7 },
  { x: 69, y: 66, s: 9, r: -30, tone: "#f0932f", delay: 0.9, dur: 9 },
  { x: 83, y: 30, s: 7, r: 11, tone: "#2f6f9e", delay: 2.8, dur: 8 },
  { x: 93, y: 78, s: 6, r: -41, tone: "#e4574f", delay: 1.4, dur: 10 },
];

const STARBURSTS = [
  { left: "12%", top: "62%", s: 34, tone: "#2f6f9e" },
  { left: "81%", top: "58%", s: 26, tone: "#f0932f" },
  { left: "58%", top: "80%", s: 20, tone: "#e4574f" },
  { left: "26%", top: "34%", s: 16, tone: "#f0932f" },
];

const GRID = "repeating-linear-gradient(0deg, rgba(47, 111, 158, 0.11) 0 1px, transparent 1px 34px), repeating-linear-gradient(90deg, rgba(47, 111, 158, 0.11) 0 1px, transparent 1px 34px)";
const RULED = "repeating-linear-gradient(180deg, transparent 0 26px, rgba(47, 111, 158, 0.2) 26px 27px)";

function Tape({ tape }: { tape: TapeSpec }) {
  const fill = tape.striped ? `repeating-linear-gradient(45deg, ${tape.tone} 0 7px, rgba(255, 255, 255, 0.62) 7px 15px)` : tape.tone;
  const shape = { left: tape.left, top: tape.top, width: tape.width, transform: `rotate(${tape.rotate}deg)`, background: fill, opacity: 0.85 };
  return <div className="absolute h-[26px]" style={{ ...shape, boxShadow: "0 3px 7px -4px rgba(58, 42, 23, 0.45)", clipPath: "polygon(1% 0, 99% 5%, 100% 90%, 3% 100%, 0 58%)" }} />;
}

function Polaroid({ frame, paused }: { frame: Frame; paused: boolean }) {
  return (
    <div className="absolute" style={{ left: frame.left, top: frame.top, width: frame.w, transform: `rotate(${frame.rotate}deg)` }}>
      <div style={paused ? { animation: "none" } : cv({ animation: `cc-float ${8 + frame.delay}s ease-in-out ${frame.delay * 0.6}s infinite`, "--float-y": "8px" })}>
        <div className="rounded-[3px] p-[6%] pb-[17%]" style={{ background: "var(--t-surface)", boxShadow: "0 14px 26px -18px rgba(58, 42, 23, 0.65)" }}>
          <div className="aspect-square w-full rounded-[2px]" style={{ background: `linear-gradient(152deg, ${frame.tint[0]}, ${frame.tint[1]})` }} />
        </div>
      </div>
    </div>
  );
}

function Starburst({ size, tone, paused }: { size: number; tone: string; paused: boolean }) {
  return (
    <svg viewBox="-22 -22 44 44" width={size} height={size} stroke={tone} strokeWidth="1.7" strokeLinecap="round" style={paused ? { opacity: 0.8 } : cv({ animation: "cc-twinkle 5.5s ease-in-out infinite", transformOrigin: "center" })}>
      {Array.from({ length: 12 }, (_, i) => (i * Math.PI) / 6).map((angle, i) => (
        <line key={i} x1={r(Math.cos(angle) * 6)} y1={r(Math.sin(angle) * 6)} x2={r(Math.cos(angle) * (i % 2 === 0 ? 20 : 14))} y2={r(Math.sin(angle) * (i % 2 === 0 ? 20 : 14))} />
      ))}
    </svg>
  );
}

function Squiggle({ sketch }: { sketch: Sketch }) {
  return (
    <svg viewBox={sketch.viewBox} fill="none" className={`absolute ${sketch.className}`} style={{ color: sketch.tone }}>
      <path d={sketch.d} stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}

function SunDoodle() {
  return (
    <svg viewBox="-40 -40 80 80" width="112" height="112" fill="none" stroke="var(--t-secondary)" strokeWidth="2.4" strokeLinecap="round" opacity="0.75">
      <circle r="15" />
      {Array.from({ length: 12 }, (_, i) => (i * Math.PI) / 6).map((angle) => (
        <line key={angle} x1={r(Math.cos(angle) * 22)} y1={r(Math.sin(angle) * 22)} x2={r(Math.cos(angle) * 32)} y2={r(Math.sin(angle) * 32)} />
      ))}
    </svg>
  );
}

function KraftEnvelope({ paused }: { paused: boolean }) {
  return (
    <div className="absolute bottom-[11%] left-1/2 h-[34vh] w-[min(80vw,440px)] -translate-x-1/2">
      <div className="absolute inset-0 rounded-[5px]" style={{ background: "linear-gradient(168deg, #d8b183 0%, #c69a6b 62%, #b98a5c 100%)", boxShadow: "0 22px 40px -26px rgba(58, 42, 23, 0.7)" }} />
      <div className="absolute inset-x-0 top-0 h-[52%]" style={{ background: "linear-gradient(180deg, rgba(255, 246, 230, 0.42), rgba(255, 246, 230, 0))", clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
      <div className="absolute inset-x-0 bottom-0 h-[10px]" style={{ background: "repeating-linear-gradient(45deg, #e4574f 0 12px, #fffdf6 12px 20px, #2f6f9e 20px 32px, #fffdf6 32px 40px)" }} />
      <div className="absolute left-1/2 top-[46%] h-[54px] w-[54px] -translate-x-1/2">
        <div className="h-full w-full rounded-full" style={{ background: "radial-gradient(circle at 34% 30%, #ffe0b8, #d9a05a 70%)", boxShadow: "0 0 0 5px rgba(228, 87, 79, 0.28)", ...(paused ? { animation: "none" } : cv({ animation: "cc-breathe 6s ease-in-out infinite", transformOrigin: "center" })) }} />
      </div>
    </div>
  );
}

function PlainCard({ paused }: { paused: boolean }) {
  return (
    <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
      <div style={{ transform: "rotate(-2.2deg)" }}>
        <div className="relative h-[46vh] w-[min(78vw,420px)]" style={paused ? { animation: "none" } : cv({ animation: "cc-float 13s ease-in-out infinite", "--float-y": "5px" })}>
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, var(--t-surface), var(--t-surface-alt))", boxShadow: "0 24px 44px -30px rgba(58, 42, 23, 0.75)", clipPath: "polygon(0 2%, 12% 0.4%, 26% 1.8%, 41% 0, 58% 1.6%, 74% 0.2%, 88% 1.9%, 100% 0.6%, 100% 100%, 0 100%)" }} />
          <div className="absolute inset-x-[8%] bottom-[10%] h-[16vh]" style={{ background: RULED }} />
        </div>
      </div>
    </div>
  );
}

export default function Skin({ sceneId, paused = false, className }: ThemeSkinProps) {
  const scene = sceneId ?? "opening";
  const opening = scene === "opening";
  const memory = scene === "memory";
  const letter = scene === "letter";
  const kraft = scene === "envelope";
  const closing = scene === "closing";
  const answering = scene === "response";
  const quiet = !opening && !memory && !letter && !kraft && !closing && !answering;
  const frames = FRAMES[scene] ?? [];
  const tapes = TAPES[scene] ?? [];
  const sketches = SKETCHES[scene] ?? SKETCHES.default;

  return (
    <div className={["pointer-events-none absolute inset-0 overflow-hidden", className].filter(Boolean).join(" ")} aria-hidden>
      <div className="absolute inset-0" style={{ background: "linear-gradient(158deg, #fffaea 0%, var(--t-bg) 42%, var(--t-bg-alt) 100%)" }} />
      <div className="absolute inset-0" style={{ backgroundImage: GRID, opacity: 0.85 }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(120% 92% at 8% 4%, rgba(255, 255, 255, 0.85), transparent 58%)" }} />
      {(opening || closing) && <div className="absolute right-[6%] top-[4%]"><SunDoodle /></div>}
      {frames.map((frame) => <Polaroid key={`${frame.left}-${frame.top}`} frame={frame} paused={paused} />)}
      {tapes.map((tape) => <Tape key={`${tape.left}-${tape.top}`} tape={tape} />)}
      {letter && <PlainCard paused={paused} />}
      {kraft && <><div className="absolute inset-0" style={{ background: "radial-gradient(90% 70% at 50% 74%, rgba(198, 154, 107, 0.34), transparent 70%)" }} /><KraftEnvelope paused={paused} /></>}
      {closing && (
        <svg viewBox="0 0 24 24" width="88" height="88" fill="none" stroke="var(--t-accent)" strokeWidth="1.7" strokeLinejoin="round" className="absolute left-[14%] top-[52%]" style={{ transform: "rotate(-8deg)" }}>
          <path d="M12 20.4C6.4 16.7 3 13.4 3 9.7 3 7.1 5.1 5 7.6 5c1.6 0 3.1.8 4.1 2.1.9-1.3 2.4-2.1 4.1-2.1 2.5 0 4.6 2.1 4.6 4.7 0 3.7-3.4 7-9.4 10.7z" />
        </svg>
      )}
      {(answering || quiet) && STARBURSTS.map((star) => (
        <div key={star.left} className="absolute" style={{ left: star.left, top: star.top, opacity: quiet ? 0.6 : 1 }}><Starburst size={star.s} tone={star.tone} paused={paused} /></div>
      ))}
      {answering && <div className="absolute left-1/2 top-1/2 h-[58vh] w-[58vh] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "radial-gradient(closest-side, rgba(240, 147, 47, 0.28), transparent 72%)" }} />}
      {sketches.map((sketch) => <Squiggle key={sketch.d} sketch={sketch} />)}
      {(opening || memory || answering || quiet) && CONFETTI.map((bit) => {
        const body = { left: `${bit.x}%`, top: `${bit.y}%`, width: bit.s, height: bit.s, borderRadius: bit.s % 3 === 0 ? "50%" : 2, background: bit.tone, opacity: 0.75 };
        const anim = paused ? { animation: "none", transform: `rotate(${bit.r}deg)` } : cv({ animation: `cc-float ${bit.dur}s ease-in-out ${bit.delay}s infinite`, "--r": `${bit.r}deg`, "--float-y": `${10 + bit.s}px` });
        return <div key={`${bit.x}-${bit.y}`} className="absolute" style={{ ...body, ...anim }} />;
      })}
      <div className="absolute inset-0" style={{ background: "radial-gradient(115% 88% at 50% 50%, transparent 46%, rgba(255, 233, 196, 0.75) 100%)", opacity: 0.9 }} />
    </div>
  );
}
