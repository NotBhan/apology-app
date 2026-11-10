import QRCode from "qrcode";

/**
 * QR rendering.
 *
 * Runs entirely in-process — no external image or QR service. The payload is
 * always a canonical `/letter/<token>` URL supplied by the caller, never
 * rebuilt here, so a QR can only ever point at a link the server issued.
 */
export const QR_OPTIONS = {
  errorCorrectionLevel: "H" as const,
  width: 1024,
  margin: 4,
  color: { dark: "#000000", light: "#ffffff" },
};

export function qrFilename(experienceType: string): string {
  const safe = experienceType.replace(/[^a-z0-9-]/gi, "").toLowerCase() || "experience";
  return `koi-koi-${safe}-qr.png`;
}

/** Absolute URL for a canonical path, using the current origin. */
export function absoluteRecipientUrl(path: string): string {
  return new URL(path, window.location.origin).toString();
}

export async function renderQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, QR_OPTIONS);
}

/** PNG bytes, so the same image can be downloaded and shared as a file. */
export async function renderQrBlob(url: string): Promise<Blob> {
  const response = await fetch(await renderQrDataUrl(url));
  return response.blob();
}
