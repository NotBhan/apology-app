"use client";

import type { CharacterState } from "@/types/sticker";
import type { StickerArtProps, StickerPackArt } from "../types";

type CharacterProps = StickerArtProps & { state: CharacterState };

type EyeStyle = "sleepy" | "blink" | "happy" | "sad" | "closed" | "up" | "content";
type MouthStyle = "neutral" | "smile" | "grin" | "frown" | "wobble" | "tiny" | "o";

interface CapyPose {
  body: string;
  head: string;
  earL: string;
  earR: string;
  arms: readonly string[];
  eyes: EyeStyle;
  mouth: MouthStyle;
}

const POSE: Record<CharacterState, CapyPose> = {
  idle: {
    body: "",
    head: "",
    earL: "rotate(-16 60 78)",
    earR: "rotate(16 140 78)",
    arms: ["M54 128 C44 136 40 147 42 157", "M146 128 C156 136 160 147 158 157"],
    eyes: "sleepy",
    mouth: "neutral",
  },
  blink: {
    body: "",
    head: "",
    earL: "rotate(-16 60 78)",
    earR: "rotate(16 140 78)",
    arms: ["M54 128 C44 136 40 147 42 157", "M146 128 C156 136 160 147 158 157"],
    eyes: "blink",
    mouth: "neutral",
  },
  happy: {
    body: "translate(0 -3)",
    head: "translate(0 -3) rotate(-2 100 140)",
    earL: "rotate(-26 60 78)",
    earR: "rotate(26 140 78)",
    arms: ["M52 126 C38 126 30 114 32 102", "M148 126 C162 126 170 114 168 102"],
    eyes: "happy",
    mouth: "grin",
  },
  sad: {
    body: "translate(0 4)",
    head: "translate(0 6) rotate(2 100 140)",
    earL: "rotate(-4 60 78)",
    earR: "rotate(4 140 78)",
    arms: ["M54 132 C46 142 48 152 54 158", "M146 132 C154 142 152 152 146 158"],
    eyes: "sad",
    mouth: "frown",
  },
  crying: {
    body: "translate(0 5)",
    head: "translate(0 8) rotate(2 100 140)",
    earL: "rotate(2 60 78)",
    earR: "rotate(-2 140 78)",
    arms: ["M52 126 C44 112 46 98 56 90", "M148 126 C156 112 154 98 144 90"],
    eyes: "closed",
    mouth: "wobble",
  },
  hugging: {
    body: "translate(0 1)",
    head: "translate(0 2) rotate(-5 100 140)",
    earL: "rotate(-22 60 78)",
    earR: "rotate(22 140 78)",
    arms: ["M52 132 C64 156 136 156 148 132"],
    eyes: "content",
    mouth: "smile",
  },
  apologizing: {
    body: "translate(0 4)",
    head: "translate(0 11)",
    earL: "rotate(6 60 78)",
    earR: "rotate(-6 140 78)",
    arms: ["M58 132 C70 148 86 154 98 154", "M142 132 C130 148 114 154 102 154"],
    eyes: "closed",
    mouth: "tiny",
  },
  flowers: {
    body: "translate(0 1)",
    head: "translate(0 2) rotate(-4 100 140)",
    earL: "rotate(-20 60 78)",
    earR: "rotate(12 140 78)",
    arms: ["M54 130 C46 140 48 152 54 158", "M146 128 C150 140 144 150 134 154"],
    eyes: "happy",
    mouth: "smile",
  },
  heart: {
    body: "",
    head: "translate(0 1) rotate(3 100 140)",
    earL: "rotate(-12 60 78)",
    earR: "rotate(20 140 78)",
    arms: ["M56 134 C68 150 80 158 90 156", "M144 134 C132 150 120 158 110 156"],
    eyes: "content",
    mouth: "smile",
  },
  hopeful: {
    body: "translate(0 -4)",
    head: "translate(0 -4) rotate(-2 100 140)",
    earL: "rotate(-24 60 78)",
    earR: "rotate(24 140 78)",
    arms: ["M54 130 C46 138 44 148 46 156", "M146 130 C154 138 156 148 154 156"],
    eyes: "up",
    mouth: "tiny",
  },
  celebrate: {
    body: "translate(0 -5)",
    head: "translate(0 -5) rotate(-3 100 140)",
    earL: "rotate(-30 60 78)",
    earR: "rotate(30 140 78)",
    arms: ["M52 124 C38 118 30 102 34 88", "M148 124 C162 118 170 102 166 88"],
    eyes: "happy",
    mouth: "o",
  },
};

