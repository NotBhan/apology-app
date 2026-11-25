"use client";

import { asciiAtOffset, startsWithBytes } from "@/lib/storage/mime";

export const IMAGE_OPTIMIZATION_DEFAULTS = {
  preferredFormat: "image/webp" as const,
  fallbackFormat: "image/jpeg" as const,
  alphaFallbackFormat: "image/png" as const,
  maxLongEdge: 1600,
  preferredQuality: 0.78,
  minQuality: 0.6,
  maxQuality: 0.8,
  targetMinBytes: 200 * 1024,
  targetMaxBytes: 450 * 1024,
  skipRecompressBytes: 180 * 1024,
} as const;

export type OptimizedImageMime = "image/webp" | "image/jpeg" | "image/png";
export type DetectedImageMime = OptimizedImageMime | "image/gif" | "image/heic";

export type ImageOptimizationStage =
  | "reading"
  | "decoding"
  | "optimizing"
  | "complete";

export interface ImageOptimizationProgress {
  stage: ImageOptimizationStage;
  progress: number;
}

export interface CompressImageOptions {
  maxLongEdge?: number;
  preferredQuality?: number;
  minQuality?: number;
  maxQuality?: number;
  targetMaxBytes?: number;
  preferredFormat?: "image/webp" | "image/jpeg";
  signal?: AbortSignal;
  onProgress?: (progress: ImageOptimizationProgress) => void;
}

export interface ImageCompressionMetrics {
  originalBytes: number;
  compressedBytes: number;
  originalWidth: number;
  originalHeight: number;
  outputWidth: number;
  outputHeight: number;
  originalFormat: string;
  outputFormat: OptimizedImageMime;
  durationMs: number;
  reductionBytes: number;
  reductionPercent: number;
  qualityUsed: number;
  attempts: number;
  wasRecompressed: boolean;
  preservedTransparency: boolean;
}

export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
  type: OptimizedImageMime;
  metrics: ImageCompressionMetrics;
}

export type ImageOptimizationErrorCode =
  | "EMPTY_FILE"
  | "UNSUPPORTED_FORMAT"
  | "ANIMATED_IMAGE"
  | "DECODE_FAILED"
  | "ENCODE_FAILED"
  | "BROWSER_UNSUPPORTED"
  | "CANCELLED";

export class ImageOptimizationError extends Error {
  readonly code: ImageOptimizationErrorCode;

  constructor(code: ImageOptimizationErrorCode, message: string) {
    super(message);
    this.name = "ImageOptimizationError";
    this.code = code;
  }
}

/* -------------------------------------------------------------------------- */
/* Privacy-safe diagnostics telemetry                                         */
/* -------------------------------------------------------------------------- */

const MAX_DIAGNOSTIC_ENTRIES = 50;
const recentDiagnostics: ImageCompressionMetrics[] = [];

export function getCompressionDiagnostics(): readonly ImageCompressionMetrics[] {
  return [...recentDiagnostics];
}

export function clearCompressionDiagnostics(): void {
  recentDiagnostics.length = 0;
}

