"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/cn";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "quiet";
  size?: "md" | "lg";
  full?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", full, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45",
        size === "lg" ? "min-h-12 px-7 text-[0.95rem]" : "min-h-10 px-5 text-sm",
        full && "w-full",
        variant === "primary" &&
          "bg-[#6d3fa8] text-white shadow-[0_10px_24px_-14px_rgba(109,63,168,0.85)] hover:bg-[#5f3596]",
        variant === "secondary" &&
          "border border-[#e3d7ef] bg-white text-[#3d2a50] hover:border-[#c9b6dd]",
        variant === "ghost" && "text-[#6b5580] hover:text-[#3d2a50]",
        variant === "quiet" && "bg-[#f2ecfa] text-[#5b3f7d] hover:bg-[#e9e0f6]",
        className,
      )}
      {...props}
    />
  );
});
