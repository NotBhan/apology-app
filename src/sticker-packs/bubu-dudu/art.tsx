"use client";

import type { CharacterState } from "@/types/sticker";
import type { StickerArtProps, StickerPackArt } from "../types";

type CharacterProps = StickerArtProps & { state: CharacterState };

type Eye = "open" | "blink" | "happy" | "sad" | "closed" | "content" | "up";
type Mouth = "tiny" | "smile" | "grin" | "frown" | "wobble" | "o" | "flat";
type Tuft = "up" | "droop";
type Tone = "cream" | "brown";

interface Buddy {
  x: number;
  y: number;
  scale: number;
  tilt: number;
  headY: number;
  armL: string;
  armR: string;
  eye: Eye;
  mouth: Mouth;
  tuft: Tuft;
}

/** Kuri — the taller cream one, left of frame. */
const TALL: Buddy = {
  x: 72,
  y: 136,
  scale: 1,
  tilt: -1,
  headY: 0,
  armL: "M-21 -8 q-8 5 -7 15",
  armR: "M21 -8 q8 5 7 15",
  eye: "open",
  mouth: "tiny",
  tuft: "up",
};

/** Miso — the shorter warm-brown one, right of frame. */
const SHORT: Buddy = {
  x: 128,
  y: 142,
  scale: 0.84,
  tilt: 1,
  headY: 0,
  armL: "M-21 -8 q-8 5 -7 15",
  armR: "M21 -8 q8 5 7 15",
  eye: "open",
  mouth: "smile",
  tuft: "up",
};

const POSE: Record<CharacterState, { tall: Buddy; short: Buddy }> = {
  idle: { tall: TALL, short: SHORT },
  blink: {
    tall: { ...TALL, eye: "blink" },
    short: { ...SHORT, eye: "blink" },
  },
  happy: {
    tall: {
      ...TALL,
      y: 134,
      tilt: -4,
      armL: "M-21 -10 q-12 -4 -12 -16",
      armR: "M21 -10 q12 -4 12 -16",
      eye: "happy",
      mouth: "grin",
    },
    short: {
      ...SHORT,
      y: 140,
      tilt: 4,
      armL: "M-21 -10 q-12 -4 -12 -16",
      armR: "M21 -10 q12 -4 12 -16",
      eye: "happy",
      mouth: "grin",
    },
  },
  sad: {
    tall: {
      ...TALL,
      headY: 4,
      tilt: 3,
      armL: "M-21 -8 q-5 10 -13 12",
      armR: "M21 -8 q5 10 13 12",
      eye: "sad",
      mouth: "frown",
      tuft: "droop",
    },
    short: {
      ...SHORT,
      headY: 3,
      tilt: -3,
      armL: "M-21 -8 q-16 3 -21 -4",
      armR: "M21 -8 q5 10 13 12",
      eye: "sad",
      mouth: "frown",
    },
  },
  crying: {
    tall: {
      ...TALL,
      headY: 5,
      tilt: 4,
      armL: "M-20 -10 q-2 -12 8 -16",
      armR: "M20 -10 q2 -12 -8 -16",
      eye: "closed",
      mouth: "wobble",
      tuft: "droop",
    },
    short: {
      ...SHORT,
      headY: 4,
      tilt: -4,
      armL: "M-21 -8 q-18 -2 -21 -10",
      armR: "M21 -8 q4 10 12 12",
      eye: "closed",
      mouth: "wobble",
      tuft: "droop",
    },
  },
  hugging: {
    tall: {
      ...TALL,
      x: 78,
      y: 138,
      tilt: 11,
      headY: 2,
      armL: "M-21 -4 q-6 12 6 15",
      armR: "M21 -4 q15 2 20 -9",
      eye: "content",
      mouth: "smile",
    },
    short: {
      ...SHORT,
      x: 122,
      y: 143,
      tilt: -11,
      headY: 2,
      armL: "M-21 -4 q-15 2 -20 -9",
      armR: "M21 -4 q6 12 -6 15",
      eye: "content",
      mouth: "smile",
    },
  },
  apologizing: {
    tall: {
      ...TALL,
      x: 74,
      y: 140,
      tilt: 17,
      headY: 8,
      armL: "M-20 -6 q11 10 18 3",
      armR: "M20 -6 q-11 10 -18 3",
      eye: "closed",
      mouth: "tiny",
      tuft: "droop",
    },
    short: {
      ...SHORT,
      y: 141,
      tilt: -2,
      armL: "M-20 -6 q10 10 16 4",
      armR: "M20 -6 q-10 10 -16 4",
      eye: "open",
      mouth: "tiny",
    },
  },
  flowers: {
    tall: {
      ...TALL,
      headY: -1,
      tilt: -3,
      armL: "M-21 -6 q-6 10 -1 15",
      armR: "M21 -6 q10 14 17 18",
      eye: "happy",
      mouth: "smile",
    },
    short: {
      ...SHORT,
      tilt: 3,
      armL: "M-21 -6 q-12 12 -22 16",
      armR: "M21 -6 q6 10 1 15",
      eye: "happy",
      mouth: "smile",
    },
  },
  heart: {
    tall: {
      ...TALL,
      tilt: 5,
      headY: 1,
      armL: "M-21 -6 q-6 10 -1 15",
      armR: "M21 -6 q10 8 14 5",
      eye: "content",
      mouth: "smile",
    },
    short: {
      ...SHORT,
      tilt: -5,
      headY: 1,
      armL: "M-21 -6 q-10 8 -14 5",
      armR: "M21 -6 q6 10 1 15",
      eye: "content",
      mouth: "smile",
    },
  },
  hopeful: {
    tall: {
      ...TALL,
      y: 135,
      headY: -4,
      tilt: -2,
      armL: "M-21 -8 q-8 5 -7 15",
      armR: "M21 -10 q12 -6 12 -18",
      eye: "up",
      mouth: "tiny",
    },
    short: {
      ...SHORT,
      y: 141,
      headY: -4,
      tilt: 2,
      armL: "M-21 -8 q-8 5 -7 15",
      armR: "M21 -10 q10 -4 11 -14",
      eye: "up",
      mouth: "tiny",
    },
  },
  celebrate: {
    tall: {
      ...TALL,
      y: 133,
      tilt: -5,
      headY: -2,
      armL: "M-21 -10 q-13 -4 -13 -17",
      armR: "M21 -10 q13 -4 13 -17",
      eye: "happy",
      mouth: "o",
    },
    short: {
      ...SHORT,
      y: 139,
      tilt: 5,
      headY: -2,
      armL: "M-21 -10 q-13 -4 -13 -17",
      armR: "M21 -10 q13 -4 13 -17",
      eye: "happy",
      mouth: "o",
    },
  },
};

