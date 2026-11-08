"use client";

import type { CSSProperties } from "react";
import type { ThemeSkinProps } from "@/themes/types";

type CSSVars = CSSProperties & { [key: `--${string}`]: string };
type Mark = "circle" | "dot" | "square" | "diamond" | "window";

/** The whole theme is this table: where the two rules sit and which lone mark is drawn. */
type Quiet = {
  rules: [number, number];
  width: number;
  mark: Mark;
  markX: number;
  markY: number;
  markSize: number;
  ticks: number;
  margin: number;
  baseline: number;
  shade: number;
};

const QUIET: Record<string, Quiet> = {
  opening: { rules: [30, 68], width: 54, mark: "circle", markX: 50, markY: 49, markSize: 28, ticks: 0.5, margin: 0.35, baseline: 0, shade: 0.34 },
  hurt: { rules: [34, 62], width: 44, mark: "dot", markX: 50, markY: 48, markSize: 5, ticks: 0.3, margin: 0.2, baseline: 0, shade: 0.5 },
  meaning: { rules: [28, 66], width: 60, mark: "diamond", markX: 50, markY: 47, markSize: 15, ticks: 0.45, margin: 0.3, baseline: 0, shade: 0.34 },
  sorry: { rules: [36, 60], width: 38, mark: "square", markX: 50, markY: 48, markSize: 11, ticks: 0.25, margin: 0.2, baseline: 0, shade: 0.54 },
  memory: { rules: [32, 64], width: 48, mark: "diamond", markX: 50, markY: 47, markSize: 12, ticks: 0.42, margin: 0.34, baseline: 0, shade: 0.3 },
  letter: { rules: [18, 84], width: 56, mark: "dot", markX: 15, markY: 46, markSize: 4, ticks: 0.4, margin: 0.55, baseline: 1, shade: 0.26 },
  envelope: { rules: [24, 78], width: 46, mark: "window", markX: 50, markY: 51, markSize: 22, ticks: 0.5, margin: 0.4, baseline: 0, shade: 0.38 },
  closing: { rules: [26, 70], width: 62, mark: "circle", markX: 50, markY: 48, markSize: 36, ticks: 0.35, margin: 0.3, baseline: 0, shade: 0.28 },
  response: { rules: [38, 58], width: 40, mark: "dot", markX: 50, markY: 48, markSize: 6, ticks: 0.3, margin: 0.25, baseline: 0, shade: 0.44 },
};

const GOLD = "#a9853a";
const INK = "rgba(26,25,23,0.5)";
const EASE = "opacity 1500ms cubic-bezier(0.33,1,0.68,1), transform 1500ms cubic-bezier(0.33,1,0.68,1)";

const CORNERS: Array<{ style: CSSProperties; edges: "tl" | "tr" | "bl" | "br" }> = [
  { edges: "tl", style: { left: 22, top: 22, borderTop: `1px solid ${INK}`, borderLeft: `1px solid ${INK}` } },
  { edges: "tr", style: { right: 22, top: 22, borderTop: `1px solid ${INK}`, borderRight: `1px solid ${INK}` } },
  { edges: "bl", style: { left: 22, bottom: 22, borderBottom: `1px solid ${INK}`, borderLeft: `1px solid ${INK}` } },
  { edges: "br", style: { right: 22, bottom: 22, borderBottom: `1px solid ${INK}`, borderRight: `1px solid ${INK}` } },
];

const KEYFRAMES = `@keyframes mn-breathe { 0%,100% { opacity: .34; transform: scale(1); } 50% { opacity: .5; transform: scale(1.04); } }`;

function GoldRule({ top, width }: { top: number; width: number }) {
  return (
    <div
      className="absolute left-1/2"
      style={{ top: `${top}%`, width: `${width}%`, height: 1, marginLeft: `-${width / 2}%`, background: `linear-gradient(90deg, transparent 0%, ${GOLD} 24%, ${GOLD} 76%, transparent 100%)`, opacity: 0.62, transition: EASE }}
    />
  );
}

function SpacerRule({ top, width }: { top: number; width: number }) {
  return (
    <div
      className="absolute left-1/2"
      style={{ top: `${top}%`, width, height: 1, marginLeft: -width / 2, background: GOLD, opacity: 0.32, transition: EASE }}
    />
  );
}

