"use client";

import { cn } from "@/lib/cn";

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="block text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#7c6892]"
      >
        {label}
      </label>
      {children}
      {hint ? <p className="text-[0.72rem] leading-relaxed text-[#8a7a9c]">{hint}</p> : null}
    </div>
  );
}

const baseInput =
  "w-full rounded-2xl border border-[#e6dcf1] bg-white px-4 py-3 text-[0.95rem] text-[#33203f] placeholder:text-[#b3a5c2] outline-none transition focus:border-[#b18ade] focus:ring-4 focus:ring-[#e7dcf7]";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(baseInput, props.className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(baseInput, "min-h-28 resize-y leading-relaxed", props.className)}
    />
  );
}

export function Counter({ value, max }: { value: number; max: number }) {
  const ratio = value / max;
  return (
    <span
      className={cn(
        "text-[0.68rem] tabular-nums",
        ratio > 0.95 ? "text-[#c2410c]" : "text-[#a394b4]",
      )}
      aria-live="polite"
    >
      {value}/{max}
    </span>
  );
}
