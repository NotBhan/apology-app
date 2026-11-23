"use client";

import { useState } from "react";
import Link from "next/link";
import { useMounted } from "@/hooks/useMounted";
import { Icon } from "@/components/ui/icons";
import { resolveEmotionBadge } from "@/experiences/emotion";
import type { PublishedResponse, QuickReplyPayload } from "@/types/response";
import type { PublishedApology } from "@/types/apology";

export interface ResponseViewClientProps {
  response: PublishedResponse;
  parent: Pick<PublishedApology, "recipientName" | "senderName" | "publishedAt"> & {
    experienceType?: string;
  };
  token: string;
}

export function ResponseViewClient({ response, parent, token }: ResponseViewClientProps) {
  const mounted = useMounted();
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const content = response.content as QuickReplyPayload;
  const photos = content.photos ?? [];
  const emotionBadge = resolveEmotionBadge(parent.experienceType, content.recipientEmotion);

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center bg-[#faf6ff] px-4 py-10 sm:py-16">
      <div className="w-full max-w-[560px]">
        {/* Context Card */}
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="inline-block text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[#a394b4] hover:text-[#7a4fb0]"
          >
            Koi Koi
          </Link>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#eeddf5] bg-white px-3.5 py-1 shadow-sm">
            <span className="text-[0.74rem] font-medium text-[#6b5580]">
              In response to <span className="font-semibold text-[#33203f]">{parent.senderName}</span>
            </span>
          </div>
        </div>

        {/* Main Response Letter Card */}
        <article className="overflow-hidden rounded-3xl border border-[#ece2f6] bg-white p-6 shadow-xl sm:p-8">
          {/* Emotion Badge */}
          {emotionBadge ? (
            <div className="mb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dcc9ef] bg-[#f7f2fc] px-3.5 py-1 text-[0.75rem] font-semibold text-[#6d3fa8]">
                {emotionBadge.prefix ? <span>{emotionBadge.prefix}:</span> : null}
                <span className="font-bold underline decoration-[#cbb3e4] decoration-2 underline-offset-2">
                  {emotionBadge.label}
                </span>
              </span>
            </div>
          ) : null}

          {/* Letter Message */}
          <div className="space-y-4">
            <p className="whitespace-pre-line text-[clamp(1.02rem,3vw,1.18rem)] leading-relaxed text-[#33203f]">
              {content.message}
            </p>
          </div>

          {/* Photo Gallery */}
          {photos.length > 0 ? (
            <div className="mt-8 border-t border-[#f2e9fa] pt-6">
              <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#9b8cae]">
                Attached Moments ({photos.length})
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((photoId, idx) => {
                  const assetUrl = `/api/responses/assets/${photoId}?token=${encodeURIComponent(token)}`;
                  return (
                    <button
                      key={photoId}
                      type="button"
                      onClick={() => setSelectedPhoto(assetUrl)}
                      className="group relative aspect-square overflow-hidden rounded-2xl border border-[#e4d7f0] bg-[#fbf9fe] p-1.5 shadow-sm transition active:scale-95"
                    >
                      <div className="relative h-full w-full overflow-hidden rounded-xl">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={assetUrl}
                          alt={`Memory moment ${idx + 1}`}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Signature / Timestamp */}
          <div className="mt-8 flex items-center justify-between border-t border-[#f5edf9] pt-4 text-[0.72rem] text-[#a495b5]">
            <span>
              From {parent.recipientName}
            </span>
            <span>
              {mounted && response.publishedAt
                ? new Date(response.publishedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Recently"}
            </span>
          </div>
        </article>

        {/* Footer Note */}
        <p className="mt-6 text-center text-[0.7rem] text-[#b4a6c2]">
          Koi Koi · two-way emotional communication
        </p>
      </div>

      {/* Lightbox Modal */}
      {selectedPhoto ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-10 right-0 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
              aria-label="Close photo"
            >
              <Icon name="x" size={20} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedPhoto}
              alt="Enlarged photo"
              className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
