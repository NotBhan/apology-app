"use client";

export interface UploadedAsset {
  id: string;
  url: string;
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `Upload failed (${response.status}).`;
  } catch {
    return `Upload failed (${response.status}).`;
  }
}

/**
 * Single upload path for photos and audio. The server validates magic bytes
 * independently, so nothing here is trusted as a security boundary.
 */
export async function uploadFile(
  blob: Blob,
  kind: "photo" | "audio",
  filename: string,
): Promise<UploadedAsset> {
  const form = new FormData();
  form.append("file", blob, filename);
  form.append("kind", kind);

  const response = await fetch("/api/uploads", {
    method: "POST",
    body: form,
    cache: "no-store",
  });

  if (!response.ok) throw new Error(await readError(response));

  const body = (await response.json()) as UploadedAsset & {
    asset?: UploadedAsset;
  };

  const asset = body.asset ?? body;
  if (!asset?.id) throw new Error("The upload did not return an asset.");

  return { id: asset.id, url: asset.url ?? `/api/uploads/${encodeURIComponent(asset.id)}` };
}
