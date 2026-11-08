"use client";

import type { CharacterState } from "@/types/sticker";
import type { StickerArtProps, StickerPackArt } from "../types";

type CharacterProps = StickerArtProps & { state: CharacterState };

type EyeStyle = "open" | "blink" | "happy" | "sad" | "closed" | "up" | "content";
type MouthStyle = "neutral" | "smile" | "tongue" | "frown" | "wobble" | "tiny" | "sing";

interface PupPose {
  body: string;
  head: string;
  earL: string;
  earR: string;
  tail: string;
  arms: readonly string[];
  eyes: EyeStyle;
  mouth: MouthStyle;
  tongue: boolean;
}

const POSE: Record<CharacterState, PupPose> = {
  idle: {
    body: "",
    head: "",
    earL: "rotate(0 72 60)",
    earR: "rotate(0 128 60)",
    tail: "M66 156 C50 158 42 142 50 130",
    arms: ["M78 130 C70 140 69 150 73 157", "M122 130 C130 140 131 150 127 157"],
    eyes: "open",
    mouth: "neutral",
    tongue: false,
  },
  blink: {
    body: "",
    head: "",
    earL: "rotate(0 72 60)",
    earR: "rotate(0 128 60)",
    tail: "M66 156 C50 158 42 142 50 130",
    arms: ["M78 130 C70 140 69 150 73 157", "M122 130 C130 140 131 150 127 157"],
    eyes: "blink",
    mouth: "neutral",
    tongue: false,
  },
  happy: {
    body: "translate(0 -2)",
    head: "translate(0 -4) rotate(-4 100 118)",
    earL: "rotate(-9 72 60)",
    earR: "rotate(9 128 60)",
    tail: "M66 154 C48 150 38 132 48 118",
    arms: ["M76 128 C62 124 54 110 58 98", "M124 128 C138 124 146 110 142 98"],
    eyes: "happy",
    mouth: "tongue",
    tongue: true,
  },
  sad: {
    body: "translate(0 4)",
    head: "translate(0 7) rotate(3 100 118)",
    earL: "rotate(7 72 60) translate(0 4)",
    earR: "rotate(-7 128 60) translate(0 4)",
    tail: "M66 160 C52 166 42 160 40 150",
    arms: ["M78 132 C72 142 74 151 80 155", "M122 132 C128 142 126 151 120 155"],
    eyes: "sad",
    mouth: "frown",
    tongue: false,
  },
  crying: {
    body: "translate(0 5)",
    head: "translate(0 9) rotate(2 100 118)",
    earL: "rotate(10 72 60) translate(0 5)",
    earR: "rotate(-10 128 60) translate(0 5)",
    tail: "M66 162 C54 170 46 166 44 158",
    arms: ["M76 130 C66 122 66 108 74 100", "M124 130 C134 122 134 108 126 100"],
    eyes: "closed",
    mouth: "wobble",
    tongue: false,
  },
  hugging: {
    body: "translate(0 1)",
    head: "translate(0 2) rotate(-11 100 118)",
    earL: "rotate(-4 72 60) translate(2 0)",
    earR: "rotate(4 128 60) translate(-2 0)",
    tail: "M66 156 C52 162 42 154 42 144",
    arms: ["M74 126 C82 150 118 150 126 126"],
    eyes: "content",
    mouth: "smile",
    tongue: false,
  },
  apologizing: {
    body: "translate(0 4)",
    head: "translate(0 12)",
    earL: "rotate(12 72 60) translate(0 6)",
    earR: "rotate(-12 128 60) translate(0 6)",
    tail: "M66 162 C54 168 46 164 44 156",
    arms: ["M78 132 C86 144 93 148 99 148", "M122 132 C114 144 107 148 101 148"],
    eyes: "closed",
    mouth: "tiny",
    tongue: false,
  },
  flowers: {
    body: "translate(0 1)",
    head: "translate(0 1) rotate(-6 100 118)",
    earL: "rotate(-11 72 60)",
    earR: "rotate(5 128 60)",
    tail: "M66 154 C50 152 42 136 50 124",
    arms: ["M78 128 C78 140 82 148 88 151", "M122 128 C122 140 118 148 112 151"],
    eyes: "happy",
    mouth: "smile",
    tongue: false,
  },
  heart: {
    body: "",
    head: "translate(0 1) rotate(4 100 118)",
    earL: "rotate(-3 72 60)",
    earR: "rotate(3 128 60)",
    tail: "M66 156 C50 158 42 142 50 130",
    arms: ["M76 128 C77 142 84 148 91 144", "M124 128 C123 142 116 148 109 144"],
    eyes: "content",
    mouth: "smile",
    tongue: false,
  },
  hopeful: {
    body: "translate(0 -1)",
    head: "translate(0 -7) rotate(-2 100 118)",
    earL: "rotate(-7 72 60) translate(0 -3)",
    earR: "rotate(7 128 60) translate(0 -3)",
    tail: "M66 154 C50 152 42 136 50 124",
    arms: ["M78 130 C71 139 71 149 75 155", "M122 130 C129 139 129 149 125 155"],
    eyes: "up",
    mouth: "tiny",
    tongue: false,
  },
  celebrate: {
    body: "translate(0 -3)",
    head: "translate(0 -5) rotate(-3 100 118)",
    earL: "rotate(-15 72 60)",
    earR: "rotate(15 128 60)",
    tail: "M66 152 C46 146 38 126 50 112",
    arms: ["M76 126 C62 118 54 102 58 90", "M124 126 C138 118 146 102 142 90"],
    eyes: "happy",
    mouth: "sing",
    tongue: true,
  },
};

