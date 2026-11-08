"use client";

import type { CSSProperties } from "react";
import type { ThemeSkinProps } from "@/themes/types";

type Vars = CSSProperties & Record<`--${string}`, string | number>;
const cv = (d: CSSProperties & Record<`--${string}`, string | number>): Vars => d as Vars;

const scatter = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const STARS = Array.from({ length: 58 }, (_, i) => ({
  x: scatter(i + 1) * 100,
  y: scatter(i + 61) * 94,
  s: 1.4 + scatter(i + 7) * 2.6,
  delay: scatter(i + 13) * 7,
  dur: 3.4 + scatter(i + 19) * 4.4,
  spark: scatter(i + 29) > 0.84,
}));

const SHAPES: Record<"dipper" | "swan" | "signature" | "crown" | "heart", number[][]> = {
  dipper: [[8, 30], [30, 46], [48, 38], [66, 56], [88, 46]],
  swan: [[10, 68], [30, 44], [52, 26], [72, 44], [90, 68]],
  signature: [[6, 72], [24, 46], [42, 66], [60, 36], [78, 58], [94, 32]],
  crown: [[14, 62], [28, 32], [46, 52], [62, 26], [84, 56]],
  heart: [[30, 28], [16, 42], [22, 64], [50, 84], [78, 64], [84, 42], [70, 28], [50, 42], [30, 28]],
};

function StarField({ count, paused }: { count: number; paused: boolean }) {
  return (
    <div className="absolute inset-0">
      {STARS.slice(0, count).map((star, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            // Rounded: SSR serialises floats to 5dp and would otherwise
            // hydrate with different values than the client.
            left: `${star.x.toFixed(3)}%`,
            top: `${star.y.toFixed(3)}%`,
            width: `${star.s.toFixed(2)}px`,
            height: `${star.s.toFixed(2)}px`,
            background: star.spark ? "var(--t-accent)" : "rgba(238, 241, 255, 0.92)",
            borderRadius: star.spark ? 0 : "50%",
            clipPath: star.spark ? "polygon(50% 0, 58% 42%, 100% 50%, 58% 58%, 50% 100%, 42% 58%, 0 50%, 42% 42%)" : undefined,
            ...(paused
              ? { animation: "none", opacity: star.spark ? 0.85 : 0.6 }
              : cv({ animation: `cc-twinkle ${star.dur.toFixed(2)}s ease-in-out ${star.delay.toFixed(2)}s infinite` })),
          }}
        />
      ))}
    </div>
  );
}

function Aurora({ paused }: { paused: boolean }) {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0" style={{ transform: "rotate(-12deg)" }}>
        <div
          className="absolute -left-[16%] -top-[18%] h-[72vh] w-[92vw] rounded-full blur-3xl"
          style={{
            background: "linear-gradient(108deg, rgba(143, 166, 255, 0.36), rgba(169, 139, 255, 0.2) 48%, transparent 76%)",
            ...(paused ? { animation: "none", opacity: 0.6 } : cv({ animation: "mnt-aurora 28s ease-in-out infinite" })),
          }}
        />
      </div>
      <div className="absolute inset-0" style={{ transform: "rotate(9deg)" }}>
        <div
          className="absolute -right-[18%] top-[24%] h-[40vh] w-[74vw] rounded-full blur-3xl"
          style={{
            background: "linear-gradient(260deg, rgba(110, 91, 214, 0.34), transparent 70%)",
            ...(paused ? { animation: "none", opacity: 0.45 } : cv({ animation: "mnt-aurora 34s ease-in-out 4s infinite reverse" })),
          }}
        />
      </div>
    </div>
  );
}

