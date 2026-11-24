"use client";

import { motion } from "framer-motion";
import type { BirthdayTheme } from "@/experiences/birthday/themes";
import { Icon } from "@/components/ui/icons";

interface BirthdayMessageCardProps {
  senderName: string;
  recipientName: string;
  message: string;
  photos?: string[];
  theme: BirthdayTheme;
  className?: string;
}

export function BirthdayMessageCard({
  senderName,
  recipientName,
  message,
  photos = [],
  theme,
  className = "",
}: BirthdayMessageCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.96 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className={`relative mx-auto w-full max-w-[520px] rounded-3xl p-7 sm:p-9 shadow-lg ${className}`}
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
            Personal Letter
          </p>
          <p className="text-xs font-medium opacity-75" style={{ color: theme.palette.mutedText }}>
            Dear {recipientName},
          </p>
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: `${theme.palette.accent}20`, color: theme.palette.primary }}>
          <Icon name="message" size={15} />
        </div>
      </div>

      {/* Main Message Body */}
      <div className="text-left">
        <p
          className="whitespace-pre-line text-[clamp(1.05rem,3.2vw,1.3rem)] leading-relaxed font-normal"
          style={{
            fontFamily: theme.typography.bodyFont,
            color: theme.palette.text,
          }}
        >
          {message}
        </p>
      </div>

      {/* Attached Celebration Photos (if present) */}
      {photos.length > 0 && (
        <div className="mt-8 pt-6 border-t" style={{ borderColor: theme.palette.border }}>
          <p className="text-[11px] uppercase tracking-[0.16em] font-semibold mb-3 text-left" style={{ color: theme.palette.mutedText }}>
            Celebration Moments
          </p>
          <div className="grid grid-cols-2 gap-3">
            {photos.map((photo, i) => (
              <div
                key={`photo-${i}`}
                className="overflow-hidden rounded-2xl p-1.5 shadow-sm transition-transform hover:scale-102"
                style={{
                  background: theme.palette.background,
                  border: `1px solid ${theme.palette.border}`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo}
                  alt={`Birthday memory ${i + 1}`}
                  className="h-32 sm:h-36 w-full rounded-xl object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signature Sign-Off */}
      <div className="mt-8 pt-4 text-right">
        <p className="text-xs italic opacity-75" style={{ color: theme.palette.mutedText }}>
          With warmest wishes,
        </p>
        <p
          className="text-lg font-bold"
          style={{
            fontFamily: theme.typography.headingFont,
            color: theme.palette.primary,
          }}
        >
          {senderName}
        </p>
      </div>
    </motion.div>
  );
}
