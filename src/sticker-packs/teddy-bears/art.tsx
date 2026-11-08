"use client";

import type { CharacterState } from "@/types/sticker";
import type { StickerArtProps, StickerPackArt } from "../types";

type CharacterProps = StickerArtProps & { state: CharacterState };

type EyeStyle = "button" | "blink" | "happy" | "sad" | "closed" | "up" | "content";
type MouthStyle = "neutral" | "smile" | "grin" | "frown" | "wobble" | "tiny" | "sing";

interface BearPose {
  body: string;
  head: string;
  earL: string;
  earR: string;
  /** arm rotation in degrees; the arm pivots at its shoulder */
  armL: number;
  armR: number;
  eyes: EyeStyle;
  mouth: MouthStyle;
}

const POSE: Record<CharacterState, BearPose> = {
  idle: {
    body: "",
    head: "",
    earL: "translate(0 0)",
    earR: "translate(0 0)",
    armL: 15,
    armR: -15,
    eyes: "button",
    mouth: "neutral",
  },
  blink: {
    body: "",
    head: "",
    earL: "translate(0 0)",
    earR: "translate(0 0)",
    armL: 15,
    armR: -15,
    eyes: "blink",
    mouth: "neutral",
  },
  happy: {
    body: "translate(0 -2)",
    head: "translate(0 -4) rotate(-3 100 118)",
    earL: "translate(1 -4)",
    earR: "translate(-1 -4)",
    armL: 142,
    armR: -142,
    eyes: "happy",
    mouth: "grin",
  },
  sad: {
    body: "translate(0 4)",
    head: "translate(0 7) rotate(4 100 118)",
    earL: "translate(-6 6)",
    earR: "translate(6 6)",
    armL: -6,
    armR: 6,
    eyes: "sad",
    mouth: "frown",
  },
  crying: {
    body: "translate(0 5)",
    head: "translate(0 8) rotate(3 100 118)",
    earL: "translate(-8 7)",
    earR: "translate(8 7)",
    armL: -152,
    armR: 152,
    eyes: "closed",
    mouth: "wobble",
  },
  hugging: {
    body: "translate(0 1)",
    head: "translate(0 2) rotate(-10 100 118)",
    earL: "translate(2 1)",
    earR: "translate(-2 1)",
    armL: -66,
    armR: 66,
    eyes: "content",
    mouth: "smile",
  },
  apologizing: {
    body: "translate(0 4)",
    head: "translate(0 12)",
    earL: "translate(-7 8)",
    earR: "translate(7 8)",
    armL: -48,
    armR: 48,
    eyes: "closed",
    mouth: "tiny",
  },
  flowers: {
    body: "translate(0 1)",
    head: "translate(0 1) rotate(-5 100 118)",
    earL: "translate(0 -2)",
    earR: "translate(0 -2)",
    armL: -30,
    armR: 30,
    eyes: "happy",
    mouth: "smile",
  },
  heart: {
    body: "",
    head: "translate(0 1) rotate(4 100 118)",
    earL: "translate(-2 1)",
    earR: "translate(2 1)",
    armL: -36,
    armR: 36,
    eyes: "content",
    mouth: "smile",
  },
  hopeful: {
    body: "translate(0 -1)",
    head: "translate(0 -7) rotate(-2 100 118)",
    earL: "translate(0 -3)",
    earR: "translate(0 -3)",
    armL: 8,
    armR: -8,
    eyes: "up",
    mouth: "tiny",
  },
  celebrate: {
    body: "translate(0 -3)",
    head: "translate(0 -5) rotate(-2 100 118)",
    earL: "translate(1 -5)",
    earR: "translate(-1 -5)",
    armL: 158,
    armR: -158,
    eyes: "happy",
    mouth: "sing",
  },
};