const CSS = `
.bubudu-breathe { animation: cc-breathe 5.2s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 98%; }
.bubudu-blink { animation: cc-blink 5.8s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 50%; }
.bubudu-blink-late { animation: cc-blink 5.8s ease-in-out 0.4s infinite; transform-box: fill-box; transform-origin: 50% 50%; }
.bubudu-settle { animation: bubudu-settle 760ms cubic-bezier(.22,1.1,.36,1) both; transform-box: fill-box; transform-origin: 50% 98%; }
.bubudu-sparkle { animation: bubudu-sparkle 1.1s ease-in-out 2 both; transform-box: fill-box; transform-origin: 50% 50%; }
@keyframes bubudu-settle { from { transform: translateY(-5px) scale(.982); opacity: .55 } to { transform: translateY(0) scale(1); opacity: 1 } }
@keyframes bubudu-sparkle { 0%, 100% { transform: scale(.82); opacity: .35 } 50% { transform: scale(1.05); opacity: 1 } }
@media (prefers-reduced-motion: reduce) { .bubudu-breathe, .bubudu-blink, .bubudu-blink-late, .bubudu-settle, .bubudu-sparkle { animation: none } }
`;

const TONES = {
  cream: {
    body: "url(#bubudu-cream-body)",
    head: "url(#bubudu-cream-head)",
    edge: "#cfb086",
    belly: "#fffbf2",
    foot: "#fff5df",
    arm: "#f3e0bd",
    tuft: "#dcc08d",
  },
  brown: {
    body: "url(#bubudu-brown-body)",
    head: "url(#bubudu-brown-head)",
    edge: "#8a5a33",
    belly: "#dcae7d",
    foot: "#cd9a66",
    arm: "#bd8653",
    tuft: "#83552f",
  },
} as const;

const INK = "#4a3221";

function Arms({ b, tone }: { b: Buddy; tone: Tone }) {
  const t = TONES[tone];
  return (
    <g transform={`translate(${b.x} ${b.y}) scale(${b.scale}) rotate(${b.tilt})`} fill="none" strokeLinecap="round">
      <path d={b.armL} stroke={t.edge} strokeWidth="12" opacity="0.45" />
      <path d={b.armL} stroke={t.arm} strokeWidth="9.4" />
      <path d={b.armR} stroke={t.edge} strokeWidth="12" opacity="0.45" />
      <path d={b.armR} stroke={t.arm} strokeWidth="9.4" />
    </g>
  );
}