const CSS = `
.pup-breathe { animation: cc-breathe 3.6s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 98%; }
.pup-blink { animation: cc-blink 4.6s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 50%; }
.pup-wag { animation: pup-wag 1.6s ease-in-out infinite; transform-box: fill-box; transform-origin: 70% 65%; }
.pup-settle { animation: pup-settle 700ms cubic-bezier(.22,1.1,.36,1) both; transform-box: fill-box; transform-origin: 50% 98%; }
.pup-sparkle { animation: pup-sparkle 1s ease-in-out 2 both; transform-box: fill-box; transform-origin: 50% 50%; }
@keyframes pup-wag { 0%, 100% { transform: rotate(-4deg) } 50% { transform: rotate(6deg) } }
@keyframes pup-settle { from { transform: translateY(-5px) scale(.982); opacity: .55 } to { transform: translateY(0) scale(1); opacity: 1 } }
@keyframes pup-sparkle { 0%, 100% { transform: scale(.82); opacity: .35 } 50% { transform: scale(1.05); opacity: 1 } }
@media (prefers-reduced-motion: reduce) { .pup-breathe, .pup-blink, .pup-wag, .pup-settle, .pup-sparkle { animation: none } }
`;

const INK = "#3b2a20";

function Eyes({ mode, animate }: { mode: EyeStyle; animate: boolean }) {
  const blinkClass = animate ? "pup-blink" : undefined;
  if (mode === "open" || mode === "up") {
    const lift = mode === "up" ? -4 : 0;
    return (
      <g>
        <ellipse cx="86" cy={80 + lift} rx="6.6" ry="7.4" fill={INK} />
        <ellipse cx="114" cy={80 + lift} rx="6.6" ry="7.4" fill={INK} />
        <circle cx="88" cy={76 + lift} r="2.4" fill="#fff" opacity="0.92" />
        <circle cx="116" cy={76 + lift} r="2.4" fill="#fff" opacity="0.92" />
        <circle cx="83.4" cy={83 + lift} r="1.3" fill="#fff" opacity="0.5" />
        <circle cx="111.4" cy={83 + lift} r="1.3" fill="#fff" opacity="0.5" />
        {mode === "up" && (
          <g fill="none" stroke="#9c6836" strokeWidth="2" strokeLinecap="round" opacity="0.8">
            <path d="M78 66 q8 -4 15 -1" />
            <path d="M122 66 q-8 -4 -15 -1" />
          </g>
        )}
      </g>
    );
  }
  if (mode === "blink") {
    return (
      <g className={blinkClass}>
        <path d="M78 81 q8 4 16 0" fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />
        <path d="M106 81 q8 4 16 0" fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />
      </g>
    );
  }
  if (mode === "happy") {
    return (
      <g fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round">
        <path d="M78 82 q8 -11 16 0" />
        <path d="M106 82 q8 -11 16 0" />
      </g>
    );
  }
  if (mode === "content") {
    return (
      <g fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round">
        <path d="M79 82 q7 -7 14 0" />
        <path d="M107 82 q7 -7 14 0" />
      </g>
    );
  }
  if (mode === "sad") {
    return (
      <g>
        <ellipse cx="86" cy="83" rx="6" ry="6" fill={INK} />
        <ellipse cx="114" cy="83" rx="6" ry="6" fill={INK} />
        <path d="M78 79 q8 3 16 0" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.85" />
        <path d="M106 79 q8 3 16 0" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.85" />
        <circle cx="88" cy="85" r="1.8" fill="#fff" opacity="0.8" />
        <circle cx="116" cy="85" r="1.8" fill="#fff" opacity="0.8" />
        <g fill="none" stroke="#9c6836" strokeWidth="2.4" strokeLinecap="round">
          <path d="M76 70 q9 -6 17 -1" />
          <path d="M124 70 q-9 -6 -17 -1" />
        </g>
      </g>
    );
  }
  return (
    <g fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round">
      <path d="M78 80 q8 8 16 0" />
      <path d="M106 80 q8 8 16 0" />
    </g>
  );
}

