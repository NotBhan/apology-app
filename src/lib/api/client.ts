"use client";

/**
 * Typed wrappers around this app's own route handlers, for client components.
 *
 * Every request is same-origin and carries the httpOnly creator cookie, so the
 * server — never the caller — decides who owns a draft. No owner id is ever
 * passed from here.
 *
 * Next 16 types the `fetch` extension as `next?: { revalidate, tags }` only, so
 * `cache: "no-store"` is the supported equivalent of `next: { cache: "no-store" }`.
 */
import type { ApologyDraft, CreateDraftInput, PublishedApology } from "@/types/apology";
import type { ApiError } from "@/lib/api/responses";
import type { AssetRecord } from "@/lib/storage/types";

export type { ApiError };

/** Error thrown by every wrapper: the HTTP status plus any field-level messages. */
export class ApiClientError extends Error {
  readonly status: number;
  readonly fields?: Record<string, string>;

  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.fields = fields;
  }
}

/**
 * What `PATCH /api/drafts/[draftId]` accepts: the editable draft fields.
 * Messages may be empty here — drafts autosave before they are finished and
 * only publishing requires all three.
 */
export type DraftSaveInput = Omit<
  ApologyDraft,
  "id" | "status" | "createdAt" | "updatedAt" | "publishedAt"
>;

export interface DraftResponse {
  draft: ApologyDraft;
}

export interface DraftListResponse {
  drafts: ApologyDraft[];
}

/** Returned only to the owner, at publish time. */
export interface PublishDraftResult {
  token: string;
  path: string;
}

export interface UploadResponse {
  asset: AssetRecord;
}

export interface UploadListResponse {
  assets: AssetRecord[];
}

/** Public URL for an uploaded asset (capability URL — the id is unguessable). */
export function uploadedAssetUrl(assetId: string): string {
  return `/api/uploads/${encodeURIComponent(assetId)}`;
}

function fallbackMessage(status: number): string {
  if (status === 400) return "Check the form and try again.";
  if (status === 403) return "You do not have access to this.";
  if (status === 404) return "We could not find that.";
  if (status === 410) return "This letter is no longer available.";
  if (status === 413) return "That file is too large.";
  if (status === 415) return "That file type is not supported.";
  if (status >= 500) return "Something went wrong on our side. Please try again.";
  return "The request could not be completed.";
}

function asApiError(value: unknown): ApiError | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.error !== "string" || record.error.length === 0) return undefined;

  const rawFields = record.fields;
  if (rawFields && typeof rawFields === "object") {
    const fields: Record<string, string> = {};
    for (const [key, entry] of Object.entries(rawFields as Record<string, unknown>)) {
      if (typeof entry === "string") fields[key] = entry;
    }
    return Object.keys(fields).length > 0
      ? { error: record.error, fields }
      : { error: record.error };
  }

  return { error: record.error };
}

/** Turns a non-2xx response into an `ApiClientError` without leaking HTML bodies. */
export async function apiErrorFromResponse(response: Response): Promise<ApiClientError> {
  let parsed: ApiError | undefined;
  try {
    parsed = asApiError(await response.json());
  } catch {
    parsed = undefined;
  }

  return new ApiClientError(
    parsed?.error ?? fallbackMessage(response.status),
    response.status,
    parsed?.fields,
  );
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  /** Serialized as JSON. */
  body?: unknown;
  /** Sent as multipart/form-data (the browser sets the boundary). */
  form?: FormData;
  signal?: AbortSignal;
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers({ Accept: "application/json" });
  let body: BodyInit | undefined;

  if (options.form) {
    body = options.form;
  } else if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? "GET",
      headers,
      body,
      signal: options.signal,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch (error) {
    if (typeof DOMException !== "undefined" && error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new ApiClientError(
      "We could not reach the server. Check your connection and try again.",
      0,
    );
  }

  if (!response.ok) throw await apiErrorFromResponse(response);
  if (response.status === 204) return undefined as T;

  const text = await response.text();
  if (!text) return undefined as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiClientError(fallbackMessage(response.status), response.status);
  }
}

/* -------------------------------------------------------------------------- */
/* Drafts                                                                     */
/* -------------------------------------------------------------------------- */

export async function createDraft(input: CreateDraftInput): Promise<ApologyDraft> {
  const { draft } = await apiRequest<DraftResponse>("/api/drafts", {
    method: "POST",
    body: input,
  });
  return draft;
}

/** Drafts owned by this browser's creator cookie. */
export async function listDrafts(): Promise<ApologyDraft[]> {
  const result = await apiRequest<DraftListResponse>("/api/drafts");
  return result?.drafts ?? [];
}

export async function getDraft(draftId: string): Promise<ApologyDraft> {
  const { draft } = await apiRequest<DraftResponse>(
    `/api/drafts/${encodeURIComponent(draftId)}`,
  );
  return draft;
}

export async function saveDraft(
  draftId: string,
  payload: DraftSaveInput,
): Promise<ApologyDraft> {
  const { draft } = await apiRequest<DraftResponse>(
    `/api/drafts/${encodeURIComponent(draftId)}`,
    { method: "PATCH", body: payload },
  );
  return draft;
}

/** Returns the share token and public path — the owner is the only one who sees it. */
export async function publishDraft(draftId: string): Promise<PublishDraftResult> {
  return apiRequest<PublishDraftResult>(
    `/api/drafts/${encodeURIComponent(draftId)}/publish`,
    { method: "POST" },
  );
}

export async function revokeDraft(draftId: string): Promise<ApologyDraft> {
  const { draft } = await apiRequest<DraftResponse>(
    `/api/drafts/${encodeURIComponent(draftId)}/revoke`,
    { method: "POST" },
  );
  return draft;
}

export async function deleteDraft(draftId: string): Promise<void> {
  await apiRequest<{ ok: boolean }>(`/api/drafts/${encodeURIComponent(draftId)}`, {
    method: "DELETE",
  });
}

/* -------------------------------------------------------------------------- */
/* Recipient view                                                             */
/* -------------------------------------------------------------------------- */

/** Recipient-safe payload only; revoked or unpublished tokens throw a 404/410. */
export async function getPublishedLetter(token: string): Promise<PublishedApology> {
  return apiRequest<PublishedApology>(`/api/letters/${encodeURIComponent(token)}`);
}

/* -------------------------------------------------------------------------- */
/* Uploads                                                                    */
/* -------------------------------------------------------------------------- */

export async function uploadAsset(file: File, draftId: string): Promise<AssetRecord> {
  const form = new FormData();
  form.append("file", file, file.name || "upload");
  form.append("draftId", draftId);
  const { asset } = await apiRequest<UploadResponse>("/api/uploads", {
    method: "POST",
    form,
  });
  return asset;
}

export async function deleteAsset(assetId: string): Promise<void> {
  await apiRequest<{ ok: boolean }>(uploadedAssetUrl(assetId), { method: "DELETE" });
}