const CSS = `
.capy-breathe { animation: cc-breathe 6s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 98%; }
.capy-blink { animation: cc-blink 7s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 50%; }
.capy-settle { animation: capy-settle 800ms cubic-bezier(.22,1.1,.36,1) both; transform-box: fill-box; transform-origin: 50% 98%; }
.capy-sparkle { animation: capy-sparkle 1.2s ease-in-out 2 both; transform-box: fill-box; transform-origin: 50% 50%; }
@keyframes capy-settle { from { transform: translateY(-5px) scale(.985); opacity: .55 } to { transform: translateY(0) scale(1); opacity: 1 } }
@keyframes capy-sparkle { 0%, 100% { transform: scale(.84); opacity: .35 } 50% { transform: scale(1.04); opacity: 1 } }
@media (prefers-reduced-motion: reduce) { .capy-breathe, .capy-blink, .capy-settle, .capy-sparkle { animation: none } }
`;

const INK = "#33241a";

function Eyes({ mode, animate }: { mode: EyeStyle; animate: boolean }) {
  const blinkClass = animate ? "capy-blink" : undefined;
  if (mode === "sleepy" || mode === "sad" || mode === "up") {
    const lift = mode === "up" ? -4 : 0;
    return (
      <g>
        <path d={`M57 ${96 + lift} q7 -5 14 0 q-7 5 -14 0 Z`} fill={INK} />
        <path d={`M129 ${96 + lift} q7 -5 14 0 q-7 5 -14 0 Z`} fill={INK} />
        <g fill="none" stroke="#7c5535" strokeWidth="2" strokeLinecap="round" opacity="0.85">
          <path d={`M56 ${95 + lift} q8 -4 16 0`} />
          <path d={`M128 ${95 + lift} q8 -4 16 0`} />
        </g>
        <circle cx="67" cy={94 + lift} r="1.4" fill="#fff" opacity="0.65" />
        <circle cx="139" cy={94 + lift} r="1.4" fill="#fff" opacity="0.65" />
        {mode === "up" && (
          <g fill="none" stroke="#7c5535" strokeWidth="2" strokeLinecap="round" opacity="0.5">
            <path d="M58 101 q7 4 14 0" />
            <path d="M130 101 q7 4 14 0" />
          </g>
        )}
        {mode === "sad" && (
          <g fill="none" stroke="#6d4a2d" strokeWidth="2.2" strokeLinecap="round">
            <path d="M55 87 q8 -5 15 -1" />
            <path d="M145 87 q-8 -5 -15 -1" />
          </g>
        )}
      </g>
    );
  }
  if (mode === "blink") {
    return (
      <g className={blinkClass} fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round">
        <path d="M57 96 q7 3 14 0" />
        <path d="M129 96 q7 3 14 0" />
      </g>
    );
  }
  if (mode === "happy" || mode === "content") {
    return (
      <g fill="none" stroke={INK} strokeWidth={mode === "happy" ? 2.8 : 2.4} strokeLinecap="round">
        <path d="M57 97 q7 -9 14 0" />
        <path d="M129 97 q7 -9 14 0" />
      </g>
    );
  }
  return (
    <g fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round">
      <path d="M57 95 q7 7 14 0" />
      <path d="M129 95 q7 7 14 0" />
    </g>
  );
}

function Mouth({ mode }: { mode: MouthStyle }) {
  if (mode === "grin" || mode === "o") {
    return (
      <g>
        <path d="M90 130 Q100 146 110 130 Z" fill="#7a4335" />
        <ellipse cx="100" cy="138.5" rx="4.4" ry="2.8" fill="#ef8f92" />
      </g>
    );
  }
  if (mode === "smile") {
    return <path d="M91 132 Q100 141 109 132" fill="none" stroke="#6b4a33" strokeWidth="2.2" strokeLinecap="round" />;
  }
  if (mode === "frown") {
    return <path d="M92 136 Q100 128 108 136" fill="none" stroke="#6b4a33" strokeWidth="2.2" strokeLinecap="round" />;
  }
  if (mode === "wobble") {
    return (
      <path d="M91 135 q4.5 -4 9 0 q4.5 4 9 -1" fill="none" stroke="#6b4a33" strokeWidth="2.2" strokeLinecap="round" />
    );
  }
  if (mode === "tiny") {
    return <path d="M96 134 q4 3 8 0" fill="none" stroke="#6b4a33" strokeWidth="2.2" strokeLinecap="round" />;
  }
  return (
    <g fill="none" stroke="#6b4a33" strokeWidth="2.2" strokeLinecap="round">
      <path d="M100 129 L100 133" />
      <path d="M100 133 q-5 4 -9 0" />
      <path d="M100 133 q5 4 9 0" />
    </g>
  );
}