const CSS = `
.teddy-breathe { animation: cc-breathe 5.4s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 98%; }
.teddy-blink { animation: cc-blink 5.9s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 50%; }
.teddy-settle { animation: teddy-settle 760ms cubic-bezier(.22,1.1,.36,1) both; transform-box: fill-box; transform-origin: 50% 98%; }
.teddy-sparkle { animation: teddy-sparkle 1.1s ease-in-out 2 both; transform-box: fill-box; transform-origin: 50% 50%; }
@keyframes teddy-settle { from { transform: translateY(-5px) scale(.982); opacity: .55 } to { transform: translateY(0) scale(1); opacity: 1 } }
@keyframes teddy-sparkle { 0%, 100% { transform: scale(.82); opacity: .35 } 50% { transform: scale(1.05); opacity: 1 } }
@media (prefers-reduced-motion: reduce) { .teddy-breathe, .teddy-blink, .teddy-settle, .teddy-sparkle { animation: none } }
`;

const INK = "#4a3628";
const STITCH = "#a9743f";

function ButtonEye({ cx, cy, lift = 0 }: { cx: number; cy: number; lift?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy + lift} r="5.4" fill={INK} stroke="#6b4b34" strokeWidth="1.2" />
      <circle cx={cx - 1.7} cy={cy + lift} r="1.1" fill="#f2e0c6" />
      <circle cx={cx + 1.7} cy={cy + lift} r="1.1" fill="#f2e0c6" />
      <path d={`M${cx - 1.7} ${cy + lift - 1.1} L${cx + 1.7} ${cy + lift + 1.1}`} stroke="#f2e0c6" strokeWidth="0.9" />
      <circle cx={cx + 2.4} cy={cy + lift - 3} r="1.5" fill="#fff" opacity="0.5" />
    </g>
  );
}

function Eyes({ mode, animate }: { mode: EyeStyle; animate: boolean }) {
  const blinkClass = animate ? "teddy-blink" : undefined;
  if (mode === "button" || mode === "up") {
    return (
      <g>
        <ButtonEye cx={84} cy={76} lift={mode === "up" ? -3 : 0} />
        <ButtonEye cx={116} cy={76} lift={mode === "up" ? -3 : 0} />
        {mode === "up" && (
          <g fill="none" stroke={STITCH} strokeWidth="1.8" strokeLinecap="round" strokeDasharray="3 3" opacity="0.8">
            <path d="M76 66 q8 -4 16 -1" />
            <path d="M124 66 q-8 -4 -16 -1" />
          </g>
        )}
      </g>
    );
  }
  if (mode === "blink") {
    return (
      <g className={blinkClass}>
        <ButtonEye cx={84} cy={76} />
        <ButtonEye cx={116} cy={76} />
        <path d="M77 76 q7 3 14 0" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M109 76 q7 3 14 0" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      </g>
    );
  }
  if (mode === "happy") {
    return (
      <g fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round">
        <path d="M77 79 q7 -9 14 0" />
        <path d="M109 79 q7 -9 14 0" />
      </g>
    );
  }
  if (mode === "content") {
    return (
      <g fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round">
        <path d="M78 79 q6 -6 12 0" />
        <path d="M110 79 q6 -6 12 0" />
      </g>
    );
  }
  if (mode === "sad") {
    return (
      <g>
        <ButtonEye cx={84} cy={78} />
        <ButtonEye cx={116} cy={78} />
        <path d="M77 74 q7 3 14 0" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.85" />
        <path d="M109 74 q7 3 14 0" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.85" />
        <g fill="none" stroke={STITCH} strokeWidth="2" strokeLinecap="round" strokeDasharray="3 2.6">
          <path d="M75 66 q8 -5 16 -1" />
          <path d="M125 66 q-8 -5 -16 -1" />
        </g>
      </g>
    );
  }
  // closed
  return (
    <g fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round">
      <path d="M77 76 q7 8 14 0" />
      <path d="M109 76 q7 8 14 0" />
    </g>
  );
}

