"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icons";
import { listExperiences } from "@/experiences/registry";
import type { ExperienceId } from "@/experiences/types";

export interface ExperienceSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (experienceId: ExperienceId) => void;
  senderName: string;
}

export function ExperienceSelectionModal({
  isOpen,
  onClose,
  onSelect,
  senderName,
}: ExperienceSelectionModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const firstButtonRef = useRef<HTMLButtonElement | null>(null);

  const portalNode = typeof document !== "undefined"
    ? (document.getElementById("presentation-modal-root") ?? document.body)
    : null;
  const isContained = portalNode?.id === "presentation-modal-root";

  const experiences = listExperiences();

  useEffect(() => {
    if (!isOpen) return;

    triggerRef.current = document.activeElement as HTMLElement | null;
    firstButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true");

        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen || !portalNode) return null;

  return createPortal(
    <div
      role="presentation"
      className={
        isContained
          ? "pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs"
          : "pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      }
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="experience-selection-title"
        aria-describedby="experience-selection-desc"
        className={cn(
          "flex w-full max-w-[calc(100%-0.75rem)] sm:max-w-[380px] flex-col overflow-hidden rounded-3xl border border-[#eeddf5] bg-white p-4 sm:p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200",
          isContained ? "max-h-[92%]" : "max-h-[90vh]"
        )}
      >
        <div className="flex items-center justify-between border-b border-[#f3eaf8] pb-3.5">
          <div className="min-w-0 pr-2">
            <h2
              id="experience-selection-title"
              className="text-base font-bold text-[#33203f] truncate"
            >
              Create an experience for {senderName}
            </h2>
            <p
              id="experience-selection-desc"
              className="mt-0.5 text-xs text-[#7d6892]"
            >
              Choose a complete interactive experience to send in return.
            </p>
          </div>
          <button
            ref={firstButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close experience selection"
            className="shrink-0 rounded-full p-1.5 text-[#917d9e] hover:bg-[#f6effa] hover:text-[#33203f] transition-colors"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {experiences.map((exp) => (
            <button
              key={exp.id}
              type="button"
              onClick={() => onSelect(exp.id)}
              className="group flex w-full items-start gap-3.5 rounded-2xl border border-[#eee2f6] p-4 text-left transition-all hover:border-[#d9bee9] hover:bg-[#faf5fc] motion-safe:active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#7c4ddb]"
            >
              <div
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-sm"
                style={{ backgroundColor: exp.accent }}
              >
                {exp.name.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-[#33203f] group-hover:text-[#6d3fa8] transition-colors">
                    {exp.name}
                  </span>
                  <span className="text-[0.68rem] font-medium uppercase tracking-wider text-[#9882a9] group-hover:text-[#6d3fa8] flex items-center gap-1">
                    Select <Icon name="arrow-right" size={12} />
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#715c85] leading-relaxed">
                  {exp.tagline}
                </p>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-5 border-t border-[#f4edf9] pt-3 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-[#8a729e] hover:text-[#523d68] transition-colors"
          >
            Cancel and return to letter
          </button>
        </div>
      </div>
    </div>,
    portalNode,
  );
}