function Mouth({ mode, tongue }: { mode: MouthStyle; tongue: boolean }) {
  return (
    <g>
      <g fill="none" stroke="#6b4326" strokeWidth="2.2" strokeLinecap="round">
        {mode === "neutral" && (
          <>
            <path d="M100 101 L100 105" />
            <path d="M100 105 q-5 4 -9 0" />
            <path d="M100 105 q5 4 9 0" />
          </>
        )}
        {mode === "smile" && <path d="M92 106 Q100 115 108 106" />}
        {mode === "frown" && <path d="M93 110 Q100 102 107 110" />}
        {mode === "wobble" && <path d="M92 108 q4 -4 8 0 q4 4 8 -1" />}
        {mode === "tiny" && <path d="M97 108 q3 3 6 0" />}
      </g>
      {mode === "tongue" && (
        <g>
          <path d="M90 105 Q100 119 110 105 Z" fill="#7d4437" />
          <path d="M96 111 q4 12 9 0 Z" fill="#f07b8a" />
          <path d="M100 112 v7" stroke="#d95f70" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      )}
      {mode === "sing" && (
        <g>
          <ellipse cx="100" cy="109" rx="6.4" ry="7.4" fill="#7d4437" />
          <ellipse cx="100" cy="113" rx="3.8" ry="2.6" fill="#f07b8a" />
        </g>
      )}
      {tongue && mode === "sing" ? (
        <path d="M98 114 q3 7 6 0 Z" fill="#f07b8a" />
      ) : null}
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

function HeartProp() {
  return (
    <g transform="translate(100 138)">
      <path
        d="M0 -7 C-5 -16 -18 -13 -18 -2 C-18 9 -5 16 0 22 C5 16 18 9 18 -2 C18 -13 5 -16 0 -7 Z"
        fill="url(#pup-heart)"
        stroke="#d96b7c"
        strokeWidth="1.6"
      />
      <path d="M-9 -4 q3 -4 6 -1" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
    </g>
  );
}

function Sparkles() {
  return (
    <g>
      <g fill="#f6c56a">
        <path d="M50 54 l2.4 6.4 6.4 2.4 -6.4 2.4 -2.4 6.4 -2.4 -6.4 -6.4 -2.4 6.4 -2.4 Z" />
        <path d="M152 44 l2.2 6 6 2.2 -6 2.2 -2.2 6 -2.2 -6 -6 -2.2 6 -2.2 Z" />
        <path d="M34 100 l1.8 4.8 4.8 1.8 -4.8 1.8 -1.8 4.8 -1.8 -4.8 -4.8 -1.8 4.8 -1.8 Z" />
        <path d="M168 96 l1.8 4.8 4.8 1.8 -4.8 1.8 -1.8 4.8 -1.8 -4.8 -4.8 -1.8 4.8 -1.8 Z" />
      </g>
      <g stroke="#eda75c" strokeWidth="2.4" strokeLinecap="round" fill="none">
        <path d="M64 24 l6 5" />
        <path d="M136 22 l-6 5" />
      </g>
    </g>
  );
}

function Character({ state, className, animate = true }: CharacterProps) {
  const p = POSE[state];
  const loopClass = animate ? (state === "idle" || state === "blink" ? "pup-breathe" : "pup-settle") : undefined;
  const wag = animate && (state === "idle" || state === "blink") ? "pup-wag" : undefined;
  const blush = state === "happy" || state === "heart" || state === "celebrate" ? 0.7 : 0.45;

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role="presentation"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="pup-fur" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f9dcb2" />
          <stop offset="0.55" stopColor="#ecb877" />
          <stop offset="1" stopColor="#d9984f" />
        </linearGradient>
        <radialGradient id="pup-head" cx="0.36" cy="0.28" r="0.9">
          <stop offset="0" stopColor="#fce4bd" />
          <stop offset="0.62" stopColor="#efbe7d" />
          <stop offset="1" stopColor="#d99a54" />
        </radialGradient>
        <linearGradient id="pup-muzzle" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffaf1" />
          <stop offset="1" stopColor="#fde7c6" />
        </linearGradient>
        <linearGradient id="pup-heart" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7a3b0" />
          <stop offset="1" stopColor="#e4697f" />
        </linearGradient>
      </defs>
      {animate ? <style>{CSS}</style> : null}

      <ellipse cx="100" cy="181" rx="46" ry="7" fill="#3a2412" opacity="0.1" />

      <g className={loopClass}>
        {/* wagging tail */}
        <g className={wag}>
          <path d={p.tail} fill="none" stroke="#e3a765" strokeWidth="12" strokeLinecap="round" />
          <path d={p.tail} fill="none" stroke="#fff1d6" strokeWidth="5" strokeLinecap="round" strokeDasharray="1 0" opacity="0.55" />
        </g>

        {/* body */}
        <g transform={p.body}>
          <path
            d="M100 110 C124 110 136 132 136 154 C136 173 120 180 100 180 C80 180 64 173 64 154 C64 132 76 110 100 110 Z"
            fill="url(#pup-fur)"
            stroke="#9c6836"
            strokeWidth="2"
          />
          <ellipse cx="100" cy="156" rx="22" ry="19" fill="#fff4e2" opacity="0.75" />
          <ellipse cx="122" cy="146" rx="13" ry="15" fill="#b98055" opacity="0.75" transform="rotate(-12 122 146)" />
          <ellipse cx="84" cy="174" rx="13" ry="8" fill="#fff1d6" stroke="#9c6836" strokeWidth="1.6" />
          <ellipse cx="116" cy="174" rx="13" ry="8" fill="#fff1d6" stroke="#9c6836" strokeWidth="1.6" />
          <path d="M79 173 v4 M86 173 v4 M114 173 v4 M121 173 v4" stroke="#c08a52" strokeWidth="1.3" strokeLinecap="round" />
          {/* collar */}
          <path d="M74 118 q26 16 52 0" fill="none" stroke="#6fb0c9" strokeWidth="7" strokeLinecap="round" />
          <circle cx="100" cy="130" r="6" fill="#f2c045" stroke="#d9a52f" strokeWidth="1.2" />
          <circle cx="100" cy="130" r="2.4" fill="#d9a52f" opacity="0.6" />
        </g>

        {/* head */}
        <g transform={p.head}>
          {/* floppy ears hang from the sides of the head */}
          <g transform={p.earL}>
            <path
              d="M72 56 C54 56 44 80 46 100 C48 114 58 120 64 110 C68 96 70 76 76 62 Z"
              fill="#c68f5a"
              stroke="#9c6836"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path d="M68 64 C56 68 51 84 52 98 C53 106 58 110 61 104 C64 92 66 76 70 66 Z" fill="#e2a98c" opacity="0.8" />
          </g>
          <g transform={p.earR}>
            <path
              d="M128 56 C146 56 156 80 154 100 C152 114 142 120 136 110 C132 96 130 76 124 62 Z"
              fill="#c68f5a"
              stroke="#9c6836"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path d="M132 64 C144 68 149 84 148 98 C147 106 142 110 139 104 C136 92 134 76 130 66 Z" fill="#e2a98c" opacity="0.8" />
          </g>

          <ellipse cx="100" cy="84" rx="36" ry="32" fill="url(#pup-head)" stroke="#9c6836" strokeWidth="2" />
          {/* spotted patch over one eye */}
          <path
            d="M72 58 C86 50 102 56 104 70 C106 82 92 88 82 83 C73 79 68 68 72 58 Z"
            fill="#b98055"
            opacity="0.92"
          />
          <ellipse cx="100" cy="104" rx="22" ry="16" fill="url(#pup-muzzle)" stroke="#d9b183" strokeWidth="1.4" />
          <ellipse cx="70" cy="96" rx="8" ry="4.6" fill="#e88f92" opacity={blush} />
          <ellipse cx="130" cy="96" rx="8" ry="4.6" fill="#e88f92" opacity={blush} />
          {/* nose */}
          <path d="M93 94 h14 q3 0 2 3 l-7 7 q-1 1 -2 0 l-7 -7 q-1 -3 2 -3 Z" fill={INK} />
          <ellipse cx="97" cy="96" rx="2.2" ry="1.4" fill="#fff" opacity="0.4" />
          <Eyes mode={p.eyes} animate={animate} />
          <Mouth mode={p.mouth} tongue={p.tongue} />
          {state === "crying" && (
            <g fill="#9adcf2">
              <path transform="translate(82 90)" d="M0 0 C-4 7 -3 12 1 12 C5 12 5 7 0 0 Z" />
              <path transform="translate(118 90)" d="M0 0 C-4 7 -3 12 1 12 C5 12 5 7 0 0 Z" />
            </g>
          )}
        </g>

        {/* held props, in front of the body and under the paws */}
        {state === "flowers" ? <Bouquet /> : null}
        {state === "heart" ? <HeartProp /> : null}

        {/* paws layered over the head so they can reach the face */}
        <g transform={p.body} fill="none" strokeLinecap="round">
          {p.arms.map((d) => (
            <path key={`${d}-o`} d={d} stroke="#9c6836" strokeWidth="14" opacity="0.35" />
          ))}
          {p.arms.map((d) => (
            <path key={`${d}-i`} d={d} stroke="#f0c68c" strokeWidth="10.5" />
          ))}
        </g>

        {state === "celebrate" ? (
          <g className={animate ? "pup-sparkle" : undefined}>
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
      <g className={animate ? "pup-wag" : undefined}>
        <g transform="translate(72 116) rotate(-14)">
          <path
            d="M-26 -6 q6 -14 26 -14 q20 0 26 14 q-6 14 -26 14 q-20 0 -26 -14 Z"
            fill="#f2d0a2"
            stroke="#9c6836"
            strokeWidth="2"
          />
          <circle cx="-20" cy="-6" r="7" fill="#f2d0a2" stroke="#9c6836" strokeWidth="2" />
          <circle cx="20" cy="-6" r="7" fill="#f2d0a2" stroke="#9c6836" strokeWidth="2" />
        </g>
      </g>
      <g transform="translate(138 92)">
        <ellipse cx="0" cy="2" rx="10" ry="8" fill="#e0a24a" />
        <circle cx="-10" cy="-8" r="3.6" fill="#e0a24a" />
        <circle cx="-3.5" cy="-12" r="3.6" fill="#e0a24a" />
        <circle cx="4" cy="-12" r="3.6" fill="#e0a24a" />
        <circle cx="10.5" cy="-8" r="3.6" fill="#e0a24a" />
      </g>
      <g fill="#f6c56a">
        <path d="M52 148 l2 5.4 5.4 2 -5.4 2 -2 5.4 -2 -5.4 -5.4 -2 5.4 -2 Z" />
      </g>
      <path d="M124 148 q12 -10 22 0" fill="none" stroke="#9c6836" strokeWidth="2.6" strokeLinecap="round" opacity="0.5" />
    </svg>
  ),
};

export default art;