function Moon({ left, top, size }: { left: string; top: string; size: number }) {
  return (
    <div className="absolute" style={{ left, top, width: size, height: size }}>
      <div className="absolute inset-[-70%] rounded-full blur-2xl" style={{ background: "radial-gradient(closest-side, rgba(245, 217, 139, 0.34), transparent 72%)" }} />
      <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 36% 30%, #fffaeb 0%, #f5d98b 48%, #cfa95c 100%)", boxShadow: "0 0 52px rgba(245, 217, 139, 0.34)" }} />
      <div className="absolute left-[24%] top-[30%] h-[18%] w-[18%] rounded-full" style={{ background: "rgba(196, 160, 92, 0.45)" }} />
      <div className="absolute left-[56%] top-[54%] h-[13%] w-[13%] rounded-full" style={{ background: "rgba(196, 160, 92, 0.38)" }} />
      <div className="absolute left-[36%] top-[66%] h-[9%] w-[9%] rounded-full" style={{ background: "rgba(196, 160, 92, 0.36)" }} />
    </div>
  );
}

function Constellation({ shape, paused, className }: { shape: number[][]; paused: boolean; className: string }) {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={`absolute ${className}`} fill="none">
      <polyline points={shape.map(([x, y]) => `${x},${y}`).join(" ")} stroke="var(--t-primary)" strokeWidth="0.7" strokeLinejoin="round" strokeOpacity="0.55" vectorEffect="non-scaling-stroke" />
      {shape.map(([x, y], i) => (
        <circle
          key={`${x}-${y}-${i}`}
          cx={x}
          cy={y}
          r={i === 0 ? 1.1 : 0.8}
          fill="var(--t-accent)"
          style={paused ? { opacity: 0.8 } : cv({ animation: `cc-twinkle ${5 + (i % 3)}s ease-in-out ${i * 0.35}s infinite` })}
        />
      ))}
    </svg>
  );
}

function ShootingStar({ paused, top, delay }: { paused: boolean; top: string; delay: number }) {
  return (
    <div className="absolute left-[-18vw] h-[2px] w-[24vw]" style={{ top, ...(paused ? { animation: "none", opacity: 0.22, transform: "translate3d(46vw, 18vh, 0) rotate(16deg)" } : cv({ animation: `mnt-shoot 16s linear ${delay}s infinite`, opacity: 0 })) }}>
      <div className="h-full w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(245, 217, 139, 0.85), #fff8e2)" }} />
    </div>
  );
}

function MidnightEnvelope({ paused }: { paused: boolean }) {
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: "min(78vw, 440px)", aspectRatio: "1.5 / 1" }}>
      <div className="absolute inset-0 rounded-[3px]" style={{ background: "linear-gradient(172deg, var(--t-surface) 0%, var(--t-surface-alt) 100%)", boxShadow: "0 0 0 1px rgba(143, 166, 255, 0.32), 0 34px 64px -38px #000" }} />
      <div className="absolute inset-x-0 top-0 h-[56%]" style={{ background: "linear-gradient(180deg, rgba(143, 166, 255, 0.22), rgba(14, 18, 48, 0.92))", clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
      <svg viewBox="0 0 300 200" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" fill="none">
        <path d="M0 200L112 104M300 200L188 104" stroke="rgba(143, 166, 255, 0.3)" strokeWidth="1.1" />
      </svg>
      <div className="absolute left-1/2 top-[54%] h-[66px] w-[66px] -translate-x-1/2 -translate-y-1/2">
        <div className="h-full w-full rounded-full" style={{ background: "radial-gradient(circle at 36% 30%, #fffaeb, var(--t-accent) 58%, #b8933f 100%)", boxShadow: "0 0 30px rgba(245, 217, 139, 0.4)", ...(paused ? { animation: "none" } : cv({ animation: "cc-breathe 8s ease-in-out infinite", transformOrigin: "center" })) }} />
      </div>
    </div>
  );
}