function Bouquet() {
  return (
    <g transform="translate(-30 6)">
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
    <g transform="translate(100 144) scale(1.22)">
      <path
        d="M0 -7 C-5 -16 -18 -13 -18 -2 C-18 9 -5 16 0 22 C5 16 18 9 18 -2 C18 -13 5 -16 0 -7 Z"
        fill="url(#capy-heart)"
        stroke="#c4695a"
        strokeWidth="1.4"
      />
      <path d="M-9 -4 q3 -4 6 -1" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </g>
  );
}

function Sparkles() {
  return (
    <g>
      <g fill="#f2b23f">
        <path d="M44 52 l2.6 6.8 6.8 2.6 -6.8 2.6 -2.6 6.8 -2.6 -6.8 -6.8 -2.6 6.8 -2.6 Z" />
        <path d="M156 44 l2.2 6 6 2.2 -6 2.2 -2.2 6 -2.2 -6 -6 -2.2 6 -2.2 Z" />
        <path d="M28 96 l1.8 4.8 4.8 1.8 -4.8 1.8 -1.8 4.8 -1.8 -4.8 -4.8 -1.8 4.8 -1.8 Z" />
        <path d="M174 92 l1.8 4.8 4.8 1.8 -4.8 1.8 -1.8 4.8 -1.8 -4.8 -4.8 -1.8 4.8 -1.8 Z" />
      </g>
      <g stroke="#dfa24a" strokeWidth="2.4" strokeLinecap="round" fill="none">
        <path d="M62 26 l5 4" />
        <path d="M138 24 l-5 4" />
      </g>
    </g>
  );
}

