"use client";

import type { CSSProperties } from "react";
import type { ThemeSkinProps } from "@/themes/types";

type CSSVars = CSSProperties & { [key: `--${string}`]: string };

/** horizon = % from top where meadow starts. arc = ring scale. sun = px above horizon. */
type Field = { horizon: number; arc: number; sun: number; stems: number; flies: number; haze: number; card: number; frames: number };

const FIELD: Record<string, Field> = {
  opening: { horizon: 72, arc: 1.15, sun: 96, stems: 0.7, flies: 1, haze: 0.5, card: 0, frames: 0 },
  hurt: { horizon: 80, arc: 0.8, sun: 40, stems: 0.5, flies: 0.35, haze: 0.3, card: 0, frames: 0 },
  meaning: { horizon: 76, arc: 1, sun: 70, stems: 0.65, flies: 0.8, haze: 0.55, card: 0, frames: 0 },
  sorry: { horizon: 82, arc: 0.9, sun: 52, stems: 0.55, flies: 0.3, haze: 0.34, card: 0, frames: 0 },
  memory: { horizon: 78, arc: 1.05, sun: 74, stems: 0.6, flies: 0.6, haze: 0.45, card: 0, frames: 1 },
  letter: { horizon: 84, arc: 0.85, sun: 46, stems: 0.75, flies: 0.5, haze: 0.4, card: 0, frames: 0 },
  envelope: { horizon: 79, arc: 0.95, sun: 62, stems: 0.6, flies: 0.55, haze: 0.4, card: 1, frames: 0 },
  closing: { horizon: 70, arc: 1.3, sun: 122, stems: 0.9, flies: 1, haze: 0.8, card: 0, frames: 0 },
  response: { horizon: 74, arc: 0.9, sun: 50, stems: 0.5, flies: 0.45, haze: 0.4, card: 0, frames: 0 },
};

const PATHS = [
  'path("M -60 180 C 180 60, 360 300, 640 170 S 1080 40, 1500 170")',
  'path("M 1600 120 C 1300 280, 1000 60, 700 240 S 200 120, -80 260")',
  'path("M -40 320 C 300 220, 380 400, 720 340 S 1200 240, 1520 360")',
];

const FLIES: Array<[path: number, dur: number, delay: number, size: number, wing: string, rest: number]> = [
  [0, 26, 0, 30, "#f0a882", 22],
  [1, 34, 4, 22, "#e8b45c", 58],
  [0, 31, 9, 18, "#efbf8e", 74],
  [2, 39, 2, 26, "#f0a882", 41],
  [1, 44, 14, 16, "#d9a441", 88],
];

const STEMS: Array<[left: number, h: number, delay: number, flip: number]> = [
  [7, 132, 0, -2], [19, 96, 1.6, 3], [34, 150, 3.1, -1], [63, 110, 0.7, 2], [79, 142, 2.4, -3], [91, 88, 4.2, 1],
];

const KEYFRAMES = `
@keyframes fs-flit { from { offset-distance: 0%; } to { offset-distance: 100%; } }
@keyframes fs-wing { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(0.52); } }`;

const EASE = "opacity 900ms cubic-bezier(0.22,1,0.36,1), transform 900ms cubic-bezier(0.22,1,0.36,1)";

function Butterfly({ path, dur, delay, size, wing, rest, paused }: { path: number; dur: number; delay: number; size: number; wing: string; rest: number; paused?: boolean }) {
  const style: CSSVars = {
    position: "absolute",
    left: 0,
    top: 0,
    width: size,
    height: size,
    offsetPath: PATHS[path],
    offsetRotate: "auto",
  };
  if (paused) style.offsetDistance = `${rest}%`;
  else style.animation = `fs-flit ${dur}s linear ${delay}s infinite`;
  const flap = paused ? {} : { animation: "fs-wing 1.05s ease-in-out infinite" };
  return (
    <div style={style}>
      <svg viewBox="0 0 32 26" width={size} height={size} aria-hidden>
        <g style={{ transformOrigin: "16px 12px", ...flap }}>
          <path d="M14 12C8.5 3.5 1 2 2 9.2c.9 6 7 8 12 4.2Z" fill={wing} />
          <path d="M18 12c5.5-8.5 13-10 12-2.8-.9 6-7 8-12 4.2Z" fill={wing} opacity="0.86" />
          <path d="M16 7c.4 3.6.4 7 0 10.4" stroke="#4c7350" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        </g>
      </svg>
    </div>
  );
}