function recordDiagnostic(metrics: ImageCompressionMetrics): void {
  if (recentDiagnostics.length >= MAX_DIAGNOSTIC_ENTRIES) {
    recentDiagnostics.shift();
  }
  recentDiagnostics.push(metrics);

  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    console.info(
      `[image-optimize] ${metrics.originalFormat} -> ${metrics.outputFormat} | ` +
        `${metrics.originalWidth}x${metrics.originalHeight} -> ${metrics.outputWidth}x${metrics.outputHeight} | ` +
        `${Math.round(metrics.originalBytes / 1024)}KB -> ${Math.round(metrics.compressedBytes / 1024)}KB ` +
        `(-${metrics.reductionPercent}%) in ${metrics.durationMs}ms`,
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Magic-byte format inspection                                               */
/* -------------------------------------------------------------------------- */

const HEIC_BRANDS = new Set([
  "heic",
  "heix",
  "hevc",
  "hevx",
  "heim",
  "heis",
  "mif1",
  "msf1",
]);

function readFourCc(bytes: Uint8Array, offset: number): string {
  if (bytes.length < offset + 4) return "";
  return String.fromCharCode(
    bytes[offset]!,
    bytes[offset + 1]!,
    bytes[offset + 2]!,
    bytes[offset + 3]!,
  ).toLowerCase();
}

export function sniffClientImageMime(bytes: Uint8Array): DetectedImageMime | undefined {
  if (startsWithBytes(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (asciiAtOffset(bytes, 0, "RIFF") && asciiAtOffset(bytes, 8, "WEBP")) return "image/webp";
  if (asciiAtOffset(bytes, 0, "GIF87a") || asciiAtOffset(bytes, 0, "GIF89a")) return "image/gif";

  // ISO BMFF ftyp container (HEIC / HEIF)
  if (asciiAtOffset(bytes, 4, "ftyp")) {
    const majorBrand = readFourCc(bytes, 8);
    if (HEIC_BRANDS.has(majorBrand)) return "image/heic";
    const boxLimit = Math.min(bytes.length, 64);
    for (let pos = 16; pos + 4 <= boxLimit; pos += 4) {
      if (HEIC_BRANDS.has(readFourCc(bytes, pos))) return "image/heic";
    }
  }

  return undefined;
}

/**
 * Checks whether a JPEG stream contains an APP1 (EXIF / XMP) segment before
 * Start-of-Scan so EXIF orientation and GPS/device metadata are never leaked
 * through the raw byte fast-path.
 */
export function hasJpegExifOrApp1(bytes: Uint8Array): boolean {
  if (!startsWithBytes(bytes, [0xff, 0xd8, 0xff])) return false;
  let pos = 2;
  while (pos + 1 < bytes.length) {
    while (pos < bytes.length && bytes[pos] !== 0xff) pos += 1;
    while (pos < bytes.length && bytes[pos] === 0xff) pos += 1;
    if (pos >= bytes.length) break;
    const marker = bytes[pos++]!;
    if (marker === 0x00 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (marker === 0xd9 || marker === 0xda) break; // EOI / SOS
    if (marker === 0xe1) return true; // APP1 (EXIF/XMP)
    if (pos + 2 > bytes.length) break;
    const segLen = (bytes[pos]! << 8) | bytes[pos + 1]!;
    pos += Math.max(2, segLen);
  }
  return false;
}

/**
 * Counts image frames inside a GIF buffer so animated GIFs are rejected
 * clearly instead of silently flattening them to frame 1.
 */
export function isAnimatedGifBytes(bytes: Uint8Array): boolean {
  if (!asciiAtOffset(bytes, 0, "GIF87a") && !asciiAtOffset(bytes, 0, "GIF89a")) return false;
  if (bytes.length < 14) return false;

  const packed = bytes[10] ?? 0;
  let pos = 13;
  if ((packed & 0x80) !== 0) {
    const gctSize = 3 * (1 << ((packed & 0x07) + 1));
    pos += gctSize;
  }

  let frameCount = 0;
  while (pos < bytes.length) {
    const blockId = bytes[pos++];
    if (blockId === 0x3b) break; // Trailer
    if (blockId === 0x2c) {
      // Image Descriptor (9 remaining bytes + optional local color table + LZW sub-blocks)
      frameCount += 1;
      if (frameCount > 1) return true;
      if (pos + 9 > bytes.length) break;
      const imgPacked = bytes[pos + 8] ?? 0;
      pos += 9;
      if ((imgPacked & 0x80) !== 0) {
        const lctSize = 3 * (1 << ((imgPacked & 0x07) + 1));
        pos += lctSize;
      }
      pos += 1; // LZW minimum code size
      while (pos < bytes.length) {
        const subBlockLen = bytes[pos++] ?? 0;
        if (subBlockLen === 0) break;
        pos += subBlockLen;
      }
    } else if (blockId === 0x21) {
      // Extension block
      pos += 1; // label
      while (pos < bytes.length) {
        const subBlockLen = bytes[pos++] ?? 0;
        if (subBlockLen === 0) break;
        pos += subBlockLen;
      }
    } else {
      break;
    }
  }

  return frameCount > 1;
}

async function readLeadingBytes(blob: Blob, maxBytes = 65536): Promise<Uint8Array> {
  const slice = typeof blob.slice === "function" ? blob.slice(0, maxBytes) : blob;
  if (typeof slice.arrayBuffer === "function") {
    return new Uint8Array(await slice.arrayBuffer());
  }
  const ab = await new Response(slice).arrayBuffer();
  return new Uint8Array(ab);
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException("Image optimization was cancelled.", "AbortError");
  }
}

/* -------------------------------------------------------------------------- */
/* Browser bitmap decoding & encoding primitives                              */
/* -------------------------------------------------------------------------- */

interface DecodedSurface {
  width: number;
  height: number;
  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void;
  close(): void;
}

async function decodeImageSurface(
  file: Blob,
  detectedMime: DetectedImageMime | undefined,
  signal?: AbortSignal,
): Promise<DecodedSurface> {
  throwIfAborted(signal);

  if (typeof createImageBitmap === "function") {
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch (primaryErr) {
      // Older browsers or simplified mocks may reject options dictionary.
      const looksLikeOptionError = primaryErr instanceof TypeError;
      if (!looksLikeOptionError) {
        if (detectedMime === "image/heic") {
          throw new ImageOptimizationError(
            "UNSUPPORTED_FORMAT",
            "HEIC/HEIF photos cannot be decoded in this browser. Please export as JPG, PNG, or WebP.",
          );
        }
        throw new ImageOptimizationError(
          "DECODE_FAILED",
          "Could not decode this image. Please try a different JPG, PNG, or WebP photo.",
        );
      }
      try {
        bitmap = await createImageBitmap(file);
      } catch {
        if (detectedMime === "image/heic") {
          throw new ImageOptimizationError(
            "UNSUPPORTED_FORMAT",
            "HEIC/HEIF photos cannot be decoded in this browser. Please export as JPG, PNG, or WebP.",
          );
        }
        throw new ImageOptimizationError(
          "DECODE_FAILED",
          "Could not decode this image. Please try a different JPG, PNG, or WebP photo.",
        );
      }
    }

    if (signal?.aborted) {
      bitmap.close?.();
      throwIfAborted(signal);
    }

    return {
      width: bitmap.width,
      height: bitmap.height,
      draw(ctx, w, h) {
        ctx.drawImage(bitmap, 0, 0, w, h);
      },
      close() {
        bitmap.close?.();
      },
    };
  }

  // Fallback for environments without createImageBitmap
  if (typeof Image !== "undefined" && typeof URL?.createObjectURL === "function") {
    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        const abortListener = () => reject(new DOMException("Cancelled", "AbortError"));
        signal?.addEventListener("abort", abortListener, { once: true });
        el.onload = () => {
          signal?.removeEventListener("abort", abortListener);
          resolve(el);
        };
        el.onerror = () => {
          signal?.removeEventListener("abort", abortListener);
          reject(new Error("Image load failed"));
        };
        el.src = objectUrl;
      });
      return {
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        draw(ctx, w, h) {
          ctx.drawImage(img, 0, 0, w, h);
        },
        close() {
          URL.revokeObjectURL(objectUrl);
        },
      };
    } catch (err) {
      URL.revokeObjectURL(objectUrl);
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      if (detectedMime === "image/heic") {
        throw new ImageOptimizationError(
          "UNSUPPORTED_FORMAT",
          "HEIC/HEIF photos cannot be decoded in this browser. Please export as JPG, PNG, or WebP.",
        );
      }
      throw new ImageOptimizationError(
        "DECODE_FAILED",
        "Could not decode this image. Please try a different JPG, PNG, or WebP photo.",
      );
    }
  }

  throw new ImageOptimizationError(
    "BROWSER_UNSUPPORTED",
    "This browser cannot process images.",
  );
}

function detectCanvasAlpha(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sourceMime: DetectedImageMime | undefined,
): boolean {
  if (sourceMime === "image/jpeg") return false;
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    // Stride across pixels quickly while catching translucent/transparent corners & edges.
    const totalPixels = width * height;
    const step = totalPixels > 64_000 ? Math.max(1, Math.floor(totalPixels / 64_000)) * 4 : 4;
    for (let i = 3; i < data.length; i += step) {
      if (data[i]! < 252) return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function encodeCanvas(
  canvas: HTMLCanvasElement,
  mime: OptimizedImageMime,
  quality: number,
): Promise<{ blob: Blob; actualMime: OptimizedImageMime } | null> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mime, mime === "image/png" ? undefined : quality),
  );
  if (!blob || blob.size === 0) return null;

  // Verify the blob wasn't silently downgraded (e.g., WebP falling back to PNG in older Safari).
  let actualMime: OptimizedImageMime | undefined;
  try {
    const bytes = await readLeadingBytes(blob, 32);
    const sniffed = bytes.length >= 12 ? sniffClientImageMime(bytes) : undefined;
    if (sniffed === "image/webp" || sniffed === "image/jpeg" || sniffed === "image/png") {
      actualMime = sniffed;
    }
  } catch {
    // Ignore readback error
  }

  if (!actualMime) {
    if (blob.type === "image/webp" || blob.type === "image/jpeg" || blob.type === "image/png") {
      actualMime = blob.type;
    } else {
      actualMime = mime;
    }
  }

  return { blob, actualMime };
}

