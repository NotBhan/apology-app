"use client";

import type { CSSProperties } from "react";
import type { ThemeSkinProps } from "@/themes/types";

type CSSVars = CSSProperties & { [key: `--${string}`]: string };
type Fill = "pink" | "blush" | "peach" | "mint" | "cream";
type Spot = { x: number; y: number; w: number; h: number; fill: Fill; r: number };
type Glint = { x: number; y: number; size: number; delay: number; tone?: string };

const FILL: Record<Fill, string> = {
  pink: "radial-gradient(120% 120% at 30% 24%, #ffd0e5 0%, #ffa8cd 55%, #ff8ec1 100%)",
  blush: "radial-gradient(120% 120% at 30% 24%, #ffe6ef 0%, #ffc9dd 58%, #ffb6d2 100%)",
  peach: "radial-gradient(120% 120% at 30% 24%, #ffe8cf 0%, #ffd0a5 58%, #ffbb84 100%)",
  mint: "radial-gradient(120% 120% at 30% 24%, #e2f9f0 0%, #c3f0e0 58%, #a6e7d2 100%)",
  cream: "radial-gradient(120% 120% at 30% 24%, #fffdf7 0%, #fff3e2 58%, #ffe7cb 100%)",
};

const PILLS: Array<[x: number, w: number, delay: number, dur: number, fill: Fill, drift: number]> = [
  [6, 34, 0, 19, "blush", -14], [21, 18, 3.4, 23, "mint", 10], [35, 44, 6.8, 16, "cream", -8],
  [49, 22, 1.6, 25, "peach", 18], [62, 52, 9.2, 21, "blush", -20], [76, 28, 5.1, 27, "mint", 12],
  [88, 20, 11.4, 18, "cream", -10], [68, 16, 13.8, 29, "peach", 14],
];

const KEYFRAMES = `
@keyframes cq-wobble { 0%,100% { transform: rotate(calc(var(--r,0deg) - 2.4deg)) scale(1); } 50% { transform: rotate(calc(var(--r,0deg) + 2.4deg)) scale(1.02); } }
@keyframes cq-bob { 0%,100% { transform: translateY(0) rotate(var(--r,0deg)); } 50% { transform: translateY(-9px) rotate(var(--r,0deg)); } }
@keyframes cq-candy { from { background-position: 0 0; } to { background-position: 72px 0; } }`;

function place(x: number, y: number, r: number, paused: boolean | undefined, animation: string): CSSVars {
  const style: CSSVars = { left: `${x}%`, top: `${y}%`, "--r": `${r}deg` };
  if (paused) style.transform = `rotate(${r}deg)`;
  else style.animation = animation;
  return style;
}

function Blob({ x, y, w, h, fill, r = 0, blur = 0 }: Spot & { blur?: number }) {
  const blob = { left: `${x}%`, top: `${y}%`, width: `${w}vw`, height: `${h}vw`, background: FILL[fill], transform: `rotate(${r}deg)`, filter: blur ? `blur(${blur}px)` : undefined, borderRadius: "56% 44% 40% 60% / 46% 56% 44% 54%", boxShadow: "0 44px 84px -34px rgba(196,43,114,0.44)" };
  return <div className="absolute" style={blob} />;
}

function Sparkle({ x, y, size, delay, paused, tone = "#fff8fc" }: Glint & { paused?: boolean }) {
  const spin = place(x, y, 0, paused, `cc-twinkle ${3 + (delay % 2)}s ease-in-out ${delay}s infinite`);
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className="absolute" style={spin}>
      <path d="M12 0 14.6 9.4 24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6Z" fill={tone} stroke="rgba(196,43,114,0.14)" strokeWidth="0.7" />
    </svg>
  );
}

