"use client";

import type { CharacterState } from "@/types/sticker";
import type { StickerArtProps, StickerPackArt } from "../types";

type CharacterProps = StickerArtProps & { state: CharacterState };

type EyeStyle = "open" | "blink" | "happy" | "sad" | "closed" | "up" | "content";
type MouthStyle = "neutral" | "smile" | "teeth" | "frown" | "wobble" | "tiny" | "sing";

interface BunnyPose {
  /** springy squash & stretch applied around the feet */
  body: string;
  head: string;
  earL: string;
  earR: string;
  arms: readonly string[];
  tail: string;
  eyes: EyeStyle;
  mouth: MouthStyle;
  teeth: boolean;
}

const POSE: Record<CharacterState, BunnyPose> = {
  idle: {
    body: "",
    head: "",
    earL: "rotate(-4 86 64)",
    earR: "rotate(4 114 64)",
    arms: ["M76 130 C68 138 67 148 70 156", "M124 130 C132 138 133 148 130 156"],
    tail: "translate(64 156)",
    eyes: "open",
    mouth: "neutral",
    teeth: false,
  },
  blink: {
    body: "",
    head: "",
    earL: "rotate(-4 86 64)",
    earR: "rotate(4 114 64)",
    arms: ["M76 130 C68 138 67 148 70 156", "M124 130 C132 138 133 148 130 156"],
    tail: "translate(64 156)",
    eyes: "blink",
    mouth: "neutral",
    teeth: false,
  },
  happy: {
    body: "translate(100 180) scale(1.035 1.055) translate(-100 -180)",
    head: "translate(0 -4) rotate(-4 100 118)",
    earL: "rotate(-13 86 64)",
    earR: "rotate(13 114 64)",
    arms: ["M74 126 C60 126 52 114 54 102", "M126 126 C140 126 148 114 146 102"],
    tail: "translate(62 152)",
    eyes: "happy",
    mouth: "teeth",
    teeth: true,
  },
  sad: {
    body: "translate(100 180) scale(0.985 0.975) translate(-100 -180)",
    head: "translate(0 7) rotate(4 100 118)",
    earL: "rotate(-27 86 64)",
    earR: "rotate(27 114 64)",
    arms: ["M77 132 C70 142 72 151 78 155", "M123 132 C130 142 128 151 122 155"],
    tail: "translate(66 160)",
    eyes: "sad",
    mouth: "frown",
    teeth: false,
  },
  crying: {
    body: "translate(0 5)",
    head: "translate(0 9) rotate(3 100 118)",
    earL: "rotate(-34 86 64)",
    earR: "rotate(34 114 64)",
    arms: ["M76 130 C68 120 68 108 76 100", "M124 130 C132 120 132 108 124 100"],
    tail: "translate(66 162)",
    eyes: "closed",
    mouth: "wobble",
    teeth: false,
  },
  hugging: {
    body: "translate(0 1)",
    head: "translate(0 2) rotate(-12 100 118)",
    earL: "rotate(-15 86 64)",
    earR: "rotate(8 114 64)",
    arms: ["M74 126 C82 149 118 149 126 126"],
    tail: "translate(62 158)",
    eyes: "content",
    mouth: "smile",
    teeth: false,
  },
  apologizing: {
    body: "translate(0 4)",
    head: "translate(0 12)",
    earL: "rotate(-40 86 64)",
    earR: "rotate(40 114 64)",
    arms: ["M78 130 C86 141 93 146 99 147", "M122 130 C114 141 107 146 101 147"],
    tail: "translate(68 162)",
    eyes: "closed",
    mouth: "tiny",
    teeth: false,
  },
  flowers: {
    body: "translate(0 1)",
    head: "translate(0 1) rotate(-6 100 118)",
    earL: "rotate(-7 86 64)",
    earR: "rotate(11 114 64)",
    arms: ["M78 128 C78 140 82 147 88 150", "M122 128 C122 140 118 147 112 150"],
    tail: "translate(64 156)",
    eyes: "happy",
    mouth: "teeth",
    teeth: true,
  },
  heart: {
    body: "",
    head: "translate(0 1) rotate(5 100 118)",
    earL: "rotate(-18 86 64)",
    earR: "rotate(6 114 64)",
    arms: ["M76 128 C77 142 84 147 91 143", "M124 128 C123 142 116 147 109 143"],
    tail: "translate(64 156)",
    eyes: "content",
    mouth: "smile",
    teeth: false,
  },
  hopeful: {
    body: "translate(100 180) scale(1.01 1.02) translate(-100 -180)",
    head: "translate(0 -8) rotate(-2 100 118)",
    earL: "rotate(1 86 64) translate(0 -3)",
    earR: "rotate(-1 114 64) translate(0 -3)",
    arms: ["M76 130 C70 139 70 149 74 155", "M124 130 C130 139 130 149 126 155"],
    tail: "translate(64 156)",
    eyes: "up",
    mouth: "tiny",
    teeth: false,
  },
  celebrate: {
    body: "translate(100 180) scale(1.03 1.06) translate(-100 -180)",
    head: "translate(0 -6) rotate(-3 100 118)",
    earL: "rotate(-16 86 64)",
    earR: "rotate(16 114 64)",
    arms: ["M74 126 C60 118 52 102 56 90", "M126 126 C140 118 148 102 144 90"],
    tail: "translate(62 150)",
    eyes: "happy",
    mouth: "sing",
    teeth: true,
  },
};

