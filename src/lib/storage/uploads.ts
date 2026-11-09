import "server-only";
import { randomId } from "@/lib/id";
import { FirebaseUploadStore, FileUploadStore, firebaseStorageConfigured } from "./upload-store";
import type { UploadStore } from "./upload-store";

/**
 * Upload validation and the public upload API.
 *
 * Rules this module enforces:
 * - The declared MIME type is never trusted on its own; the bytes are sniffed
 *   and the recorded type comes from the signature, not from the client.
 * - The asset id is generated here with `randomId`, so a client filename can
 *   never become a path (no traversal, no collisions, no overwrites).
 * - Storage itself is pluggable: `.data/uploads` locally, Firebase Storage in
 *   production, where the filesystem is ephemeral.
 */

/** `randomId()` is 22 base64url chars; the pattern is the only id we ever touch. */
const ASSET_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_AUDIO_BYTES = 8 * 1024 * 1024; // 8 MB

export const PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const AUDIO_MIME_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
] as const;

export const UPLOAD_MIME_TYPES = [...PHOTO_MIME_TYPES, ...AUDIO_MIME_TYPES] as const;

export type UploadMime = (typeof UPLOAD_MIME_TYPES)[number];
export type UploadKind = "photo" | "audio";

export interface UploadAsset {
  id: string;
  kind: UploadKind;
  mime: UploadMime;
  /** Size in bytes, as recorded when the file was accepted. */
  size: number;
  createdAt: string;
  /**
   * The apology this asset belongs to. Media is only served while that
   * apology is live, or to its owner — so an expired letter cannot leave its
   * photos reachable through a saved URL.
   */
  apologyId: string;
  /** SHA-256 of the creator key, so the owner can always preview their own art. */
  ownerKeyHash: string;
}

export interface StoredUpload {
  asset: UploadAsset;
  bytes: Uint8Array;
}

export interface SaveUploadInput {
  data: Uint8Array;
  /** The `File.type` reported by the browser — a hint we verify, never trust. */
  declaredMime?: string;
  /** Owning apology; required so media access can follow the link lifetime. */
  apologyId: string;
  ownerKeyHash: string;
}

/** A rejected upload. `status` is the HTTP status the route should return. */
export class UploadError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "UploadError";
    this.status = status;
  }
}

/* -------------------------------------------------------------------------- */
/* Store selection                                                            */
/* -------------------------------------------------------------------------- */

let store: UploadStore | null = null;

/** Firebase Storage when credentials exist, otherwise the local filesystem. */
export function getUploadStore(): UploadStore {
  if (store) return store;
  store = firebaseStorageConfigured() ? new FirebaseUploadStore() : new FileUploadStore();
  return store;
}

export function uploadBackend(): UploadStore["backend"] {
  return getUploadStore().backend;
}

/** Test seam: drops the memoised store so a suite can swap backends. */
export function resetUploadStoreForTests() {
  store = null;
}

/* -------------------------------------------------------------------------- */
/* Magic-byte detection                                                       */
/* -------------------------------------------------------------------------- */

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47]; // \x89PNG
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const EBML_SIGNATURE = [0x1a, 0x45, 0xdf, 0xa3]; // WebM (Matroska container)

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i += 1) {
    if (bytes[offset + i] !== signature[i]) return false;
  }
  return true;
}

/** ASCII comparison at an offset, e.g. `RIFF` or `WEBP`. */
function asciiAt(bytes: Uint8Array, offset: number, text: string): boolean {
  if (bytes.length < offset + text.length) return false;
  for (let i = 0; i < text.length; i += 1) {
    if (bytes[offset + i] !== text.charCodeAt(i)) return false;
  }
  return true;
}

/**
 * Sniffs the real file type from its leading bytes.
 * Returns `undefined` for anything not on the allowlist.
 */
export function sniffUploadMime(bytes: Uint8Array): UploadMime | undefined {
  if (startsWith(bytes, PNG_SIGNATURE)) return "image/png";
  if (startsWith(bytes, JPEG_SIGNATURE)) return "image/jpeg";

  // RIFF container: bytes 0-3 are "RIFF", bytes 8-11 name the actual format.
  if (asciiAt(bytes, 0, "RIFF")) {
    if (asciiAt(bytes, 8, "WEBP")) return "image/webp";
    if (asciiAt(bytes, 8, "WAVE")) return "audio/wav";
  }

  if (asciiAt(bytes, 0, "OggS")) return "audio/ogg";

  // MP3: either an ID3v2 tag, or an MPEG audio frame sync (FF Ex/FF Fx).
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
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Validates the bytes and persists them under a freshly generated id.
 * Throws `UploadError` with 400/413/415 for anything a caller can fix.
 */
export async function saveUpload(input: SaveUploadInput): Promise<UploadAsset> {
  const { data } = input;

  if (data.byteLength === 0) {
    throw new UploadError(400, "That file is empty.");
  }
  // Hard ceiling before sniffing: nothing above the largest limit is accepted.
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

  // The declared type is only checked for contradiction with the real bytes.
  const declared = normalizeMime(input.declaredMime);
  if (declared && isAllowedMime(declared) && declared !== mime) {
    throw new UploadError(415, "The file contents do not match the type it claims to be.");
  }

  const asset: UploadAsset = {
    id: randomId(),
    kind,
    mime,
    size: data.byteLength,
    createdAt: new Date().toISOString(),
    apologyId: input.apologyId,
    ownerKeyHash: input.ownerKeyHash,
  };

  await getUploadStore().save(asset, data);
  return asset;
}

/** Reads one asset. Returns `undefined` for unknown or malformed ids. */
export async function readUpload(id: string): Promise<StoredUpload | undefined> {
  if (!isValidAssetId(id)) return undefined;
  return getUploadStore().read(id);
}

/** Newest first. Asset ids are capability tokens, so this is for the creator. */
export async function listUploads(): Promise<UploadAsset[]> {
  return getUploadStore().list();
}

/** Idempotent: removing something that is already gone is not an error. */
export async function removeUpload(id: string): Promise<void> {
  if (!isValidAssetId(id)) return;
  await getUploadStore().remove(id);
}

/** Cheap existence probe used to verify a purge actually removed the bytes. */
export async function uploadExists(id: string): Promise<boolean> {
  if (!isValidAssetId(id)) return false;
  return getUploadStore().stat(id);
}