function Mouth({ mode }: { mode: MouthStyle }) {
  if (mode === "grin") {
    return (
      <g>
        <path d="M90 102 Q100 118 110 102 Z" fill="#8d4a4a" />
        <ellipse cx="100" cy="110" rx="4.6" ry="3" fill="#f08a92" />
      </g>
    );
  }
  if (mode === "sing") {
    return (
      <g>
        <ellipse cx="100" cy="107" rx="6" ry="7" fill="#8d4a4a" />
        <ellipse cx="100" cy="111" rx="3.6" ry="2.4" fill="#f08a92" />
      </g>
    );
  }
  if (mode === "smile") {
    return <path d="M91 103 Q100 112 109 103" fill="none" stroke={STITCH} strokeWidth="2.1" strokeLinecap="round" />;
  }
  if (mode === "frown") {
    return <path d="M92 107 Q100 100 108 107" fill="none" stroke={STITCH} strokeWidth="2.1" strokeLinecap="round" />;
  }
  if (mode === "wobble") {
    return (
      <path d="M92 106 q4 -4 8 0 q4 4 8 -1" fill="none" stroke={STITCH} strokeWidth="2.1" strokeLinecap="round" />
    );
  }
  if (mode === "tiny") {
    return <path d="M96 105 q4 4 8 0" fill="none" stroke={STITCH} strokeWidth="2.1" strokeLinecap="round" />;
  }
  return (
    <g fill="none" stroke={STITCH} strokeWidth="2.1" strokeLinecap="round">
      <path d="M100 99 L100 102" />
      <path d="M100 102 q-5 4 -9 0" />
      <path d="M100 102 q5 4 9 0" />
    </g>
  );
}

function Arm({ side, angle }: { side: "left" | "right"; angle: number }) {
  const x = side === "left" ? 75 : 125;
  return (
    <g transform={`translate(${x} 126) rotate(${angle})`}>
      <ellipse cx="0" cy="13" rx="10" ry="17" fill="url(#teddy-fur)" stroke="#8d5c34" strokeWidth="1.8" />
      <ellipse cx="0" cy="25" rx="6.2" ry="5" fill="#e9b9a4" stroke="#c9907a" strokeWidth="1" />
      <path d="M0 3 v13" stroke={STITCH} strokeWidth="1.3" strokeDasharray="3 3" opacity="0.65" />
    </g>
  );
}

function Bouquet() {
  return (
    <g>
      <g fill="none" stroke="#7fa14c" strokeWidth="3" strokeLinecap="round">
        <path d="M90 152 C88 144 84 136 82 128" />
        <path d="M97 152 C97 144 97 134 97 126" />
        <path d="M104 152 C106 144 108 138 110 132" />
        <path d="M111 152 C114 146 118 142 121 138" />
      </g>
      <ellipse cx="86" cy="142" rx="7" ry="3.4" fill="#8fb45a" transform="rotate(-34 86 142)" />
      <ellipse cx="108" cy="145" rx="7" ry="3.4" fill="#8fb45a" transform="rotate(32 108 145)" />
      <g transform="translate(80 126)">
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <ellipse key={a} cx="0" cy="-9" rx="4" ry="7" fill="#fffaf2" transform={`rotate(${a})`} />
        ))}
        <circle cx="0" cy="0" r="4.4" fill="#f6c25a" />
        <circle cx="-1.2" cy="-1.4" r="1.4" fill="#fbe6a8" />
      </g>
      <g transform="translate(97 122)">
        <circle cx="0" cy="0" r="10" fill="#ef9aa7" stroke="#dd8394" strokeWidth="1.2" />
        <path d="M-5 0 q5 -6 10 0 q-5 6 -10 0" fill="none" stroke="#d97b8b" strokeWidth="1.8" />
        <circle cx="0" cy="0" r="2.8" fill="#d97b8b" />
      </g>
      <g transform="translate(113 130)">
        <path d="M-8 -2 q0 -11 8 -11 q8 0 8 11 q-8 6 -16 0 Z" fill="#f2b45f" stroke="#d99543" strokeWidth="1.2" />
        <path d="M0 -13 L0 -2" stroke="#d99543" strokeWidth="1.6" />
      </g>
      <circle cx="122" cy="140" r="5.4" fill="#f6c9a8" stroke="#e0a887" strokeWidth="1.1" />
      <path d="M84 148 h28 l-5 20 h-18 Z" fill="#f7ddc9" stroke="#dcbfa6" strokeWidth="1.5" />
      <path d="M98 148 L98 168" stroke="#dcbfa6" strokeWidth="1.2" />
      <path d="M85 150 h26" stroke="#e6cbb4" strokeWidth="2" />
    </g>
  );
}