const CSS = `
.bunny-breathe { animation: cc-breathe 4.4s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 98%; }
.bunny-blink { animation: cc-blink 5s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 50%; }
.bunny-settle { animation: bunny-settle 740ms cubic-bezier(.22,1.1,.36,1) both; transform-box: fill-box; transform-origin: 50% 98%; }
.bunny-sparkle { animation: bunny-sparkle 1.1s ease-in-out 2 both; transform-box: fill-box; transform-origin: 50% 50%; }
@keyframes bunny-settle { from { transform: translateY(-6px) scale(.985); opacity: .55 } to { transform: translateY(0) scale(1); opacity: 1 } }
@keyframes bunny-sparkle { 0%, 100% { transform: scale(.82); opacity: .35 } 50% { transform: scale(1.05); opacity: 1 } }
@media (prefers-reduced-motion: reduce) { .bunny-breathe, .bunny-blink, .bunny-settle, .bunny-sparkle { animation: none } }
`;

const INK = "#43303a";

function Eyes({ mode, animate }: { mode: EyeStyle; animate: boolean }) {
  const blinkClass = animate ? "bunny-blink" : undefined;
  if (mode === "open" || mode === "up") {
    const lift = mode === "up" ? -4 : 0;
    return (
      <g>
        <ellipse cx="85" cy={82 + lift} rx="7" ry="8.4" fill={INK} />
        <ellipse cx="115" cy={82 + lift} rx="7" ry="8.4" fill={INK} />
        <circle cx="86.5" cy={78 + lift} r="2.6" fill="#fff" opacity="0.92" />
        <circle cx="116.5" cy={78 + lift} r="2.6" fill="#fff" opacity="0.92" />
        <circle cx="82.5" cy={86 + lift} r="1.4" fill="#fff" opacity="0.55" />
        <circle cx="112.5" cy={86 + lift} r="1.4" fill="#fff" opacity="0.55" />
      </g>
    );
  }
  if (mode === "blink") {
    return (
      <g className={blinkClass}>
        <path d="M77 83 q8 4 16 0" fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />
        <path d="M107 83 q8 4 16 0" fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />
      </g>
    );
  }
  if (mode === "happy") {
    return (
      <g fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round">
        <path d="M76 84 q9 -12 18 0" />
        <path d="M106 84 q9 -12 18 0" />
      </g>
    );
  }
  if (mode === "content") {
    return (
      <g fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round">
        <path d="M78 84 q7 -7 14 0" />
        <path d="M108 84 q7 -7 14 0" />
      </g>
    );
  }
  if (mode === "sad") {
    return (
      <g>
        <ellipse cx="85" cy="84" rx="6.4" ry="6.2" fill={INK} />
        <ellipse cx="115" cy="84" rx="6.4" ry="6.2" fill={INK} />
        <path d="M77 80 q8 2 16 0" fill="none" stroke="#c39aa8" strokeWidth="2" strokeLinecap="round" />
        <path d="M107 80 q8 2 16 0" fill="none" stroke="#c39aa8" strokeWidth="2" strokeLinecap="round" />
        <circle cx="87" cy="86" r="1.8" fill="#fff" opacity="0.8" />
        <circle cx="117" cy="86" r="1.8" fill="#fff" opacity="0.8" />
        <g fill="none" stroke="#c39aa8" strokeWidth="2.2" strokeLinecap="round">
          <path d="M76 72 q8 -5 15 -1" />
          <path d="M124 72 q-8 -5 -15 -1" />
        </g>
      </g>
    );
  }
  return (
    <g fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round">
      <path d="M76 82 q9 9 18 0" />
      <path d="M106 82 q9 9 18 0" />
    </g>
  );
}