export default function Skin({ sceneId, paused = false, className }: ThemeSkinProps) {
  const scene = sceneId ?? "opening";
  const opening = scene === "opening";
  const letter = scene === "letter";
  const sealed = scene === "envelope";
  const memory = scene === "memory";
  const closing = scene === "closing";
  const answering = scene === "response";
  const quiet = !opening && !letter && !sealed && !memory && !closing && !answering;
  const starCount = letter || closing ? 22 : memory ? 50 : opening ? 58 : 40;

  return (
    <div className={["pointer-events-none absolute inset-0 overflow-hidden", className].filter(Boolean).join(" ")} aria-hidden>
      <style>{`
        @keyframes mnt-aurora {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.5; }
          50% { transform: translate3d(3%, -2.5%, 0) scale(1.08); opacity: 0.82; }
        }
        @keyframes mnt-shoot {
          0% { transform: translate3d(0, 0, 0) rotate(16deg); opacity: 0; }
          5% { opacity: 1; }
          20% { opacity: 0; }
          100% { transform: translate3d(122vw, 54vh, 0) rotate(16deg); opacity: 0; }
        }
      `}</style>
      <div className="absolute inset-0" style={{ background: "var(--t-bg)" }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(132% 104% at 50% 114%, var(--t-bg-alt) 0%, var(--t-bg) 58%, #070a1c 100%)" }} />
      {(opening || quiet || memory || closing) && <Aurora paused={paused} />}
      <div className="absolute inset-x-0 bottom-0 h-[38vh]" style={{ background: "radial-gradient(124% 100% at 50% 132%, rgba(143, 166, 255, 0.34), rgba(169, 139, 255, 0.12) 46%, transparent 74%)", opacity: closing ? 1.15 : 0.85 }} />
      <StarField count={starCount} paused={paused} />
      {(opening || quiet || sealed || memory) && <Moon left={sealed ? "8%" : "68%"} top={sealed ? "16%" : "9%"} size={sealed ? 88 : 128} />}
      {(opening || quiet) && (
        <Constellation shape={SHAPES.dipper} paused={paused} className="left-[6%] top-[14%] h-[34vh] w-[46vw]" />
      )}
      {letter && <Constellation shape={SHAPES.signature} paused={paused} className="inset-x-[8%] top-[10%] h-[26vh] w-[84%]" />}
      {sealed && <Constellation shape={SHAPES.crown} paused={paused} className="inset-x-[14%] top-[8%] h-[25vh] w-[72%]" />}
      {memory && <Constellation shape={SHAPES.swan} paused={paused} className="inset-x-[10%] top-[6%] h-[30vh] w-[80%]" />}
      {answering && <Constellation shape={SHAPES.heart} paused={paused} className="left-1/2 top-[38%] h-[42vh] w-[62vw] -translate-x-1/2 -translate-y-1/2" />}
      {letter && (
        <>
          <div
            className="absolute left-1/2 top-1/2 h-[64vh] w-[76vw] -translate-x-1/2 -translate-y-1/2 rounded-[48px]"
            style={{ background: "radial-gradient(closest-side, rgba(143, 166, 255, 0.2), transparent 78%)" }}
          />
          <div className="absolute inset-x-[18%] top-[78%] h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(143, 166, 255, 0.5), transparent)" }} />
        </>
      )}
      {sealed && <MidnightEnvelope paused={paused} />}
      {(memory || closing) && (
        <>
          <ShootingStar paused={paused} top="16%" delay={2.5} />
          <ShootingStar paused={paused} top="34%" delay={9.5} />
        </>
      )}
      {answering && (
        <div className="absolute left-1/2 top-[58%] h-[52vh] w-[52vh] -translate-x-1/2 -translate-y-1/2 rounded-full">
          <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(closest-side, rgba(245, 217, 139, 0.22), transparent 74%)" }} />
          <div className="absolute inset-[16%] rounded-full border" style={{ borderColor: "rgba(245, 217, 139, 0.28)" }} />
        </div>
      )}
      {closing && (
        <div className="absolute inset-x-0 bottom-0 h-[26vh]" style={{ background: "linear-gradient(180deg, transparent, rgba(20, 26, 61, 0.85))" }} />
      )}
      <div className="absolute inset-0" style={{ background: "radial-gradient(120% 92% at 50% 46%, transparent 42%, rgba(5, 7, 22, 0.78) 100%)" }} />
    </div>
  );
}