function isServerAcceptedPhotoMime(mime: DetectedImageMime | undefined): mime is OptimizedImageMime {
  return mime === "image/jpeg" || mime === "image/png" || mime === "image/webp";
}

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/* -------------------------------------------------------------------------- */
/* Public image optimization pipeline                                         */
/* -------------------------------------------------------------------------- */

/**
 * Optimizes a user-selected image before upload:
 * - Verifies magic bytes (handles incorrect MIME declarations & rejects animated GIF / unreadable HEIC)
 * - Decodes with EXIF orientation baked in
 * - Downscales to fit within maxLongEdge (1600px) preserving aspect ratio
 * - Converts to WebP (with transparency preserved; or JPEG / transparent PNG fallback)
 * - Uses bounded adaptive quality (0.78 -> 0.60) & dimension fallback targeting 200-450 KB
 * - Never enters an unbounded loop or bloats already-small images
 */
export async function compressImage(
  file: File,
  options: CompressImageOptions = {},
): Promise<CompressedImage> {
  const start = nowMs();
  const signal = options.signal;
  const maxLongEdge = options.maxLongEdge ?? IMAGE_OPTIMIZATION_DEFAULTS.maxLongEdge;
  const preferredQuality = Math.min(
    options.maxQuality ?? IMAGE_OPTIMIZATION_DEFAULTS.maxQuality,
    Math.max(
      options.minQuality ?? IMAGE_OPTIMIZATION_DEFAULTS.minQuality,
      options.preferredQuality ?? IMAGE_OPTIMIZATION_DEFAULTS.preferredQuality,
    ),
  );
  const minQuality = options.minQuality ?? IMAGE_OPTIMIZATION_DEFAULTS.minQuality;
  const targetMaxBytes = options.targetMaxBytes ?? IMAGE_OPTIMIZATION_DEFAULTS.targetMaxBytes;
  const preferredFormat = options.preferredFormat ?? IMAGE_OPTIMIZATION_DEFAULTS.preferredFormat;

  throwIfAborted(signal);
  options.onProgress?.({ stage: "reading", progress: 10 });

  if (file.size === 0) {
    throw new ImageOptimizationError("EMPTY_FILE", "That image file is empty.");
  }

  const headerBytes = await readLeadingBytes(file, 65536);
  throwIfAborted(signal);

  const sniffedMime = sniffClientImageMime(headerBytes);
  const declaredMime = file.type?.toLowerCase() ?? "";

  if (sniffedMime === "image/gif") {
    const gifSample =
      file.size > headerBytes.byteLength && file.size <= 12 * 1024 * 1024
        ? await readLeadingBytes(file, file.size)
        : headerBytes;
    if (isAnimatedGifBytes(gifSample)) {
      throw new ImageOptimizationError(
        "ANIMATED_IMAGE",
        "Animated GIFs cannot be converted into static photos. Please choose a JPG, PNG, or WebP photograph.",
      );
    }
  }

  if (!sniffedMime && !declaredMime.startsWith("image/")) {
    throw new ImageOptimizationError(
      "UNSUPPORTED_FORMAT",
      "That file is not a supported image. Please choose a JPG, PNG, or WebP photograph.",
    );
  }

  // Also reject files masquerading as images whose leading bytes clearly fail known signatures
  // unless declaredMime is HEIC where browser might still try decoding.
  if (!sniffedMime) {
    throw new ImageOptimizationError(
      "UNSUPPORTED_FORMAT",
      "Unsupported or unreadable image format. Please choose a JPG, PNG, or WebP photograph.",
    );
  }

  const jpegHasMetadata = sniffedMime === "image/jpeg" && hasJpegExifOrApp1(headerBytes);

  options.onProgress?.({ stage: "decoding", progress: 30 });
  const surface = await decodeImageSurface(file, sniffedMime, signal);

  try {
    throwIfAborted(signal);

    const origWidth = surface.width;
    const origHeight = surface.height;
    if (!origWidth || !origHeight) {
      throw new ImageOptimizationError("DECODE_FAILED", "This image has invalid dimensions.");
    }

    const longEdge = Math.max(origWidth, origHeight);

    // Fast path: only bypass re-encode when compact, within maxLongEdge, server-accepted,
    // and free of EXIF/APP1 metadata so rotation & PII stripping remain guaranteed.
    if (
      isServerAcceptedPhotoMime(sniffedMime) &&
      !jpegHasMetadata &&
      longEdge <= maxLongEdge &&
      file.size <= IMAGE_OPTIMIZATION_DEFAULTS.skipRecompressBytes
    ) {
      const normalizedOriginalBlob =
        file.type === sniffedMime ? file : new Blob([file], { type: sniffedMime });
      const metrics: ImageCompressionMetrics = {
        originalBytes: file.size,
        compressedBytes: file.size,
        originalWidth: origWidth,
        originalHeight: origHeight,
        outputWidth: origWidth,
        outputHeight: origHeight,
        originalFormat: sniffedMime,
        outputFormat: sniffedMime,
        durationMs: Math.max(0, Math.round(nowMs() - start)),
        reductionBytes: 0,
        reductionPercent: 0,
        qualityUsed: 1,
        attempts: 0,
        wasRecompressed: false,
        preservedTransparency: sniffedMime !== "image/jpeg",
      };
      recordDiagnostic(metrics);
      options.onProgress?.({ stage: "complete", progress: 100 });
      return {
        blob: normalizedOriginalBlob,
        width: origWidth,
        height: origHeight,
        type: sniffedMime,
        metrics,
      };
    }

    options.onProgress?.({ stage: "optimizing", progress: 55 });

    const canvas = document.createElement("canvas");
    let attempts = 0;

    try {
      const renderAtEdge = (edgeLimit: number) => {
        const scale = Math.min(1, edgeLimit / longEdge);
        const targetW = Math.max(1, Math.round(origWidth * scale));
        const targetH = Math.max(1, Math.round(origHeight * scale));
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new ImageOptimizationError(
            "BROWSER_UNSUPPORTED",
            "This browser cannot process images.",
          );
        }
        ctx.clearRect(0, 0, targetW, targetH);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        surface.draw(ctx, targetW, targetH);
        return { ctx, width: targetW, height: targetH };
      };

      const initialRender = renderAtEdge(maxLongEdge);
      const hasTransparency = detectCanvasAlpha(
        initialRender.ctx,
        initialRender.width,
        initialRender.height,
        sniffedMime,
      );

      // Select target format respecting browser support and transparency
      let targetFormat: OptimizedImageMime = preferredFormat;
      let bestResult: {
        blob: Blob;
        mime: OptimizedImageMime;
        width: number;
        height: number;
        quality: number;
      } | null = null;

      const qualitySchedule = [preferredQuality, 0.7, 0.64, minQuality].filter(
        (q, idx, arr) => q >= minQuality && arr.indexOf(q) === idx,
      );
      if (!qualitySchedule.includes(minQuality)) qualitySchedule.push(minQuality);

      // Try initial encode at preferred quality
      attempts += 1;
      const firstPass = await encodeCanvas(canvas, targetFormat, qualitySchedule[0]!);
      throwIfAborted(signal);

      if (!firstPass || (targetFormat === "image/webp" && firstPass.actualMime !== "image/webp")) {
        // Browser lacks WebP encoding support; select safe fallback
        targetFormat = hasTransparency
          ? IMAGE_OPTIMIZATION_DEFAULTS.alphaFallbackFormat
          : IMAGE_OPTIMIZATION_DEFAULTS.fallbackFormat;

        if (targetFormat === "image/png" && firstPass?.actualMime === "image/png") {
          bestResult = {
            blob: firstPass.blob,
            mime: "image/png",
            width: initialRender.width,
            height: initialRender.height,
            quality: 1,
          };
        } else {
          attempts += 1;
          const fallbackPass = await encodeCanvas(canvas, targetFormat, qualitySchedule[0]!);
          throwIfAborted(signal);
          if (fallbackPass) {
            bestResult = {
              blob: fallbackPass.blob,
              mime: fallbackPass.actualMime,
              width: initialRender.width,
              height: initialRender.height,
              quality: qualitySchedule[0]!,
            };
          }
        }
      } else {
        bestResult = {
          blob: firstPass.blob,
          mime: firstPass.actualMime,
          width: initialRender.width,
          height: initialRender.height,
          quality: qualitySchedule[0]!,
        };
      }

      if (!bestResult) {
        throw new ImageOptimizationError("ENCODE_FAILED", "Could not optimize that image.");
      }

      // Bounded adaptive quality loop at maxLongEdge (skipped for lossless PNG)
      if (bestResult.blob.size > targetMaxBytes && bestResult.mime !== "image/png") {
        for (let i = 1; i < qualitySchedule.length; i += 1) {
          throwIfAborted(signal);
          const q = qualitySchedule[i]!;
          attempts += 1;
          const candidate = await encodeCanvas(canvas, bestResult.mime, q);
          if (candidate && candidate.blob.size < bestResult.blob.size) {
            bestResult = {
              blob: candidate.blob,
              mime: candidate.actualMime,
              width: initialRender.width,
              height: initialRender.height,
              quality: q,
            };
          }
          if (bestResult.blob.size <= targetMaxBytes) break;
        }
      }

      // Bounded dimension fallback (at most 1280px) so visual sharpness is prioritized over forcing tiny bytes.
      const dimensionSteps = [1280];
      for (const fallbackEdge of dimensionSteps) {
        if (bestResult.blob.size <= targetMaxBytes) break;
        if (Math.max(bestResult.width, bestResult.height) <= fallbackEdge) continue;

        throwIfAborted(signal);
        const scaled = renderAtEdge(fallbackEdge);
        const q: number = bestResult.mime === "image/png" ? 1 : 0.66;
        attempts += 1;
        const candidate = await encodeCanvas(canvas, bestResult.mime, q);
        if (candidate && candidate.blob.size < bestResult.blob.size) {
          bestResult = {
            blob: candidate.blob,
            mime: candidate.actualMime,
            width: scaled.width,
            height: scaled.height,
            quality: q,
          };
        }
      }

      options.onProgress?.({ stage: "optimizing", progress: 90 });

      // Prevent making already-bounded, EXIF-free files larger
      let finalBlob = bestResult.blob;
      let finalMime = bestResult.mime;
      let finalWidth = bestResult.width;
      let finalHeight = bestResult.height;
      let finalQuality = bestResult.quality;
      let wasRecompressed = true;

      if (
        isServerAcceptedPhotoMime(sniffedMime) &&
        !jpegHasMetadata &&
        longEdge <= maxLongEdge &&
        finalBlob.size >= file.size &&
        file.size <= targetMaxBytes
      ) {
        finalBlob = file.type === sniffedMime ? file : new Blob([file], { type: sniffedMime });
        finalMime = sniffedMime;
        finalWidth = origWidth;
        finalHeight = origHeight;
        finalQuality = 1;
        wasRecompressed = false;
      }

      const reductionBytes = Math.max(0, file.size - finalBlob.size);
      const reductionPercent =
        file.size > 0 ? Math.round((reductionBytes / file.size) * 1000) / 10 : 0;

      const metrics: ImageCompressionMetrics = {
        originalBytes: file.size,
        compressedBytes: finalBlob.size,
        originalWidth: origWidth,
        originalHeight: origHeight,
        outputWidth: finalWidth,
        outputHeight: finalHeight,
        originalFormat: sniffedMime,
        outputFormat: finalMime,
        durationMs: Math.max(0, Math.round(nowMs() - start)),
        reductionBytes,
        reductionPercent,
        qualityUsed: finalQuality,
        attempts,
        wasRecompressed,
        preservedTransparency: hasTransparency && (finalMime === "image/webp" || finalMime === "image/png"),
      };

      recordDiagnostic(metrics);
      options.onProgress?.({ stage: "complete", progress: 100 });

      return {
        blob: finalBlob,
        width: finalWidth,
        height: finalHeight,
        type: finalMime,
        metrics,
      };
    } finally {
      // Explicitly release canvas backing store immediately.
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    surface.close();
  }
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}