function Face({ b, tears, eyeClass }: { b: Buddy; tears: boolean; eyeClass?: string }) {
  return (
    <g>
      {b.eye === "open" || b.eye === "up" || b.eye === "sad" ? (
        <g className={eyeClass}>
          <ellipse cx="-8.5" cy={b.eye === "up" ? -44.5 : -42} rx="3.6" ry="4.5" fill={INK} />
          <ellipse cx="8.5" cy={b.eye === "up" ? -44.5 : -42} rx="3.6" ry="4.5" fill={INK} />
          <circle cx="-7.2" cy={b.eye === "up" ? -46.2 : -43.8} r="1.4" fill="#fff" opacity="0.92" />
          <circle cx="9.8" cy={b.eye === "up" ? -46.2 : -43.8} r="1.4" fill="#fff" opacity="0.92" />
          {b.eye === "sad" && (
            <g fill="none" stroke="#7d5a3c" strokeWidth="1.9" strokeLinecap="round" opacity="0.8">
              <path d="M-13 -48.5 q5 -3 8 -1" />
              <path d="M13 -48.5 q-5 -3 -8 -1" />
            </g>
          )}
        </g>
      ) : null}

      {b.eye === "blink" && (
        <g className={eyeClass} fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round">
          <path d="M-11.5 -42 h6" />
          <path d="M5.5 -42 h6" />
        </g>
      )}

      {b.eye === "happy" && (
        <g className={eyeClass} fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round">
          <path d="M-12 -43 q3.5 -5 7 0" />
          <path d="M5 -43 q3.5 -5 7 0" />
        </g>
      )}

      {b.eye === "content" && (
        <g className={eyeClass} fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round">
          <path d="M-11.5 -43.5 q3 -4 6 0" />
          <path d="M5.5 -43.5 q3 -4 6 0" />
        </g>
      )}

      {b.eye === "closed" && (
        <g className={eyeClass} fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round">
          <path d="M-11.5 -42 q3 4.5 6 0" />
          <path d="M5.5 -42 q3 4.5 6 0" />
        </g>
      )}

      {/* cheeks */}
      <ellipse cx="-14" cy="-35" rx="5" ry="3.2" fill="#ee9f9b" opacity="0.6" />
      <ellipse cx="14" cy="-35" rx="5" ry="3.2" fill="#ee9f9b" opacity="0.6" />

      {/* mouth */}
      {b.mouth === "grin" && (
        <g>
          <path d="M-6 -32 q6 9 12 0 Z" fill="#8a4a3f" />
          <ellipse cx="0" cy="-27.5" rx="3.4" ry="2.2" fill="#ef8f92" />
        </g>
      )}
      {b.mouth === "o" && <ellipse cx="0" cy="-29" rx="3.4" ry="4.2" fill="#8a4a3f" />}
      {b.mouth === "smile" && (
        <path d="M-5 -31 q5 5 10 0" fill="none" stroke="#7d5a3c" strokeWidth="1.9" strokeLinecap="round" />
      )}
      {b.mouth === "frown" && (
        <path d="M-5 -29 q5 -5 10 0" fill="none" stroke="#7d5a3c" strokeWidth="1.9" strokeLinecap="round" />
      )}
      {b.mouth === "wobble" && (
        <path d="M-6 -30 q3 -3 6 0 q3 3 6 0" fill="none" stroke="#7d5a3c" strokeWidth="1.9" strokeLinecap="round" />
      )}
      {b.mouth === "tiny" && (
        <path d="M-3 -31 q3 3 6 0" fill="none" stroke="#7d5a3c" strokeWidth="1.9" strokeLinecap="round" />
      )}
      {b.mouth === "flat" && <path d="M-4 -31 h8" fill="none" stroke="#7d5a3c" strokeWidth="1.9" strokeLinecap="round" />}

      {tears && (
        <g fill="#9adcf2">
          <path transform="translate(-8.5 -30)" d="M0 0 C-3.4 6 -2.6 10 1 10 C4.6 10 4.6 6 0 0 Z" />
          <path transform="translate(8.5 -30)" d="M0 0 C-3.4 6 -2.6 10 1 10 C4.6 10 4.6 6 0 0 Z" />
        </g>
      )}
    </g>
  );
}

