"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MessageReveal as RevealMode } from "@/types/theme";
import { cn } from "@/lib/cn";

interface RevealProps {
  text: string;
  mode: RevealMode;
  className?: string;
  /** Seconds before the reveal starts. */
  delay?: number;
  as?: "p" | "span" | "h2";
}

/**
 * One reveal primitive for every theme. The theme picks the *mode*; the
 * implementation stays consistent so motion feels authored, not accidental.
 */
export function MessageReveal({ text, mode, className, delay = 0, as = "p" }: RevealProps) {
  const reduce = useReducedMotion();
  const words = useMemo(() => text.split(/(\s+)/), [text]);
  const Tag = motion[as];

  if (reduce) {
    const Plain = as;
    return <Plain className={className}>{text}</Plain>;
  }

  if (mode === "word-stagger") {
    return (
      <Tag className={className}>
        {words.map((word, index) =>
          /^\s+$/.test(word) ? (
            <span key={`gap-${index}`}> </span>
          ) : (
            <motion.span
              key={`${word}-${index}`}
              initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                delay: delay + index * 0.035,
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="inline-block"
            >
              {word}
            </motion.span>
          ),
        )}
      </Tag>
    );
  }

  if (mode === "typewriter") {
    // Keyed by text so a new message starts its own typewriter rather than
    // resetting state inside an effect.
    return <Typewriter key={text} text={text} className={className} delay={delay} as={as} />;
  }

  if (mode === "ink") {
    return (
      <Tag
        className={cn("relative", className)}
        initial={{ opacity: 0, filter: "blur(6px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={{ delay, duration: 1.1, ease: "easeOut" }}
      >
        {text}
      </Tag>
    );
  }

  if (mode === "line-reveal") {
    return (
      <motion.div
        className="overflow-hidden"
        initial={{ clipPath: "inset(0 0 100% 0)" }}
        animate={{ clipPath: "inset(0 0 0% 0)" }}
        transition={{ delay, duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        <Tag className={className}>{text}</Tag>
      </motion.div>
    );
  }

  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: "easeOut" }}
    >
      {text}
    </Tag>
  );
}

function Typewriter({
  text,
  className,
  delay = 0,
  as = "p",
}: {
  text: string;
  className?: string;
  delay?: number;
  as?: "p" | "span" | "h2";
}) {
  const [count, setCount] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const Tag = as;

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => {
    const startTimeout = setTimeout(() => {
      timer.current = setInterval(() => {
        setCount((current) => {
          if (current >= text.length) {
            stop();
            return current;
          }
          return current + 1;
        });
      }, 26);
    }, delay * 1000);

    return () => {
      clearTimeout(startTimeout);
      stop();
    };
  }, [text, delay, stop]);

  return (
    <Tag className={className}>
      {text.slice(0, count)}
      <span aria-hidden className="opacity-40">
        {count < text.length ? "|" : ""}
      </span>
    </Tag>
  );
}