function Heart({ x, y, size, r, paused }: { x: number; y: number; size: number; r: number; paused?: boolean }) {
  const beat = place(x, y, r, paused, "cq-wobble 7s ease-in-out infinite");
  return (
    <svg viewBox="0 0 32 30" width={size} height={size * 0.94} className="absolute" style={beat}>
      <path d="M16 28C10.4 24 2 18.2 2 10.9 2 6 5.6 2.6 9.8 2.6c2.8 0 5 1.4 6.2 3.1 1.2-1.7 3.4-3.1 6.2-3.1 4.2 0 7.8 3.4 7.8 8.3C30 18.2 21.6 24 16 28Z" fill="#ff9ec4" stroke="#fff6fb" strokeWidth="1.4" />
    </svg>
  );
}

function Bubble({ x, y, w, h, r, paused }: { x: number; y: number; w: number; h: number; r: number; paused?: boolean }) {
  return (
    <div className="absolute" style={{ left: `${x}%`, top: `${y}%`, width: `${w}vw`, height: `${h}vw`, transform: `rotate(${r}deg)` }}>
      <div className="absolute inset-0" style={{ background: FILL.cream, borderRadius: 999, boxShadow: "0 34px 64px -30px rgba(196,43,114,0.46), inset 0 -9px 0 rgba(255,255,255,0.42)", ...(paused ? {} : { animation: "cq-wobble 7.5s ease-in-out infinite" }) }} />
      <div className="absolute" style={{ left: "15%", bottom: "-19%", width: "34%", height: "32%", background: FILL.cream, clipPath: "polygon(0 0, 100% 0, 12% 100%)" }} />
    </div>
  );
}

function NoteCard({ paused }: { paused?: boolean }) {
  const lift: CSSVars = { left: "50%", top: "20%", width: "min(58vw,318px)", height: "min(64vw,352px)", marginLeft: "calc(min(58vw,318px) * -0.5)", "--r": "-3deg" };
  if (paused) lift.transform = "rotate(-3deg)";
  else lift.animation = "cq-bob 9s ease-in-out infinite";
  return (
    <div className="absolute" style={lift}>
      <div className="absolute inset-0" style={{ background: "#fffafd", borderRadius: 36, border: "3px solid #ffd6e8", boxShadow: "0 46px 78px -38px rgba(196,43,114,0.5)" }} />
      <div className="absolute" style={{ left: "50%", top: -13, width: 96, height: 26, marginLeft: -48, transform: "rotate(-7deg)", borderRadius: 8, background: "linear-gradient(90deg,#ffe2c4,#ffd0a8)" }} />
      {[0, 1, 2, 3, 4].map((i) => <div key={i} className="absolute" style={{ left: 30, right: 30, top: `${24 + i * 16}%`, height: 8, borderRadius: 999, background: i === 4 ? "rgba(255,158,196,0.44)" : "rgba(255,158,196,0.24)" }} />)}
      <div className="absolute" style={{ right: 26, bottom: 24, width: 34, height: 34, borderRadius: 12, background: FILL.pink }} />
    </div>
  );
}

function BlushEnvelope({ paused }: { paused?: boolean }) {
  return (
    <div className="absolute" style={{ left: "50%", bottom: "13%", width: "min(64vw,360px)", height: "min(41vw,232px)", marginLeft: "calc(min(64vw,360px) * -0.5)", transform: "rotate(2deg)" }}>
      <div className="absolute inset-0" style={{ background: "linear-gradient(160deg,#ffe9f1,#ffd3e3)", borderRadius: 26, border: "3px solid #ffc0d8", boxShadow: "0 40px 70px -34px rgba(196,43,114,0.5)", ...(paused ? {} : { animation: "cq-wobble 9s ease-in-out infinite" }) }} />
      <div className="absolute inset-x-0 top-0" style={{ height: "66%", background: "linear-gradient(180deg,#ffe1ec,#ffcadd)", borderRadius: "24px 24px 0 0", clipPath: "polygon(0 0,100% 0,50% 100%)" }} />
      <div className="absolute" style={{ left: "50%", top: "56%", width: 46, height: 46, marginLeft: -23, borderRadius: 999, background: FILL.pink, boxShadow: "0 8px 18px -8px rgba(196,43,114,0.7)" }} />
    </div>
  );
}

