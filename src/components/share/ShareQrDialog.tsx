"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { absoluteRecipientUrl, qrFilename, renderQrBlob, renderQrDataUrl } from "@/lib/sharing/qr";

type Status = { kind: "idle" | "copied" | "saved" | "failed"; message?: string };

/**
 * Share dialog for a freshly published link.
 *
 * The QR is generated locally from the canonical path the publish response
 * returned. There is no API call and no stored image: closing the dialog
 * discards it.
 */
export function ShareQrDialog({
  path,
  experienceType,
  onClose,
}: {
  path: string;
  experienceType: string;
  onClose: () => void;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);

  const url = absoluteRecipientUrl(path);
  const filename = qrFilename(experienceType);

  useEffect(() => {
    let cancelled = false;
    renderQrDataUrl(url)
      .then((value) => {
        if (!cancelled) setDataUrl(value);
      })
      .catch(() => {
        if (!cancelled) setError("The QR code could not be generated.");
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  async function share() {
    setStatus({ kind: "idle" });
    try {
      const blob = await renderQrBlob(url);
      const file = new File([blob], filename, { type: "image/png" });
      const withFiles = { files: [file], title: "Share with QR" };

      if (typeof navigator.canShare === "function" && navigator.canShare(withFiles)) {
        await navigator.share(withFiles);
        return;
      }
      if (typeof navigator.share === "function") {
        await navigator.share({ title: "Share with QR", url });
        return;
      }
      setStatus({ kind: "failed", message: "Sharing is not available here. Download instead." });
    } catch (cause) {
      // A cancelled share is not a failure, and must not report success either.
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setStatus({ kind: "failed", message: "Sharing did not complete. Download instead." });
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus({ kind: "copied", message: "Link copied." });
    } catch {
      setStatus({ kind: "failed", message: "Could not copy the link." });
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-qr-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[420px] rounded-3xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h2 id="share-qr-title" className="text-[1.1rem] font-semibold text-[#33203f]">
            Share with QR
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#8a7a9c]"
            aria-label="Close"
          >
            <Icon name="x" label="Close" />
          </button>
        </div>

        <div className="mt-4 flex justify-center rounded-2xl bg-white p-3 ring-1 ring-[#eee3f7]">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dataUrl}
              alt="QR code for this experience"
              width={320}
              height={320}
              className="h-auto w-full max-w-[320px]"
              style={{ imageRendering: "pixelated" }}
            />
          ) : (
            <div className="aspect-square w-full max-w-[320px] animate-pulse rounded-xl bg-[#f3ecfa]" />
          )}
        </div>

        <p className="mt-3 text-center text-sm text-[#6b5580]">Scan to open this experience.</p>

        {error ? (
          <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {status.message ? (
          <p
            role="status"
            className={`mt-2 rounded-lg px-3 py-2 text-sm ${
              status.kind === "failed" ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-800"
            }`}
          >
            {status.message}
          </p>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <a
            href={dataUrl ?? undefined}
            download={filename}
            aria-disabled={!dataUrl}
            onClick={() => setStatus({ kind: "saved", message: "QR downloaded." })}
            className="flex min-h-11 items-center justify-center rounded-full bg-[#6d3fa8] px-4 text-sm font-semibold text-white aria-disabled:opacity-50"
          >
            Download QR
          </a>
          <button
            type="button"
            onClick={() => void share()}
            className="flex min-h-11 items-center justify-center rounded-full border border-[#d9c9ee] px-4 text-sm font-semibold text-[#6d3fa8]"
          >
            Share QR
          </button>
          <button
            type="button"
            onClick={() => void copy()}
            className="flex min-h-11 items-center justify-center rounded-full border border-[#d9c9ee] px-4 text-sm font-semibold text-[#6d3fa8]"
          >
            Copy link
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-11 items-center justify-center rounded-full border border-transparent px-4 text-sm text-[#8a7a9c]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