function Blob({ b, tone, eyeClass, tears }: { b: Buddy; tone: Tone; eyeClass?: string; tears: boolean }) {
  const t = TONES[tone];
  return (
    <g transform={`translate(${b.x} ${b.y}) scale(${b.scale}) rotate(${b.tilt})`}>
      <ellipse cx="-10" cy="24" rx="8.6" ry="5.6" fill={t.foot} stroke={t.edge} strokeWidth="1.4" />
      <ellipse cx="10" cy="24" rx="8.6" ry="5.6" fill={t.foot} stroke={t.edge} strokeWidth="1.4" />
      <ellipse cx="0" cy="0" rx="21" ry="24" fill={t.body} stroke={t.edge} strokeWidth="1.8" />
      <ellipse cx="0" cy="5" rx="12" ry="12.5" fill={t.belly} opacity="0.5" />
      <g transform={`translate(0 ${b.headY})`}>
        <circle cx="0" cy="-38" r="23" fill={t.head} stroke={t.edge} strokeWidth="1.8" />
        {/* topknot tuft */}
        {b.tuft === "up" ? (
          <g fill="none" stroke={t.tuft} strokeWidth="3.6" strokeLinecap="round">
            <path d="M-1 -60 q-3 -10 4 -13" />
            <path d="M1 -60 q6 -9 11 -4" />
          </g>
        ) : (
          <g fill="none" stroke={t.tuft} strokeWidth="3.6" strokeLinecap="round">
            <path d="M0 -60 q-6 -8 -1 -11 q6 -3 6 4" />
          </g>
        )}
        {/* little shine on the head */}
        <ellipse cx="-9" cy="-50" rx="6" ry="4" fill="#fff" opacity="0.18" transform="rotate(-25 -9 -50)" />
        <Face b={b} tears={tears} eyeClass={eyeClass} />
      </g>
    </g>
  );
}

function Bouquet() {
  return (
    <g>
      <g fill="none" stroke="#7fa14c" strokeWidth="3" strokeLinecap="round">
        <path d="M92 154 C90 146 86 138 84 132" />
        <path d="M100 154 C100 146 100 134 100 126" />
        <path d="M107 154 C109 146 111 140 113 134" />
        <path d="M112 154 C116 148 120 144 122 140" />
      </g>
      <ellipse cx="88" cy="144" rx="7" ry="3.4" fill="#8fb45a" transform="rotate(-34 88 144)" />
      <ellipse cx="112" cy="146" rx="7" ry="3.4" fill="#8fb45a" transform="rotate(32 112 146)" />
      <g transform="translate(84 130)">
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <ellipse key={a} cx="0" cy="-9" rx="4" ry="7" fill="#fffaf2" transform={`rotate(${a})`} />
        ))}
        <circle cx="0" cy="0" r="4.4" fill="#f6c25a" />
        <circle cx="-1.2" cy="-1.4" r="1.4" fill="#fbe6a8" />
      </g>
      <g transform="translate(100 122)">
        <circle cx="0" cy="0" r="10" fill="#ef9aa7" stroke="#dd8394" strokeWidth="1.2" />
        <path d="M-5 0 q5 -6 10 0 q-5 6 -10 0" fill="none" stroke="#d97b8b" strokeWidth="1.8" />
        <circle cx="0" cy="0" r="2.8" fill="#d97b8b" />
      </g>
      <g transform="translate(114 132)">
        <path d="M-8 -2 q0 -11 8 -11 q8 0 8 11 q-8 6 -16 0 Z" fill="#f2b45f" stroke="#d99543" strokeWidth="1.2" />
        <path d="M0 -13 L0 -2" stroke="#d99543" strokeWidth="1.6" />
      </g>
      <circle cx="122" cy="142" r="5.4" fill="#f6c9a8" stroke="#e0a887" strokeWidth="1.1" />
      <path d="M88 148 h24 l-4 20 h-16 Z" fill="#f7ddc9" stroke="#dcbfa6" strokeWidth="1.5" />
      <path d="M100 148 L100 168" stroke="#dcbfa6" strokeWidth="1.2" />
      <path d="M89 150 h22" stroke="#e6cbb4" strokeWidth="2" />
    </g>
  );
}

function SharedHeart() {
  return (
    <g transform="translate(100 130)">
      <path
        d="M0 -8 C-6 -19 -21 -15 -21 -3 C-21 10 -6 18 0 25 C6 18 21 10 21 -3 C21 -15 6 -19 0 -8 Z"
        fill="url(#bubudu-heart)"
        stroke="#d96b7c"
        strokeWidth="1.7"
      />
      <path d="M-11 -6 q3.4 -4 7 -1" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />
    </g>
  );
}