function Mouth({ mode, teeth }: { mode: MouthStyle; teeth: boolean }) {
  return (
    <g>
      {mode === "teeth" || mode === "sing" ? (
        <g>
          <path d="M91 98 Q100 108 109 98 Z" fill="#a05666" />
          <ellipse cx="100" cy="103.5" rx="4" ry="2.4" fill="#f08a92" />
        </g>
      ) : null}
      {mode === "smile" && <path d="M92 99 Q100 107 108 99" fill="none" stroke="#c39aa8" strokeWidth="2.1" strokeLinecap="round" />}
      {mode === "frown" && <path d="M93 103 Q100 96 107 103" fill="none" stroke="#c39aa8" strokeWidth="2.1" strokeLinecap="round" />}
      {mode === "wobble" && (
        <path d="M93 101 q3.5 -3.5 7 0 q3.5 3.5 7 0" fill="none" stroke="#c39aa8" strokeWidth="2.1" strokeLinecap="round" />
      )}
      {mode === "tiny" && <path d="M97 101 q3 3 6 0" fill="none" stroke="#c39aa8" strokeWidth="2.1" strokeLinecap="round" />}
      {mode === "neutral" && (
        <g fill="none" stroke="#c39aa8" strokeWidth="2" strokeLinecap="round">
          <path d="M100 95 L100 98" />
          <path d="M100 98 q-4 3 -7 0" />
          <path d="M100 98 q4 3 7 0" />
        </g>
      )}
      {teeth && (mode === "teeth" || mode === "sing") ? (
        <g>
          <rect x="95" y="101" width="5" height="8" rx="1.6" fill="#fffdf8" stroke="#d9c3c9" strokeWidth="0.9" />
          <rect x="100" y="101" width="5" height="8" rx="1.6" fill="#fffdf8" stroke="#d9c3c9" strokeWidth="0.9" />
        </g>
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
        <circle cx="0" cy="0" r="10" fill="#f6b8c8" stroke="#e39cb0" strokeWidth="1.2" />
        <path d="M-5 0 q5 -6 10 0 q-5 6 -10 0" fill="none" stroke="#dd93a6" strokeWidth="1.8" />
        <circle cx="0" cy="0" r="2.8" fill="#dd93a6" />
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
        fill="url(#bunny-heart)"
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
        <path d="M52 54 l2.4 6.4 6.4 2.4 -6.4 2.4 -2.4 6.4 -2.4 -6.4 -6.4 -2.4 6.4 -2.4 Z" />
        <path d="M150 46 l2.2 6 6 2.2 -6 2.2 -2.2 6 -2.2 -6 -6 -2.2 6 -2.2 Z" />
        <path d="M36 100 l1.8 4.8 4.8 1.8 -4.8 1.8 -1.8 4.8 -1.8 -4.8 -4.8 -1.8 4.8 -1.8 Z" />
        <path d="M166 96 l1.8 4.8 4.8 1.8 -4.8 1.8 -1.8 4.8 -1.8 -4.8 -4.8 -1.8 4.8 -1.8 Z" />
      </g>
      <g stroke="#eda75c" strokeWidth="2.4" strokeLinecap="round" fill="none">
        <path d="M64 26 l6 5" />
        <path d="M136 24 l-6 5" />
      </g>
    </g>
  );
}

function Character({ state, className, animate = true }: CharacterProps) {
  const p = POSE[state];
  const loopClass = animate ? (state === "idle" || state === "blink" ? "bunny-breathe" : "bunny-settle") : undefined;
  const blush = state === "happy" || state === "heart" || state === "celebrate" ? 0.8 : 0.55;

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role="presentation"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="bunny-fur" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffafc" />
          <stop offset="0.6" stopColor="#f7e4ea" />
          <stop offset="1" stopColor="#e6c9d5" />
        </linearGradient>
        <radialGradient id="bunny-head" cx="0.36" cy="0.28" r="0.9">
          <stop offset="0" stopColor="#fffdfe" />
          <stop offset="0.62" stopColor="#f9e7ee" />
          <stop offset="1" stopColor="#e9cdd8" />
        </radialGradient>
        <linearGradient id="bunny-ear" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbd7e1" />
          <stop offset="1" stopColor="#f2b3c5" />
        </linearGradient>
        <linearGradient id="bunny-heart" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7a3b0" />
          <stop offset="1" stopColor="#e4697f" />
        </linearGradient>
      </defs>
      {animate ? <style>{CSS}</style> : null}

      <ellipse cx="100" cy="181" rx="44" ry="7" fill="#3a2412" opacity="0.09" />

      <g className={loopClass}>
        {/* fluffy round tail */}
        <g transform={p.tail}>
          <circle cx="0" cy="0" r="9" fill="url(#bunny-fur)" stroke="#c39aa8" strokeWidth="1.6" />
          <circle cx="-7" cy="-5" r="5.4" fill="url(#bunny-fur)" stroke="#c39aa8" strokeWidth="1.4" />
          <circle cx="-6" cy="6" r="5" fill="url(#bunny-fur)" stroke="#c39aa8" strokeWidth="1.4" />
        </g>

        <g transform={p.body}>
          <path
            d="M100 110 C122 110 131 134 131 154 C131 172 118 179 100 179 C82 179 69 172 69 154 C69 134 78 110 100 110 Z"
            fill="url(#bunny-fur)"
            stroke="#c39aa8"
            strokeWidth="2"
          />
          <ellipse cx="100" cy="156" rx="20" ry="19" fill="#fffdfe" opacity="0.75" />
          <ellipse cx="86" cy="174" rx="12" ry="7" fill="#fffafc" stroke="#c39aa8" strokeWidth="1.6" />
          <ellipse cx="114" cy="174" rx="12" ry="7" fill="#fffafc" stroke="#c39aa8" strokeWidth="1.6" />
          <path d="M81 173 v4 M88 173 v4 M112 173 v4 M119 173 v4" stroke="#dbafbd" strokeWidth="1.3" strokeLinecap="round" />
        </g>

        <g transform={p.head}>
          {/* long upright ears */}
          <g transform={p.earL}>
            <ellipse cx="86" cy="36" rx="11.5" ry="31" fill="url(#bunny-fur)" stroke="#c39aa8" strokeWidth="2" />
            <ellipse cx="86" cy="38" rx="5.4" ry="22" fill="url(#bunny-ear)" />
          </g>
          <g transform={p.earR}>
            <ellipse cx="114" cy="36" rx="11.5" ry="31" fill="url(#bunny-fur)" stroke="#c39aa8" strokeWidth="2" />
            <ellipse cx="114" cy="38" rx="5.4" ry="22" fill="url(#bunny-ear)" />
          </g>
          <ellipse cx="100" cy="86" rx="34" ry="30" fill="url(#bunny-head)" stroke="#c39aa8" strokeWidth="2" />
          <ellipse cx="71" cy="94" rx="8.5" ry="4.8" fill="#f4a0b2" opacity={blush} />
          <ellipse cx="129" cy="94" rx="8.5" ry="4.8" fill="#f4a0b2" opacity={blush} />
          <g stroke="#c39aa8" strokeWidth="1.4" strokeLinecap="round" opacity="0.45" fill="none">
            <path d="M70 92 C62 90 56 89 50 88" />
            <path d="M70 97 C62 98 56 99 50 100" />
            <path d="M130 92 C138 90 144 89 150 88" />
            <path d="M130 97 C138 98 144 99 150 100" />
          </g>
          <Eyes mode={p.eyes} animate={animate} />
          <path d="M95 90 h10 l-5 6 Z" fill="#f2a0b2" stroke="#d98ba0" strokeWidth="1" strokeLinejoin="round" />
          <Mouth mode={p.mouth} teeth={p.teeth} />
          {state === "crying" && (
            <g fill="#9adcf2">
              <path transform="translate(81 94)" d="M0 0 C-4 7 -3 12 1 12 C5 12 5 7 0 0 Z" />
              <path transform="translate(119 94)" d="M0 0 C-4 7 -3 12 1 12 C5 12 5 7 0 0 Z" />
            </g>
          )}
        </g>

        {/* held props, in front of the body and under the paws */}
        {state === "flowers" ? <Bouquet /> : null}
        {state === "heart" ? <HeartProp /> : null}

        {/* paws drawn over the head so they can reach the face */}
        <g transform={p.body} fill="none" strokeLinecap="round">
          {p.arms.map((d) => (
            <path key={`${d}-o`} d={d} stroke="#c39aa8" strokeWidth="14" opacity="0.4" />
          ))}
          {p.arms.map((d) => (
            <path key={`${d}-i`} d={d} stroke="#fdf3f7" strokeWidth="10.5" />
          ))}
        </g>

        {state === "celebrate" ? (
          <g className={animate ? "bunny-sparkle" : undefined}>
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
      <g className={animate ? "bunny-sparkle" : undefined}>
        <g transform="translate(76 120)">
          <ellipse cx="0" cy="10" rx="17" ry="15" fill="#f7e4ea" stroke="#c39aa8" strokeWidth="2" />
          <ellipse cx="-14" cy="-22" rx="7" ry="20" fill="#f7e4ea" stroke="#c39aa8" strokeWidth="2" transform="rotate(-9 -14 -22)" />
          <ellipse cx="14" cy="-22" rx="7" ry="20" fill="#f7e4ea" stroke="#c39aa8" strokeWidth="2" transform="rotate(9 14 -22)" />
          <ellipse cx="-14" cy="-20" rx="3" ry="14" fill="#f2b3c5" transform="rotate(-9 -14 -20)" />
          <ellipse cx="14" cy="-20" rx="3" ry="14" fill="#f2b3c5" transform="rotate(9 14 -20)" />
          <circle cx="-5" cy="8" r="2" fill="#43303a" />
          <circle cx="5" cy="8" r="2" fill="#43303a" />
          <path d="M-3 13 q3 3 6 0" fill="none" stroke="#c39aa8" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      </g>
      <g fill="#f6c56a">
        <path d="M138 66 l2 5.4 5.4 2 -5.4 2 -2 5.4 -2 -5.4 -5.4 -2 5.4 -2 Z" />
        <path d="M156 126 l1.8 4.6 4.6 1.8 -4.6 1.8 -1.8 4.6 -1.8 -4.6 -4.6 -1.8 4.6 -1.8 Z" />
      </g>
      <path d="M42 150 q10 -14 22 -6" fill="none" stroke="#8fb45a" strokeWidth="2.6" strokeLinecap="round" opacity="0.7" />
    </svg>
  ),
};

export default art;
