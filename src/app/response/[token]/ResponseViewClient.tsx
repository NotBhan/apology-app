"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMounted } from "@/hooks/useMounted";
import { Icon } from "@/components/ui/icons";
import { OptimizedPhoto } from "@/components/ui/OptimizedPhoto";
import { resolveEmotionBadge } from "@/experiences/emotion";
import type { PublishedResponse, QuickReplyPayload, ExperienceReplyPayload } from "@/types/response";
import type { PublishedApology } from "@/types/apology";
import { birthdayContentSchema } from "@/experiences/birthday/schema";
import { BirthdayLetter } from "@/components/presentation/BirthdayLetter";
import { missYouContentSchema } from "@/experiences/miss-you/schema";
import { MissYouLetter } from "@/components/presentation/MissYouLetter";
import { draftPayloadSchema } from "@/lib/validation/apology";
import { PresentationEngine } from "@/components/presentation/PresentationEngine";
import { getTheme, THEMES } from "@/themes/registry";
import type { ApologyContent } from "@/presentation/build-scenes";

export interface ResponseViewClientProps {
  response: PublishedResponse;
  parent: Pick<PublishedApology, "recipientName" | "senderName" | "publishedAt"> & {
    token?: string;
    experienceType?: string;
  };
  token: string;
}

export function ResponseViewClient({ response, parent, token }: ResponseViewClientProps) {
  const mounted = useMounted();
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const triggerPhotoRef = useRef<HTMLButtonElement | null>(null);
  const lightboxCloseRef = useRef<HTMLButtonElement | null>(null);

  const content = response.content as QuickReplyPayload;
  const photos = content.photos ?? [];
  const emotionBadge = resolveEmotionBadge(parent?.experienceType, content.recipientEmotion);

  // Close lightbox on Escape key and restore focus
  useEffect(() => {
    if (!selectedPhoto) return;

    // Focus lightbox close button on open
    lightboxCloseRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedPhoto(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      triggerPhotoRef.current?.focus();
    };
  }, [selectedPhoto]);

  // Handle Experience Replies (Apology / Birthday / I Miss You)
  if (response.responseType === "experience") {
    const expPayload = response.content as ExperienceReplyPayload;

    if (expPayload?.experienceType === "birthday") {
      const parsed = birthdayContentSchema.safeParse(expPayload.content);
      if (parsed.success) {
        const tokenizedPhotos = appendTokenToPhotoItems(parsed.data.photos, token);
        return (
          <div className="relative min-h-svh w-full bg-[#faf6ff] pt-14">
            <ResponseContextBanner parent={parent} />
            <BirthdayLetter content={{ ...parsed.data, photos: tokenizedPhotos }} />
          </div>
        );
      }
    }

    if (expPayload?.experienceType === "miss-you") {
      const parsed = missYouContentSchema.safeParse(expPayload.content);
      if (parsed.success) {
        const tokenizedPhotos = appendTokenToPhotoItems(parsed.data.photos, token);
        return (
          <div className="relative min-h-svh w-full bg-[#faf6ff] pt-14">
            <ResponseContextBanner parent={parent} />
            <MissYouLetter content={{ ...parsed.data, photos: tokenizedPhotos }} />
          </div>
        );
      }
    }

    if (expPayload?.experienceType === "apology") {
      const parsed = draftPayloadSchema.safeParse(expPayload.content);
      if (parsed.success) {
        const theme = getTheme(parsed.data.themeId) ?? THEMES.romantic;
        const tokenizedApologyPhotos = parsed.data.customization.photos.map((photo) => ({
          ...photo,
          url: appendTokenToAssetUrl(photo.url, token),
        }));
        const contentWithTokens: ApologyContent = {
          ...(parsed.data as ApologyContent),
          customization: {
            ...parsed.data.customization,
            photos: tokenizedApologyPhotos,
          },
        };
        return (
          <div className="relative flex h-svh w-full flex-col overflow-hidden bg-[#faf6ff] pt-14">
            <ResponseContextBanner parent={parent} />
            <PresentationEngine
              content={contentWithTokens}
              theme={theme}
              mode="live"
              className="min-h-0 flex-1 w-full"
            />
          </div>
        );
      }
    }
  }

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
            <p className="whitespace-pre-line break-words text-[clamp(1.02rem,3vw,1.18rem)] leading-relaxed text-[#33203f]">
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
                      onClick={(e) => {
                        triggerPhotoRef.current = e.currentTarget;
                        setSelectedPhoto(assetUrl);
                      }}
                      aria-label={`View enlarged photo ${idx + 1}`}
                      className="group relative aspect-square overflow-hidden rounded-2xl border border-[#e4d7f0] bg-[#fbf9fe] p-1.5 shadow-sm transition motion-safe:active:scale-95"
                    >
                      <div className="relative h-full w-full overflow-hidden rounded-xl">
                        <OptimizedPhoto
                          src={assetUrl}
                          alt={`Memory moment ${idx + 1}`}
                          priority={idx === 0}
                          className="object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
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
          aria-label="Enlarged photo view"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPhoto(null);
          }}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <button
              ref={lightboxCloseRef}
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-10 right-0 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
              aria-label="Close photo"
            >
              <Icon name="x" size={20} />
            </button>
            <div className="h-[70vh] w-[min(90vw,760px)] overflow-hidden rounded-2xl shadow-2xl">
              <OptimizedPhoto
                src={selectedPhoto}
                alt="Enlarged photo"
                priority
                className="object-contain"
                placeholderClassName="bg-stone-800"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function appendTokenToAssetUrl(url: string, token: string): string {
  if (!url.startsWith("/api/responses/assets/") || url.includes("token=")) return url;
  const joiner = url.includes("?") ? "&" : "?";
  return `${url}${joiner}token=${encodeURIComponent(token)}`;
}

function appendTokenToPhotoItems<
  T extends string | { url: string; caption?: string; focalPoint?: string; width?: number; height?: number },
>(photos: T[], token: string): T[] {
  return photos.map((item) => {
    if (typeof item === "string") {
      return appendTokenToAssetUrl(item, token) as T;
    }
    const photoObj = item as Exclude<T, string>;
    return {
      ...photoObj,
      url: appendTokenToAssetUrl(photoObj.url, token),
    } as T;
  });
}

function ResponseContextBanner({ parent }: { parent: ResponseViewClientProps["parent"] }) {
  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-40 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center justify-center gap-x-2 gap-y-0.5 rounded-full border border-[#eeddf5] bg-white/95 px-3.5 py-1.5 shadow-md backdrop-blur-sm">
      <Link
        href="/"
        className="text-[0.68rem] font-bold uppercase tracking-wider text-[#7c4ddb] hover:opacity-80"
      >
        Koi Koi
      </Link>
      <span className="text-[#d8c3e8]">·</span>
      <span className="text-xs font-medium text-[#6b5580]">
        In response to <span className="font-semibold text-[#33203f]">{parent?.senderName ?? "them"}</span>
      </span>
      {parent?.token ? (
        <>
          <span className="text-[#d8c3e8]">·</span>
          <Link
            href={`/letter/${parent.token}`}
            className="text-xs font-semibold text-[#7c4ddb] hover:underline"
          >
            View original letter
          </Link>
        </>
      ) : null}
    </div>
  );
}
