"use client";

import { motion } from "framer-motion";
import { useReducedMotionSafe } from "@/hooks/useMounted";
import type { BirthdayTheme } from "@/experiences/birthday/themes";
import { normalizeBirthdayPhotos, type BirthdayPhotoItem } from "@/experiences/birthday/schema";
import { Icon } from "@/components/ui/icons";
import { OptimizedPhoto } from "@/components/ui/OptimizedPhoto";

interface BirthdayMessageCardProps {
  senderName: string;
  recipientName: string;
  message: string;
  photos?: BirthdayPhotoItem[];
  theme: BirthdayTheme;
  animate?: boolean;
  heading?: string;
  signOff?: string;
  textScale?: string;
  alignment?: "center" | "left";
  className?: string;
}

export function BirthdayMessageCard({
  senderName,
  recipientName,
  message,
  photos = [],
  theme,
  animate = true,
  heading = "Personal Letter",
  signOff = "With warmest wishes,",
  textScale = "1",
  alignment = "center",
  className = "",
}: BirthdayMessageCardProps) {
  const reduce = useReducedMotionSafe();
  const still = reduce || !animate;
  const normalizedPhotos = normalizeBirthdayPhotos(photos);
  return (
    <motion.div
      initial={still ? false : { opacity: 0, y: 24, scale: 0.96 }}
      animate={still ? undefined : { opacity: 1, y: 0, scale: 1 }}
      exit={still ? undefined : { opacity: 0, y: -20, scale: 0.96 }}
      transition={still ? { duration: 0 } : { duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className={`relative mx-auto w-full max-w-[520px] rounded-3xl p-6 sm:p-9 shadow-lg ${className}`}
      style={{
        background: theme.palette.surface,
        border: `1.5px solid ${theme.palette.border}`,
        color: theme.palette.text,
      }}
    >
      {/* Stationery Header */}
      <div className="flex items-center justify-between border-b pb-4 mb-6" style={{ borderColor: theme.palette.border }}>
        <div className="text-left">
          <p className="text-[10px] uppercase font-bold tracking-[0.2em]" style={{ color: theme.palette.accent }}>
            {heading}
          </p>
          <p className="text-xs font-medium opacity-75" style={{ color: theme.palette.mutedText }}>
            Dear {recipientName || "Friend"},
          </p>
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: `${theme.palette.accent}20`, color: theme.palette.primary }}>
          <Icon name="message" size={15} />
        </div>
      </div>

      {/* Main Message Body */}
      <div className={alignment === "center" ? "text-center" : "text-left"}>
        <p
          className="whitespace-pre-line text-[clamp(1.05rem,3.2vw,1.3rem)] leading-relaxed font-normal"
          style={{
            fontFamily: theme.typography.bodyFont,
            fontSize: `calc(clamp(1.05rem, 3.2vw, 1.3rem) * ${textScale})`,
            color: theme.palette.text,
          }}
        >
          {message}
        </p>
      </div>

      {/* Attached Celebration Photos (if present) */}
      {normalizedPhotos.length > 0 && (
        <div className="mt-8 pt-6 border-t" style={{ borderColor: theme.palette.border }}>
          <p className="text-[11px] uppercase tracking-[0.16em] font-semibold mb-3 text-left" style={{ color: theme.palette.mutedText }}>
            Celebration Moments
          </p>
          <div className="grid grid-cols-2 gap-3">
            {normalizedPhotos.map((photo, i) => (
              <div
                key={photo.id || `photo-${i}`}
                className="overflow-hidden rounded-2xl p-1.5 shadow-sm transition-transform hover:scale-102"
                style={{
                  background: theme.palette.background,
                  border: `1px solid ${theme.palette.border}`,
                }}
              >
                <div className="h-32 sm:h-36 w-full overflow-hidden rounded-xl bg-stone-100">
                  <OptimizedPhoto
                    src={photo.url}
                    alt={photo.caption || `Birthday memory ${i + 1}`}
                    focalPoint={photo.focalPoint || "50% 50%"}
                    className="object-cover"
                  />
                </div>
                {photo.caption ? (
                  <p
                    className="mt-1 truncate text-center text-[10px] opacity-75"
                    style={{ color: theme.palette.mutedText }}
                  >
                    {photo.caption}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signature Sign-Off */}
      <div className="mt-8 pt-4 text-right">
        <p className="text-xs italic opacity-75" style={{ color: theme.palette.mutedText }}>
          {signOff}
        </p>
        <p
          className="text-lg font-bold"
          style={{
            fontFamily: theme.typography.headingFont,
            color: theme.palette.primary,
          }}
        >
          {senderName || "Your friend"}
        </p>
      </div>
    </motion.div>
  );
}