function FabricHeart() {
  return (
    <g transform="translate(100 138)">
      <path
        d="M0 -7 C-5 -16 -18 -13 -18 -2 C-18 9 -5 16 0 22 C5 16 18 9 18 -2 C18 -13 5 -16 0 -7 Z"
        fill="url(#teddy-heart)"
        stroke="#c25f6f"
        strokeWidth="1.6"
      />
      <path
        d="M0 -3 C-3 -9 -12 -7 -12 0 C-12 7 -4 12 0 16 C4 12 12 7 12 0 C12 -7 3 -9 0 -3 Z"
        fill="none"
        stroke="#f7d9c6"
        strokeWidth="1.3"
        strokeDasharray="3 3"
        opacity="0.9"
      />
      <circle cx="0" cy="6" r="2" fill="#c25f6f" />
    </g>
  );
}

function Sparkles() {
  return (
    <g>
      <g fill="#f0c061">
        <path d="M46 54 l2.6 6.8 6.8 2.6 -6.8 2.6 -2.6 6.8 -2.6 -6.8 -6.8 -2.6 6.8 -2.6 Z" />
        <path d="M154 46 l2.2 6 6 2.2 -6 2.2 -2.2 6 -2.2 -6 -6 -2.2 6 -2.2 Z" />
        <path d="M32 98 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" />
        <path d="M170 94 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" />
      </g>
      <g stroke="#d99a4f" strokeWidth="2.4" strokeLinecap="round" fill="none">
        <path d="M64 28 l6 5" />
        <path d="M136 26 l-6 5" />
      </g>
    </g>
  );
}