function Character({ state, className, animate = true }: CharacterProps) {
  const p = POSE[state];
  const loopClass = animate ? (state === "idle" || state === "blink" ? "capy-breathe" : "capy-settle") : undefined;
  const blush = state === "happy" || state === "heart" || state === "celebrate" ? 0.6 : 0.4;

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role="presentation"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="capy-fur" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cda173" />
          <stop offset="0.55" stopColor="#b5854f" />
          <stop offset="1" stopColor="#96683d" />
        </linearGradient>
        <linearGradient id="capy-belly" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d8b489" />
          <stop offset="1" stopColor="#c19769" />
        </linearGradient>
        <linearGradient id="capy-muzzle" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e3c59b" />
          <stop offset="1" stopColor="#cfa87b" />
        </linearGradient>
        <linearGradient id="capy-heart" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4a08c" />
          <stop offset="1" stopColor="#dd6f5f" />
        </linearGradient>
      </defs>
      {animate ? <style>{CSS}</style> : null}

      <ellipse cx="100" cy="181" rx="54" ry="7" fill="#3a2412" opacity="0.1" />

      <g className={loopClass}>
        <g transform={p.body}>
          {/* ears sit on the shoulder line — capybaras have no neck */}
          <g transform={p.earL}>
            <ellipse cx="60" cy="78" rx="10" ry="7.4" fill="#a3764a" stroke="#7d5533" strokeWidth="1.6" />
            <ellipse cx="60" cy="78" rx="5.2" ry="3.6" fill="#8a6040" />
          </g>
          <g transform={p.earR}>
            <ellipse cx="140" cy="78" rx="10" ry="7.4" fill="#a3764a" stroke="#7d5533" strokeWidth="1.6" />
            <ellipse cx="140" cy="78" rx="5.2" ry="3.6" fill="#8a6040" />
          </g>

          {/* one barrel silhouette: head and body are a single mass */}
          <path
            d="M100 72 C136 72 160 90 160 114 L160 146 C160 168 134 178 100 178 C66 178 40 168 40 146 L40 114 C40 90 64 72 100 72 Z"
            fill="url(#capy-fur)"
            stroke="#7d5533"
            strokeWidth="2"
          />
          <ellipse cx="100" cy="152" rx="38" ry="24" fill="url(#capy-belly)" opacity="0.55" />
          <ellipse cx="100" cy="94" rx="44" ry="20" fill="#e2c096" opacity="0.18" />
          {/* fur strokes */}
          <g stroke="#8a6040" strokeWidth="1.8" strokeLinecap="round" opacity="0.45" fill="none">
            <path d="M56 96 q4 -6 9 -8" />
            <path d="M144 96 q-4 -6 -9 -8" />
            <path d="M62 160 q5 4 11 5" />
            <path d="M138 160 q-5 4 -11 5" />
          </g>
          {/* feet */}
          <ellipse cx="74" cy="174" rx="15" ry="8" fill="#a3764a" stroke="#7d5533" strokeWidth="1.6" />
          <ellipse cx="126" cy="174" rx="15" ry="8" fill="#a3764a" stroke="#7d5533" strokeWidth="1.6" />
          <path d="M68 172 v5 M76 172 v5 M124 172 v5 M132 172 v5" stroke="#7d5533" strokeWidth="1.3" strokeLinecap="round" />

          {/* blocky rectangular muzzle */}
          <g transform={p.head}>
            <rect x="72" y="104" width="56" height="44" rx="13" fill="url(#capy-muzzle)" stroke="#a97f52" strokeWidth="1.8" />
            <ellipse cx="87" cy="120" rx="3.6" ry="2.6" fill="#6b4a33" />
            <ellipse cx="113" cy="120" rx="3.6" ry="2.6" fill="#6b4a33" />
            <ellipse cx="85.6" cy="119" rx="1.2" ry="0.9" fill="#f0dcc0" opacity="0.7" />
            <ellipse cx="111.6" cy="119" rx="1.2" ry="0.9" fill="#f0dcc0" opacity="0.7" />
            <Mouth mode={p.mouth} />
            <Eyes mode={p.eyes} animate={animate} />
            <ellipse cx="60" cy="110" rx="8" ry="4.6" fill="#d98f7f" opacity={blush} />
            <ellipse cx="140" cy="110" rx="8" ry="4.6" fill="#d98f7f" opacity={blush} />
            {state === "crying" && (
              <g fill="#9adcf2">
                <path transform="translate(61 104)" d="M0 0 C-4 7 -3 12 1 12 C5 12 5 7 0 0 Z" />
                <path transform="translate(139 104)" d="M0 0 C-4 7 -3 12 1 12 C5 12 5 7 0 0 Z" />
              </g>
            )}
          </g>
        </g>

        {state === "flowers" ? <Bouquet /> : null}
        {state === "heart" ? <HeartProp /> : null}

        <g transform={p.body} fill="none" strokeLinecap="round">
          {p.arms.map((d) => (
            <path key={`${d}-o`} d={d} stroke="#7d5533" strokeWidth="16.5" opacity="0.35" />
          ))}
          {p.arms.map((d) => (
            <path key={`${d}-i`} d={d} stroke="#a97d4e" strokeWidth="13" />
          ))}
        </g>

        {state === "celebrate" ? (
          <g className={animate ? "capy-sparkle" : undefined}>
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
      <g className={animate ? "capy-sparkle" : undefined}>
        <g transform="translate(74 116)">
          <circle cx="0" cy="0" r="26" fill="#f2b23f" stroke="#d9952f" strokeWidth="2" />
          <circle cx="0" cy="0" r="21" fill="#fbd68c" />
          <g stroke="#f2b23f" strokeWidth="2.4" strokeLinecap="round">
            <path d="M0 -20 V20" />
            <path d="M-17 -10 L17 10" />
            <path d="M-17 10 L17 -10" />
          </g>
          <circle cx="0" cy="0" r="4" fill="#f2b23f" />
        </g>
        <g fill="#c19769">
          <ellipse cx="132" cy="126" rx="16" ry="12" />
          <circle cx="119" cy="116" r="5" />
          <circle cx="128" cy="112" r="5" />
          <circle cx="137" cy="112" r="5" />
          <circle cx="146" cy="116" r="5" />
        </g>
      </g>
      <g stroke="#c9a97e" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.8">
        <path d="M148 52 q10 6 4 16 q-6 8 3 14" />
        <path d="M44 54 q-10 6 -4 16 q6 8 -3 14" />
      </g>
    </svg>
  ),
};

export default art;
