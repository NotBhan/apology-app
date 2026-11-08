import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomId } from "@/lib/id";

/**
 * Upload store (photos + audio) for the filesystem deployment.
 *
 * Rules this module enforces:
 * - The declared MIME type is never trusted on its own; the bytes are sniffed
 *   and the recorded type comes from the signature, not from the client.
 * - The asset id is generated here with `randomId`, so a client filename can
 *   never become a path (no traversal, no collisions, no overwrites).
 * - Bytes live at `.data/uploads/<assetId>` with a `.json` sidecar holding only
 *   `{ id, kind, mime, size, createdAt }`.
 */

const UPLOADS_DIR = path.join(process.cwd(), ".data", "uploads");

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
}

export interface StoredUpload {
  asset: UploadAsset;
  bytes: Uint8Array;
}

export interface SaveUploadInput {
  data: Uint8Array;
  /** The `File.type` reported by the browser — a hint we verify, never trust. */
  declaredMime?: string;
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

/* -------------------------------------------------------------------------- */
/* Paths                                                                      */
/* -------------------------------------------------------------------------- */

export function isValidAssetId(id: string): boolean {
  return ASSET_ID_PATTERN.test(id);
}

function assetPath(id: string): string {
  return path.join(UPLOADS_DIR, id);
}

function metaPath(id: string): string {
  return path.join(UPLOADS_DIR, `${id}.json`);
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

function isEnoent(error: unknown): boolean {
  return (error as NodeJS.ErrnoException)?.code === "ENOENT";
}

async function readJson<T>(file: string): Promise<T | undefined> {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if (isEnoent(error)) return undefined;
    throw error;
  }
}

async function writeJson(file: string, value: unknown): Promise<void> {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(tmp, file);
}

function isUploadAsset(value: unknown): value is UploadAsset {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    isValidAssetId(record.id) &&
    (record.kind === "photo" || record.kind === "audio") &&
    typeof record.mime === "string" &&
    isAllowedMime(record.mime) &&
    typeof record.size === "number" &&
    Number.isFinite(record.size) &&
    record.size >= 0 &&
    typeof record.createdAt === "string"
  );
}

async function readAssetMeta(id: string): Promise<UploadAsset | undefined> {
  if (!isValidAssetId(id)) return undefined;
  const raw = await readJson<unknown>(metaPath(id));
  if (!isUploadAsset(raw)) return undefined;
  return raw;
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

  await ensureDir();

  const asset: UploadAsset = {
    id: randomId(),
    kind,
    mime,
    size: data.byteLength,
    createdAt: new Date().toISOString(),
  };

  const target = assetPath(asset.id);
  const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, data);
  await fs.rename(tmp, target);
  await writeJson(metaPath(asset.id), asset);

  return asset;
}

/** Reads one asset. Returns `undefined` for unknown or malformed ids. */
export async function readUpload(id: string): Promise<StoredUpload | undefined> {
  const asset = await readAssetMeta(id);
  if (!asset) return undefined;

  try {
    const file = await fs.readFile(assetPath(id));
    // Copy into a plain, ArrayBuffer-backed view so the bytes are exactly this
    // length (no pooled Buffer slack) and cannot be mutated by the caller.
    const bytes = new Uint8Array(file.byteLength);
    bytes.set(file);
    return { asset, bytes };
  } catch (error) {
    if (isEnoent(error)) return undefined;
    throw error;
  }
}

/** Newest first. Asset ids are capability tokens, so this is for the creator. */
export async function listUploads(): Promise<UploadAsset[]> {
  await ensureDir();
  const entries = await fs.readdir(UPLOADS_DIR);
  const sidecars = entries.filter((name) => name.endsWith(".json"));

  const assets = await Promise.all(
    sidecars.map(async (name) => {
      const raw = await readJson<unknown>(path.join(UPLOADS_DIR, name));
      return isUploadAsset(raw) ? raw : undefined;
    }),
  );

  return assets
    .filter((asset): asset is UploadAsset => Boolean(asset))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Idempotent: removing something that is already gone is not an error. */
export async function removeUpload(id: string): Promise<void> {
  if (!isValidAssetId(id)) return;
  await Promise.all([
    fs.rm(assetPath(id), { force: true }),
    fs.rm(metaPath(id), { force: true }),
  ]);
}