function Character({ state, className, animate = true }: CharacterProps) {
  const p = POSE[state];
  const loopClass = animate ? (state === "idle" || state === "blink" ? "teddy-breathe" : "teddy-settle") : undefined;
  const blush = state === "happy" || state === "heart" || state === "celebrate" ? 0.6 : 0.42;

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role="presentation"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="teddy-fur" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ecc296" />
          <stop offset="0.55" stopColor="#d9a86f" />
          <stop offset="1" stopColor="#b8814a" />
        </linearGradient>
        <radialGradient id="teddy-head" cx="0.35" cy="0.28" r="0.9">
          <stop offset="0" stopColor="#f0cba3" />
          <stop offset="0.62" stopColor="#dcae76" />
          <stop offset="1" stopColor="#bd8750" />
        </radialGradient>
        <linearGradient id="teddy-muzzle" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff5e4" />
          <stop offset="1" stopColor="#f2ddbd" />
        </linearGradient>
        <linearGradient id="teddy-heart" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7a3b0" />
          <stop offset="1" stopColor="#e4697f" />
        </linearGradient>
      </defs>
      {animate ? <style>{CSS}</style> : null}

      <ellipse cx="100" cy="182" rx="46" ry="7" fill="#3a2412" opacity="0.1" />

      <g className={loopClass}>
        {/* body */}
        <g transform={p.body}>
          <path
            d="M100 112 C124 112 136 134 136 156 C136 174 120 181 100 181 C80 181 64 174 64 156 C64 134 76 112 100 112 Z"
            fill="url(#teddy-fur)"
            stroke="#8d5c34"
            strokeWidth="2"
          />
          <ellipse cx="100" cy="157" rx="23" ry="20" fill="url(#teddy-muzzle)" opacity="0.85" />
          {/* plush legs */}
          <ellipse cx="82" cy="175" rx="13" ry="8" fill="url(#teddy-fur)" stroke="#8d5c34" strokeWidth="1.7" />
          <ellipse cx="118" cy="175" rx="13" ry="8" fill="url(#teddy-fur)" stroke="#8d5c34" strokeWidth="1.7" />
          <ellipse cx="82" cy="175" rx="6.4" ry="4.4" fill="#e9b9a4" stroke="#c9907a" strokeWidth="0.9" />
          <ellipse cx="118" cy="175" rx="6.4" ry="4.4" fill="#e9b9a4" stroke="#c9907a" strokeWidth="0.9" />
          {/* stitched belly seam */}
          <path d="M100 122 v44" stroke={STITCH} strokeWidth="1.4" strokeDasharray="4 4" opacity="0.55" />
          <path d="M93 136 h14 M93 152 h14" stroke={STITCH} strokeWidth="1.3" strokeLinecap="round" opacity="0.4" />
        </g>

        {/* head */}
        <g transform={p.head}>
          <g transform={p.earL}>
            <circle cx="64" cy="50" r="14" fill="url(#teddy-fur)" stroke="#8d5c34" strokeWidth="2" />
            <circle cx="64" cy="50" r="7.4" fill="#e8c391" />
          </g>
          <g transform={p.earR}>
            <circle cx="136" cy="50" r="14" fill="url(#teddy-fur)" stroke="#8d5c34" strokeWidth="2" />
            <circle cx="136" cy="50" r="7.4" fill="#e8c391" />
          </g>
          <circle cx="100" cy="80" r="36" fill="url(#teddy-head)" stroke="#8d5c34" strokeWidth="2" />
          {/* head seam + patch stitching */}
          <path d="M100 45 v9" stroke={STITCH} strokeWidth="1.6" strokeDasharray="3.4 3.4" opacity="0.8" />
          <path d="M74 60 q26 -14 52 0" stroke={STITCH} strokeWidth="1.3" strokeDasharray="4 4" opacity="0.35" fill="none" />
          {/* muzzle */}
          <ellipse cx="100" cy="94" rx="21" ry="15" fill="url(#teddy-muzzle)" stroke="#c9a077" strokeWidth="1.4" strokeDasharray="3.4 3.4" />
          <ellipse cx="72" cy="94" rx="8" ry="4.6" fill="#e79a8f" opacity={blush} />
          <ellipse cx="128" cy="94" rx="8" ry="4.6" fill="#e79a8f" opacity={blush} />
          {/* stitched nose */}
          <path d="M93 88 h14 l-7 9 Z" fill="#6b4529" stroke="#4a2f1c" strokeWidth="1" strokeLinejoin="round" />
          <path d="M100 89 v7" stroke="#f2ddbd" strokeWidth="1" opacity="0.8" />
          <Mouth mode={p.mouth} />
          <Eyes mode={p.eyes} animate={animate} />
          {state === "crying" && (
            <g fill="#9adcf2">
              <path transform="translate(80 88)" d="M0 0 C-4 7 -3 12 1 12 C5 12 5 7 0 0 Z" />
              <path transform="translate(120 88)" d="M0 0 C-4 7 -3 12 1 12 C5 12 5 7 0 0 Z" />
            </g>
          )}
        </g>

        {/* held props, in front of the body and under the paws */}
        {state === "flowers" ? <Bouquet /> : null}
        {state === "heart" ? <FabricHeart /> : null}

        {/* plush arms, layered over the head so paws can reach the face */}
        <g transform={p.body}>
          <Arm side="left" angle={p.armL} />
          <Arm side="right" angle={p.armR} />
        </g>

        {state === "celebrate" ? (
          <g className={animate ? "teddy-sparkle" : undefined}>
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
      <g className={animate ? "teddy-sparkle" : undefined}>
        <g transform="translate(72 118)">
          <path
            d="M0 -8 C-6 -19 -21 -15 -21 -3 C-21 10 -6 18 0 25 C6 18 21 10 21 -3 C21 -15 6 -19 0 -8 Z"
            fill="#dba06a"
            stroke="#a56f42"
            strokeWidth="2"
          />
          <path
            d="M0 -4 C-4 -11 -14 -9 -14 -2 C-14 7 -5 13 0 17 C5 13 14 7 14 -2 C14 -9 4 -11 0 -4 Z"
            fill="none"
            stroke="#f6e0c4"
            strokeWidth="1.6"
            strokeDasharray="4 3.4"
          />
        </g>
        <g transform="translate(136 96)">
          <circle cx="0" cy="0" r="13" fill="#c98a5e" stroke="#8d5c34" strokeWidth="2" />
          <circle cx="-4" cy="0" r="2.4" fill="#f6e0c4" />
          <circle cx="4" cy="0" r="2.4" fill="#f6e0c4" />
          <path d="M-4 -2 L4 2 M-4 2 L4 -2" stroke="#f6e0c4" strokeWidth="2" strokeLinecap="round" />
        </g>
      </g>
      <path
        d="M40 60 q22 -22 46 -8"
        fill="none"
        stroke="#c98a5e"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeDasharray="7 6"
        opacity="0.8"
      />
      <g fill="#f0c061">
        <path d="M156 136 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" />
      </g>
    </svg>
  ),
};

export default art;
