import type { ObjectStore } from "./object-store";
import type { ApologyRepository, AssetRecord, ServingAsset } from "./types";
import { MAX_ASSETS_PER_APOLOGY, buildObjectKey, extensionForMime } from "./upload-lifecycle";
import { sanitiseStorageError } from "./filebase-errors";

/**
 * Upload validation and orchestration.
 *
 * The ordering is the invariant that prevents orphaned objects: the row is
 * reserved **before** the object exists, and completion is conditional on the
 * apology still being editable. If deletion began while the object was being
 * written, the object is removed here and never attached.
 *
 * No database transaction is held across the Filebase call.
 */

const ASSET_ID_PATTERN = /^[0-9a-f-]{36}$/i;

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
export const PRESIGN_TTL_SECONDS = 60;

export const PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const AUDIO_MIME_TYPES = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/webm"] as const;
export const UPLOAD_MIME_TYPES = [...PHOTO_MIME_TYPES, ...AUDIO_MIME_TYPES] as const;

export type UploadMime = (typeof UPLOAD_MIME_TYPES)[number];
export type UploadKind = "photo" | "audio";

export interface UploadDeps {
  repository: ApologyRepository;
  objects: ObjectStore;
}

export interface StoreUploadInput {
  data: Uint8Array;
  declaredMime?: string;
  apologyId: string;
  ownerKeyHash: string;
}

export class UploadError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "UploadError";
    this.status = status;
  }
}

/* -------------------------------------------------------------------------- */
/* Magic-byte detection                                                       */
/* -------------------------------------------------------------------------- */

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const EBML_SIGNATURE = [0x1a, 0x45, 0xdf, 0xa3];

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i += 1) {
    if (bytes[offset + i] !== signature[i]) return false;
  }
  return true;
}

function asciiAt(bytes: Uint8Array, offset: number, text: string): boolean {
  if (bytes.length < offset + text.length) return false;
  for (let i = 0; i < text.length; i += 1) {
    if (bytes[offset + i] !== text.charCodeAt(i)) return false;
  }
  return true;
}

/** Sniffs the real file type from its leading bytes; never trusts the client. */
export function sniffUploadMime(bytes: Uint8Array): UploadMime | undefined {
  if (startsWith(bytes, PNG_SIGNATURE)) return "image/png";
  if (startsWith(bytes, JPEG_SIGNATURE)) return "image/jpeg";

  if (asciiAt(bytes, 0, "RIFF")) {
    if (asciiAt(bytes, 8, "WEBP")) return "image/webp";
    if (asciiAt(bytes, 8, "WAVE")) return "audio/wav";
  }

  if (asciiAt(bytes, 0, "OggS")) return "audio/ogg";

  if (asciiAt(bytes, 0, "ID3")) return "audio/mpeg";
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
    return "audio/mpeg";
  }

  if (startsWith(bytes, EBML_SIGNATURE)) return "audio/webm";

  return undefined;
}

function isAllowedMime(value: string): value is UploadMime {
  return (UPLOAD_MIME_TYPES as readonly string[]).includes(value);
}

function normalizeMime(value: string | undefined): string {
  if (!value) return "";
  return (value.split(";")[0] ?? "").trim().toLowerCase();
}

export function kindForMime(mime: UploadMime): UploadKind {
  return mime.startsWith("image/") ? "photo" : "audio";
}

export function isValidAssetId(id: string): boolean {
  return ASSET_ID_PATTERN.test(id);
}

/* -------------------------------------------------------------------------- */
/* Orchestration                                                              */
/* -------------------------------------------------------------------------- */

export async function storeUpload(
  deps: UploadDeps,
  input: StoreUploadInput,
): Promise<AssetRecord> {
  const { data } = input;

  if (data.byteLength === 0) throw new UploadError(400, "That file is empty.");
  if (data.byteLength > MAX_AUDIO_BYTES) {
    throw new UploadError(413, "Files must be 8 MB or smaller.");
  }

  const mime = sniffUploadMime(data);
  if (!mime) {
    throw new UploadError(
      415,
      "Unsupported file. Use a JPEG, PNG, WebP, MP3, WAV, OGG or WebM file.",
    );
  }

  const kind = kindForMime(mime);
  const limit = kind === "photo" ? MAX_PHOTO_BYTES : MAX_AUDIO_BYTES;
  if (data.byteLength > limit) {
    throw new UploadError(
      413,
      kind === "photo" ? "Photos must be 5 MB or smaller." : "Audio must be 8 MB or smaller.",
    );
  }

  const declared = normalizeMime(input.declaredMime);
  if (declared && isAllowedMime(declared) && declared !== mime) {
    throw new UploadError(415, "The file contents do not match the type it claims to be.");
  }

  // 1. Reserve — the key exists in the database before the object exists.
  const objectKey = buildObjectKey(input.apologyId, extensionForMime(mime));
  const reservation = await deps.repository.reserveAsset({
    apologyId: input.apologyId,
    ownerKeyHash: input.ownerKeyHash,
    objectKey,
    kind,
    contentType: mime,
    sizeBytes: data.byteLength,
    maxAssets: MAX_ASSETS_PER_APOLOGY,
  });

  if (!reservation) {
    throw new UploadError(409, "This letter can no longer be edited.");
  }

  // 2. Upload, outside any transaction.
  try {
    await deps.objects.put(objectKey, data, mime);
  } catch (error) {
    await deps.repository.failAsset(reservation.id).catch(() => undefined);
    throw new UploadError(502, `Upload failed (${sanitiseStorageError(error)}).`);
  }

  // 3. Complete, conditionally.
  const completed = await deps.repository.completeAsset(
    reservation.id,
    input.apologyId,
    input.ownerKeyHash,
  );

  if (!completed) {
    // Deletion started mid-upload. The key is already in the job snapshot, so
    // this is belt-and-braces; a failure here still leaves it recoverable.
    await deps.objects.deleteMany([objectKey]).catch(() => undefined);
    await deps.repository.failAsset(reservation.id).catch(() => undefined);
    throw new UploadError(409, "This letter can no longer be edited.");
  }

  return completed;
}

export async function presignAssetUrl(
  deps: Pick<UploadDeps, "objects">,
  asset: ServingAsset,
): Promise<string> {
  return deps.objects.presignGet(asset.objectKey, PRESIGN_TTL_SECONDS);
}