function Sparkles() {
  return (
    <g>
      <g fill="#f4be6c">
        <path d="M48 56 l2.4 6.4 6.4 2.4 -6.4 2.4 -2.4 6.4 -2.4 -6.4 -6.4 -2.4 6.4 -2.4 Z" />
        <path d="M154 48 l2.2 6 6 2.2 -6 2.2 -2.2 6 -2.2 -6 -6 -2.2 6 -2.2 Z" />
        <path d="M38 108 l1.8 4.8 4.8 1.8 -4.8 1.8 -1.8 4.8 -1.8 -4.8 -4.8 -1.8 4.8 -1.8 Z" />
        <path d="M164 104 l1.8 4.8 4.8 1.8 -4.8 1.8 -1.8 4.8 -1.8 -4.8 -4.8 -1.8 4.8 -1.8 Z" />
      </g>
      <g stroke="#e6a04f" strokeWidth="2.4" strokeLinecap="round" fill="none">
        <path d="M62 30 l5 4" />
        <path d="M138 28 l-5 4" />
        <path d="M26 74 l7 2" />
        <path d="M174 70 l-7 2" />
      </g>
    </g>
  );
}

function Character({ state, className, animate = true }: CharacterProps) {
  const pair = POSE[state];
  const loopClass = animate ? (state === "idle" || state === "blink" ? "bubudu-breathe" : "bubudu-settle") : undefined;
  const blink = animate && state === "blink";
  const tallEye = blink ? "bubudu-blink" : undefined;
  const shortEye = blink ? "bubudu-blink-late" : undefined;
  const tears = state === "crying";

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role="presentation"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="bubudu-cream-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fcf1da" />
          <stop offset="1" stopColor="#e9d1a9" />
        </linearGradient>
        <radialGradient id="bubudu-cream-head" cx="0.35" cy="0.28" r="0.9">
          <stop offset="0" stopColor="#fffbf2" />
          <stop offset="0.62" stopColor="#f8e8cc" />
          <stop offset="1" stopColor="#eed7b0" />
        </radialGradient>
        <linearGradient id="bubudu-brown-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9a473" />
          <stop offset="1" stopColor="#b1794a" />
        </linearGradient>
        <radialGradient id="bubudu-brown-head" cx="0.35" cy="0.28" r="0.9">
          <stop offset="0" stopColor="#e5b486" />
          <stop offset="0.6" stopColor="#cb9459" />
          <stop offset="1" stopColor="#ad7640" />
        </radialGradient>
        <linearGradient id="bubudu-heart" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7a3b0" />
          <stop offset="1" stopColor="#e4697f" />
        </linearGradient>
      </defs>
      {animate ? <style>{CSS}</style> : null}

      <ellipse cx="100" cy="172" rx="62" ry="8" fill="#3a2412" opacity="0.1" />

      <g className={loopClass}>
        <Blob b={pair.tall} tone="cream" eyeClass={tallEye} tears={tears} />
        <Blob b={pair.short} tone="brown" eyeClass={shortEye} tears={tears} />

        {state === "flowers" ? <Bouquet /> : null}
        {state === "heart" ? <SharedHeart /> : null}

        <Arms b={pair.tall} tone="cream" />
        <Arms b={pair.short} tone="brown" />

        {state === "celebrate" ? (
          <g className={animate ? "bubudu-sparkle" : undefined}>
            <Sparkles />
          </g>
        ) : null}
      </g>
    </svg>
  );
}

const art: StickerPackArt = {
  render: (state) => (props) => <Character state={state} {...props} />,
  Decorative: ({ className, animate }) => (
    <svg viewBox="0 0 200 200" className={className} role="presentation" aria-hidden xmlns="http://www.w3.org/2000/svg">
      {animate ? <style>{CSS}</style> : null}
      <g className={animate ? "bubudu-sparkle" : undefined} fill="#d98c5f">
        <circle cx="66" cy="112" r="17" opacity="0.9" />
        <circle cx="66" cy="112" r="10" fill="#fff4e2" opacity="0.9" />
        <path d="M66 96 q-1 -7 4 -9 M66 96 q5 -6 8 -2" fill="none" stroke="#c98a5e" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="132" cy="126" r="13" opacity="0.75" />
        <circle cx="132" cy="126" r="7.5" fill="#fff4e2" opacity="0.85" />
        <path d="M132 114 q-1 -6 3 -8 M132 114 q4 -5 7 -2" fill="none" stroke="#c98a5e" strokeWidth="2.2" strokeLinecap="round" />
      </g>
      <g fill="#ef9aa7">
        <path d="M100 62 c-4 -8 -14 -6 -14 2 c0 8 9 12 14 16 c5 -4 14 -8 14 -16 c0 -8 -10 -10 -14 -2 Z" opacity="0.75" />
      </g>
      <g stroke="#e6a04f" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.85">
        <path d="M154 84 q10 -4 12 -14" />
        <path d="M44 78 q-8 6 -8 16" />
      </g>
    </svg>
  ),
};

export default art;