function Stem({ left, h, delay, flip, paused }: { left: number; h: number; delay: number; flip: number; paused?: boolean }) {
  const style: CSSVars = {
    left: `${left}%`,
    bottom: 0,
    width: 44,
    height: h,
    transformOrigin: "50% 100%",
    opacity: 0.62,
    "--r": `${flip}deg`,
    transition: EASE,
  };
  if (paused) style.transform = `rotate(${flip}deg)`;
  else style.animation = `cc-sway ${9 + delay}s ease-in-out ${delay}s infinite`;
  return (
    <div className="absolute" style={style}>
      <svg viewBox="0 0 44 160" width="44" height={h} aria-hidden preserveAspectRatio="none">
        <path d="M22 160C20 120 24 74 21 34" stroke="#8aa87d" strokeWidth="1.4" fill="none" />
        <path d="M22 96c-9-4-13-11-13-11M22 78c8-3 12-10 12-10" stroke="#a3bb95" strokeWidth="1.2" fill="none" />
        <ellipse cx="21" cy="29" rx="5.4" ry="9" fill="#e8dcc0" stroke="#c2a878" strokeWidth="0.8" />
        <circle cx="21" cy="18" r="1.6" fill="#c99a2e" />
        <circle cx="19" cy="24" r="1.2" fill="#c99a2e" opacity="0.7" />
      </svg>
    </div>
  );
}

function Frames({ opacity }: { opacity: number }) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div key={i} className="absolute" style={{ left: `${18 + i * 22}%`, top: `${28 + (i % 2) * 4}%`, width: "19%", height: "22%", border: "1px solid rgba(76,115,80,0.4)", borderRadius: 4, background: "rgba(253,252,246,0.34)", opacity, transition: EASE }} />
      ))}
    </>
  );
}