function LoneMark({ shape, x, y, size }: { shape: Mark; x: number; y: number; size: number }) {
  const base: CSSProperties = {
    left: `${x}%`,
    top: `${y}%`,
    width: size,
    height: shape === "window" ? size * 1.32 : size,
    marginLeft: -size / 2,
    marginTop: shape === "window" ? -size * 0.66 : -size / 2,
    border: `1px solid ${GOLD}`,
    transition: EASE,
  };
  if (shape === "circle") return <div className="absolute rounded-full" style={base} />;
  if (shape === "dot") return <div className="absolute rounded-full" style={{ ...base, border: "none", background: GOLD }} />;
  if (shape === "square") return <div className="absolute" style={base} />;
  if (shape === "diamond") return <div className="absolute" style={{ ...base, transform: "rotate(45deg)" }} />;
  return (
    <div className="absolute" style={base}>
      <div className="absolute inset-[5px]" style={{ border: `1px solid ${GOLD}`, opacity: 0.45 }} />
      <div className="absolute left-1/2 top-0 h-full" style={{ width: 1, marginLeft: -0.5, background: GOLD, opacity: 0.28 }} />
    </div>
  );
}

export default function Skin({ sceneId, paused, className }: ThemeSkinProps) {
  const scene = sceneId ?? "opening";
  const quiet = QUIET[scene] ?? QUIET.opening;
  const glow: CSSVars = { transition: EASE, opacity: 0.42 };
  if (!paused) glow.animation = "mn-breathe 22s ease-in-out infinite";

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className ?? ""}`} aria-hidden data-scene={scene}>
      <style>{KEYFRAMES}</style>

      {/* paper, and almost nothing on it */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(132% 92% at 50% -14%, #fffdf9 0%, #fbf8f2 56%, #f2ecdf 100%)" }} />
      <div className="absolute left-1/2 top-[6%]" style={{ width: "min(120vw,780px)", height: "min(90vh,720px)", marginLeft: "calc(min(120vw,780px) * -0.5)", background: `radial-gradient(closest-side, rgba(255,253,246,0.85) 0%, rgba(255,253,246,0) 72%)`, ...glow }} />

      <div className="absolute inset-x-0 bottom-0 h-[22vh]" style={{ background: "linear-gradient(to top, rgba(228,220,203,0.55), transparent)", opacity: quiet.shade }} />

      <GoldRule top={quiet.rules[0]} width={quiet.width} />
      <GoldRule top={quiet.rules[1]} width={quiet.width} />
      <SpacerRule top={quiet.rules[0] - 3.4} width={30} />
      <SpacerRule top={quiet.rules[1] + 3.4} width={30} />

      <LoneMark shape={quiet.mark} x={quiet.markX} y={quiet.markY} size={quiet.markSize} />

      <div className="absolute" style={{ left: "12%", top: "12%", bottom: "12%", width: 1, background: `linear-gradient(180deg, transparent, ${GOLD} 18%, ${GOLD} 82%, transparent)`, opacity: quiet.margin, transition: EASE }} />

      {CORNERS.map((c) => (
        <div key={c.edges} className="absolute" style={{ ...c.style, width: 18, height: 18, opacity: quiet.ticks, transition: EASE }} />
      ))}

      {quiet.baseline > 0 && (
        <>
          <div className="absolute left-1/2" style={{ top: "78%", width: "34%", height: 1, marginLeft: "-17%", background: `linear-gradient(90deg, transparent, ${GOLD} 40%, ${GOLD} 100%)`, opacity: quiet.baseline * 0.55, transition: EASE }} />
          <div className="absolute left-1/2" style={{ top: "78%", width: 5, height: 5, marginLeft: -2.5, marginTop: -2, borderRadius: 9999, background: GOLD, opacity: quiet.baseline * 0.8, transition: EASE }} />
        </>
      )}

      <div className="absolute inset-x-0 top-0" style={{ height: "9vh", background: "linear-gradient(to bottom, rgba(255,253,249,0.9), transparent)" }} />
    </div>
  );
}
