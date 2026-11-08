"use client";

import type { CSSProperties } from "react";
import type { ThemeSkinProps } from "@/themes/types";

type CSSVars = CSSProperties & { [key: `--${string}`]: string };

/** One row per beat. Everything the room does is driven from here. */
type Room = {
  shaft: number;
  shaftW: number;
  tilt: number;
  vignette: number;
  rules: number[];
  ruleW: number;
  glow: number;
  seal: number;
  frames: number;
  margin: number;
};

const ROOM: Record<string, Room> = {
  opening: { shaft: 0.72, shaftW: 44, tilt: -13, vignette: 0.72, rules: [26], ruleW: 54, glow: 0.55, seal: 0, frames: 0, margin: 0 },
  hurt: { shaft: 0.42, shaftW: 54, tilt: -16, vignette: 0.94, rules: [31], ruleW: 46, glow: 0.28, seal: 0, frames: 0, margin: 0 },
  meaning: { shaft: 0.56, shaftW: 48, tilt: -12, vignette: 0.8, rules: [22, 74], ruleW: 60, glow: 0.46, seal: 0, frames: 0, margin: 0 },
  sorry: { shaft: 0.32, shaftW: 40, tilt: -18, vignette: 1, rules: [24], ruleW: 42, glow: 0.2, seal: 0, frames: 0, margin: 0 },
  envelope: { shaft: 0.6, shaftW: 46, tilt: -11, vignette: 0.86, rules: [18, 82], ruleW: 64, glow: 0.4, seal: 1, frames: 0, margin: 0 },
  letter: { shaft: 0.26, shaftW: 34, tilt: -9, vignette: 1, rules: [16, 84], ruleW: 58, glow: 0.18, seal: 0, frames: 0, margin: 1 },
  memory: { shaft: 0.48, shaftW: 50, tilt: -14, vignette: 0.9, rules: [12, 88], ruleW: 70, glow: 0.3, seal: 0, frames: 1, margin: 0 },
  closing: { shaft: 0.66, shaftW: 42, tilt: -10, vignette: 0.78, rules: [20, 80], ruleW: 56, glow: 0.52, seal: 0, frames: 0, margin: 0 },
  response: { shaft: 0.5, shaftW: 38, tilt: -12, vignette: 0.84, rules: [28], ruleW: 50, glow: 0.24, seal: 0, frames: 0, margin: 0 },
};

const PETALS: Array<[left: number, delay: number, dur: number, size: number, drift: number, opacity: number]> = [
  [12, 0, 42, 15, 40, 0.5],
  [34, 13, 36, 11, -30, 0.42],
  [57, 6, 47, 17, 26, 0.46],
  [76, 22, 40, 12, -44, 0.38],
  [88, 2, 52, 14, 18, 0.34],
  [45, 29, 33, 10, 34, 0.4],
];

const KEYFRAMES = `
@keyframes rg-fall {
  0% { transform: translate3d(0,-18vh,0) rotate(0deg); opacity: 0; }
  9% { opacity: var(--o,0.45); }
  86% { opacity: var(--o,0.45); }
  100% { transform: translate3d(var(--dx,-20px),114vh,0) rotate(210deg); opacity: 0; }
}
@keyframes rg-lift { 0%,100% { opacity: calc(var(--b,0.5) * 0.82); } 50% { opacity: var(--b,0.5); } }`;

const SLOW = "opacity 2200ms cubic-bezier(0.4, 0, 0.2, 1)";

function Petal({ left, delay, dur, size, drift, opacity, paused }: { left: number; delay: number; dur: number; size: number; drift: number; opacity: number; paused?: boolean }) {
  const style: CSSVars = {
    left: `${left}%`,
    top: 0,
    width: size,
    height: size * 1.15,
    background: "linear-gradient(146deg, #8e3a43 0%, #6d2630 52%, #4a161c 100%)",
    borderRadius: "64% 36% 58% 42% / 62% 58% 42% 38%",
    boxShadow: "inset 1px 1px 2px rgba(255,206,206,0.18)",
    "--dx": `${drift}px`,
    "--o": String(opacity),
  };
  if (!paused) style.animation = `rg-fall ${dur}s linear ${delay}s infinite`;
  else {
    style.opacity = opacity;
    style.transform = `translate3d(0, ${28 + (delay % 7) * 9}vh, 0)`;
  }
  return <div className="absolute" style={style} />;
}

function Rule({ top, width, opacity = 0.16 }: { top: number; width: number; opacity?: number }) {
  return (
    <div
      className="absolute left-1/2"
      style={{ top: `${top}%`, width: `${width}%`, height: 1, marginLeft: `-${width / 2}%`, background: "linear-gradient(90deg, transparent, rgba(244,230,228,0.9) 22%, rgba(244,230,228,0.9) 78%, transparent)", opacity, transition: SLOW }}
    />
  );
}