export default function Skin({ sceneId, paused, className }: ThemeSkinProps) {
  const scene = sceneId ?? "opening";
  const field = FIELD[scene] ?? FIELD.opening;
  const sky = 100 - field.horizon;

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className ?? ""}`} aria-hidden data-scene={scene}>
      <style>{KEYFRAMES}</style>

      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #e9f2df 0%, #f1f6ea 44%, #faf3e5 100%)" }} />
      <div className="absolute inset-x-0 top-0 h-[62%]" style={{ background: "radial-gradient(72% 86% at 50% 4%, rgba(253,231,207,0.78) 0%, rgba(253,231,207,0) 74%)", opacity: field.haze, transition: EASE }} />

      {/* soft morning clouds */}
      <div className="absolute" style={{ left: "6%", top: "14%", width: "34vw", height: "9vh", borderRadius: 999, background: "linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.05))", filter: "blur(14px)", opacity: 0.6 * field.haze + 0.2, transition: EASE }} />
      <div className="absolute" style={{ right: "4%", top: "21%", width: "28vw", height: "7vh", borderRadius: 999, background: "linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,255,255,0.02))", filter: "blur(16px)", opacity: 0.5 * field.haze + 0.18, transition: EASE }} />

      {/* sunrise arcs, sitting on the horizon */}
      <div className="absolute left-1/2" style={{ bottom: `${sky}%`, width: "min(150vw, 900px)", height: "min(75vw, 450px)", marginLeft: "calc(min(150vw,900px) * -0.5)", transform: `translateY(2px) scale(${field.arc})`, transformOrigin: "50% 100%", transition: EASE }}>
        <svg viewBox="0 0 400 200" width="100%" height="100%" aria-hidden preserveAspectRatio="xMidYMax meet">
          <circle cx="200" cy="200" r="192" fill="none" stroke="#b6cf9a" strokeWidth="0.7" opacity="0.55" />
          <circle cx="200" cy="200" r="150" fill="none" stroke="#cfe0b8" strokeWidth="0.7" opacity="0.65" />
          <circle cx="200" cy="200" r="112" fill="none" stroke="#f3cfae" strokeWidth="0.7" opacity="0.7" />
          <circle cx="200" cy="200" r="78" fill="none" stroke="#f7ddc0" strokeWidth="0.7" opacity="0.7" />
        </svg>
      </div>

      {/* the sun, low and warm */}
      <div className="absolute left-1/2" style={{ bottom: `calc(${sky}% + ${field.sun}px)`, width: "min(30vw,180px)", height: "min(30vw,180px)", marginLeft: "calc(min(30vw,180px) * -0.5)", borderRadius: 9999, background: "radial-gradient(circle at 46% 46%, #fff9ea 0%, #ffe2b8 46%, #f7bd8a 72%, rgba(240,168,130,0) 74%)", transition: EASE }} />
      <div className="absolute left-1/2" style={{ bottom: `calc(${sky}% - 30px)`, width: "min(70vw,420px)", height: "min(70vw,420px)", marginLeft: "calc(min(70vw,420px) * -0.5)", background: "radial-gradient(circle at 50% 62%, rgba(247,189,138,0.32) 0%, rgba(247,189,138,0) 64%)", transition: EASE }} />

      {/* meadow: horizon line then two hills */}
      <div className="absolute inset-x-0" style={{ top: `${field.horizon}%`, height: 1, background: "linear-gradient(90deg, rgba(76,115,80,0) 0%, rgba(76,115,80,0.55) 26%, rgba(76,115,80,0.55) 74%, rgba(76,115,80,0) 100%)", transition: EASE }} />
      <div className="absolute inset-x-0 bottom-0" style={{ top: `${field.horizon}%` }}>
        <svg viewBox="0 0 1440 320" width="100%" height="100%" preserveAspectRatio="none" aria-hidden>
          <path d="M0 96C240 40 420 128 690 92S1080 24 1440 78V320H0Z" fill="#dfeaca" opacity="0.9" />
          <path d="M0 164C300 112 520 190 820 156s380-52 620 4v160H0Z" fill="#cadfb4" opacity="0.92" />
          <path d="M0 250C280 208 560 268 880 240s400-38 560 2v78H0Z" fill="#b6cf9a" />
        </svg>
        <div className="absolute inset-x-0 bottom-0" style={{ height: "38%", background: "linear-gradient(to top, rgba(214,229,196,0.55), transparent)" }} />
      </div>

      {STEMS.map(([left, h, delay, flip], i) => (
        <Stem key={i} left={left} h={h} delay={delay} flip={flip} paused={paused} />
      ))}

      {FLIES.slice(0, Math.max(2, Math.round(FLIES.length * (0.4 + field.flies * 0.6)))).map(([path, dur, delay, size, wing, rest], i) => (
        <Butterfly key={i} path={path} dur={dur} delay={delay} size={size} wing={wing} rest={rest} paused={paused} />
      ))}

      <Frames opacity={field.frames * 0.85} />
      <div className="absolute" style={{ left: "50%", top: "34%", width: "min(62vw,340px)", height: "min(40vw,220px)", marginLeft: "calc(min(62vw,340px) * -0.5)", border: "1px solid rgba(196,160,116,0.55)", borderRadius: 6, background: "linear-gradient(160deg, rgba(226,203,166,0.18), rgba(226,203,166,0.04))", opacity: field.card, transition: EASE }} />

      <div className="absolute inset-x-0 bottom-0 h-[26vh]" style={{ background: "linear-gradient(to top, rgba(214,229,196,0.6), transparent)", opacity: 0.8 }} />
    </div>
  );
}