function Frames() {
  return (
    <>
      {[{ x: 3, y: 22, r: -8 }, { x: 33, y: 14, r: 4 }, { x: 64, y: 26, r: 9 }].map((f, i) => (
        <div key={i} className="absolute" style={{ left: `${f.x}%`, top: `${f.y}%`, width: "31vw", height: "37vw", transform: `rotate(${f.r}deg)`, background: "#fffafd", borderRadius: 28, border: "3px solid #ffe1ee", boxShadow: "0 34px 60px -32px rgba(196,43,114,0.42)" }}>
          <div className="absolute inset-[9%]" style={{ borderRadius: 20, background: FILL[(["mint", "peach", "blush"] as Fill[])[i]] }} />
        </div>
      ))}
    </>
  );
}

function Stage({ scene, paused }: { scene: string; paused?: boolean }) {
  switch (scene) {
    case "opening":
      return [
        <Bubble key="bubble" x={44} y={7} w={46} h={18} r={-4} paused={paused} />,
        <Blob key="blob" x={-6} y={58} w={28} h={24} fill="mint" r={12} />,
        <Heart key="heart" x={70} y={64} size={96} r={-10} paused={paused} />,
        <Sparkle key="s1" x={10} y={16} size={30} delay={0.2} paused={paused} />,
        <Sparkle key="s2" x={30} y={42} size={18} delay={1.4} paused={paused} tone="#ffc06b" />,
        <Sparkle key="s3" x={90} y={28} size={24} delay={2.2} paused={paused} />,
      ];
    case "letter":
      return [
        <NoteCard key="note" paused={paused} />,
        <Blob key="b1" x={-10} y={4} w={26} h={22} fill="peach" r={-8} />,
        <Blob key="b2" x={84} y={10} w={22} h={20} fill="mint" r={14} />,
        <Sparkle key="s1" x={8} y={26} size={22} delay={0.6} paused={paused} />,
        <Sparkle key="s2" x={92} y={40} size={26} delay={1.9} paused={paused} />,
      ];
    case "envelope":
      return [
        <BlushEnvelope key="env" paused={paused} />,
        <Blob key="b1" x={-8} y={6} w={30} h={24} fill="blush" r={-10} />,
        <Blob key="b2" x={82} y={2} w={28} h={24} fill="cream" r={8} />,
        <Sparkle key="s1" x={14} y={30} size={26} delay={0.4} paused={paused} />,
        <Sparkle key="s2" x={86} y={34} size={20} delay={2.4} paused={paused} tone="#ffc06b" />,
      ];
    case "memory":
      return [
        <Frames key="frames" />,
        <Sparkle key="s1" x={6} y={8} size={20} delay={1.1} paused={paused} />,
        <Sparkle key="s2" x={88} y={16} size={26} delay={2.8} paused={paused} />,
        <Blob key="blob" x={-8} y={64} w={20} h={18} fill="peach" r={-6} />,
      ];
    case "closing":
      return [
        <Heart key="h1" x={12} y={24} size={72} r={12} paused={paused} />,
        <Heart key="h2" x={72} y={18} size={104} r={-8} paused={paused} />,
        <Blob key="blob" x={34} y={54} w={34} h={28} fill="cream" r={-6} />,
        <Sparkle key="s1" x={28} y={14} size={22} delay={0.8} paused={paused} />,
        <Sparkle key="s2" x={90} y={54} size={20} delay={3.3} paused={paused} />,
      ];
    case "response":
      return [
        <Bubble key="bubble" x={10} y={16} w={64} h={26} r={3} paused={paused} />,
        <Sparkle key="s1" x={84} y={20} size={26} delay={0.3} paused={paused} />,
        <Sparkle key="s2" x={8} y={56} size={18} delay={1.7} paused={paused} tone="#ffc06b" />,
        <Heart key="heart" x={72} y={62} size={64} r={9} paused={paused} />,
        <Blob key="blob" x={-6} y={70} w={22} h={18} fill="mint" r={-12} />,
      ];
    case "hurt":
      return [
        <Blob key="b1" x={6} y={54} w={30} h={26} fill="blush" r={-9} blur={1} />,
        <Blob key="b2" x={64} y={58} w={26} h={22} fill="cream" r={12} />,
        <Sparkle key="s1" x={20} y={22} size={14} delay={0.9} paused={paused} tone="#ffd0e5" />,
      ];
    case "meaning":
      return [
        <Heart key="heart" x={12} y={32} size={112} r={-12} paused={paused} />,
        <Blob key="blob" x={70} y={50} w={32} h={26} fill="peach" r={8} />,
        <Sparkle key="s1" x={26} y={12} size={24} delay={0.5} paused={paused} />,
        <Sparkle key="s2" x={80} y={20} size={18} delay={2.6} paused={paused} tone="#ffc06b" />,
      ];
    case "sorry":
      return [
        <Bubble key="bubble" x={58} y={12} w={36} h={15} r={5} paused={paused} />,
        <Blob key="b1" x={-4} y={62} w={26} h={22} fill="blush" r={-10} />,
        <Sparkle key="s1" x={16} y={28} size={18} delay={1.2} paused={paused} />,
        <Sparkle key="s2" x={90} y={44} size={22} delay={2.9} paused={paused} />,
      ];
    default:
      return [
        <Blob key="blob" x={4} y={20} w={26} h={22} fill="cream" r={-6} />,
        <Sparkle key="s1" x={78} y={24} size={22} delay={0.7} paused={paused} />,
        <Heart key="heart" x={58} y={56} size={72} r={6} paused={paused} />,
      ];
  }
}