function Seal({ opacity }: { opacity: number }) {
  return (
    <div className="absolute left-1/2 top-1/2" style={{ width: 92, height: 92, marginLeft: -46, marginTop: -46, opacity, transition: SLOW }}>
      <div className="absolute inset-0 rounded-full" style={{ border: "1px solid rgba(201,112,122,0.55)" }} />
      <div className="absolute inset-[14px] rounded-full" style={{ border: "1px solid rgba(201,112,122,0.28)" }} />
      <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 50% 50%, rgba(168,86,96,0.22) 0%, transparent 68%)" }} />
    </div>
  );
}

function Ghosts({ opacity }: { opacity: number }) {
  return (
    <>
      {[{ x: 16, r: -3 }, { x: 58, r: 2 }].map((f, i) => (
        <div key={i} className="absolute" style={{ left: `${f.x}%`, top: "38%", width: "26%", height: "24%", transform: `rotate(${f.r}deg)`, border: "1px solid rgba(244,230,228,0.34)", opacity, transition: SLOW }} />
      ))}
    </>
  );
}

export default function Skin({ sceneId, focus = 0, paused, className }: ThemeSkinProps) {
  const scene = sceneId ?? "opening";
  const room = ROOM[scene] ?? ROOM.opening;
  const shade = Math.min(1, room.vignette + focus * 0.22);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className ?? ""}`} aria-hidden data-scene={scene}>
      <style>{KEYFRAMES}</style>

      {/* the room: floor, back wall, dust */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #1b0c10 0%, #2a1418 44%, #140a0c 100%)" }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(86% 58% at 26% 6%, rgba(120,52,60,0.32) 0%, transparent 68%)" }} />
      <div className="absolute inset-x-0 bottom-0 h-[46vh]" style={{ background: "radial-gradient(120% 74% at 50% 118%, rgba(122,43,51,0.34) 0%, transparent 72%)", opacity: 0.6 + room.glow * 0.4, transition: SLOW }} />

      {/* one shaft of daylight, never more */}
      <div
        className="absolute"
        style={{
          top: "-34vh",
          left: `${44 - room.shaftW / 3}%`,
          width: `${room.shaftW}vw`,
          height: "150vh",
          transform: `rotate(${room.tilt}deg)`,
          clipPath: "polygon(34% 0%, 62% 0%, 100% 100%, 0% 100%)",
          background: "linear-gradient(178deg, rgba(255,226,212,0.2) 0%, rgba(255,226,212,0.11) 38%, rgba(255,226,212,0) 88%)",
          filter: "blur(22px)",
          opacity: room.shaft,
          transition: SLOW,
        }}
      />
      <div className="absolute" style={{ top: "-10vh", left: "39%", width: 110, height: "120vh", transform: `rotate(${room.tilt + 2}deg)`, background: "linear-gradient(180deg, rgba(255,236,224,0.16) 0%, transparent 78%)", filter: "blur(30px)", opacity: room.shaft * 0.8, transition: SLOW }} />

      {/* vignette, heavy and always heavier on the letter */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(120% 92% at 50% 44%, transparent 22%, rgba(12,5,7,0.55) 68%, rgba(9,4,5,0.94) 100%)", opacity: shade, transition: SLOW }} />
      <div className="absolute inset-0" style={{ boxShadow: `inset 0 0 ${120 + room.vignette * 90}px ${24 + room.vignette * 44}px rgba(12,6,8,0.9)`, transition: "box-shadow 2200ms cubic-bezier(0.4, 0, 0.2, 1)" }} />

      {/* rose petals, few and very slow */}
      {PETALS.map(([left, delay, dur, size, drift, opacity], i) => (
        <Petal key={i} left={left} delay={delay} dur={dur} size={size} drift={drift} opacity={opacity} paused={paused} />
      ))}

      {room.rules.map((top, i) => (
        <Rule key={i} top={top} width={room.ruleW} opacity={0.1 + (i === 0 ? 0.07 : 0)} />
      ))}
      <Seal opacity={room.seal} />
      <Ghosts opacity={room.frames * 0.5} />
      {room.margin > 0 && (
        <div className="absolute left-[12%] top-[12%] bottom-[12%]" style={{ width: 1, background: "linear-gradient(180deg, transparent, rgba(244,230,228,0.24) 30%, rgba(244,230,228,0.24) 70%, transparent)", opacity: room.margin, transition: SLOW }} />
      )}

      {/* low candle wash, breathing very slowly */}
      <div className="absolute" style={{ left: "8%", bottom: "10%", width: "46vw", height: "26vh", background: "radial-gradient(60% 60% at 50% 60%, rgba(201,112,122,0.3) 0%, transparent 70%)", filter: "blur(18px)", "--b": String(0.34 + room.glow * 0.4), opacity: 0.34 + room.glow * 0.4, transition: SLOW, ...(paused ? {} : { animation: "rg-lift 15s ease-in-out infinite" }) } as CSSVars} />
    </div>
  );
}