export default function Skin({ sceneId, paused, className }: ThemeSkinProps) {
  const scene = sceneId ?? "opening";
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className ?? ""}`} aria-hidden data-scene={scene}>
      <style>{KEYFRAMES}</style>
      <div className="absolute inset-0" style={{ background: "radial-gradient(120% 92% at 14% 0%, #ffe3ef 0%, rgba(255,227,239,0) 62%), radial-gradient(100% 82% at 88% 104%, #ffe8d4 0%, rgba(255,232,212,0) 60%), linear-gradient(180deg,#fff2f8 0%,#fff0f6 100%)" }} />

      <Blob x={-10} y={-9} w={40} h={32} fill="blush" r={-8} blur={1} />
      <Blob x={68} y={-14} w={44} h={34} fill="cream" r={10} />
      <Blob x={81} y={52} w={30} h={26} fill="pink" r={-14} blur={2} />

      <Stage scene={scene} paused={paused} />

      <div className="absolute inset-x-0 bottom-0 h-[10vh] opacity-75" style={{ backgroundImage: "repeating-linear-gradient(115deg, rgba(255,158,196,0.55) 0 16px, rgba(255,255,255,0.62) 16px 32px)", maskImage: "linear-gradient(to top,#000 12%,transparent)", WebkitMaskImage: "linear-gradient(to top,#000 12%,transparent)", ...(paused ? {} : { animation: "cq-candy 6s linear infinite" }) }} />
      <div className="absolute inset-x-0 bottom-[9vh] h-[26px] opacity-80" style={{ backgroundImage: "radial-gradient(circle at 13px 26px, #ffc9dd 0 13px, transparent 13px)", backgroundSize: "26px 26px", backgroundRepeat: "repeat-x" }} />

      {!paused && PILLS.map(([x, w, delay, dur, fill, drift], i) => (
        <div key={i} className="absolute" style={{ left: `${x}%`, bottom: "-6%", width: w, height: w * 0.86, borderRadius: 999, background: FILL[fill], opacity: 0.8, "--dx": `${drift}px`, "--o": "0.7", animation: `cc-rise ${dur}s linear ${delay}s infinite` } as CSSVars} />
      ))}

      <div className="absolute inset-x-0 bottom-0 h-[42vh]" style={{ background: "linear-gradient(to top, rgba(196,43,114,0.10), transparent)" }} />
    </div>
  );
}
