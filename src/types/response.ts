/**
 * Response domain contracts.
 *
 * Single source of truth for all response types across the platform:
 * - Quick Reply: short message, optional emotion, optional photo attachments.
 * - Experience Reply: full Koi Koi experience created in response.
 *
 * Publication and access follow capability token semantics:
 * - `publicToken`: bearer token for recipient viewing (/response/[token]).
 * - `manageToken`: capability token for author revocation and deletion (/response/manage/[token]).
 * Both tokens are stored ONLY as SHA-256 hashes in the database.
 */

export type ResponseType = "quick" | "experience";

export type ResponseStatus = "draft" | "published" | "revoked" | "deleted";

export interface QuickReplyPayload {
  message: string;
  recipientEmotion?: string;
  photos?: string[];
}

export interface ExperienceReplyPayload {
  experienceType: string;
  content: Record<string, unknown>;
}

export type ResponseContent = QuickReplyPayload | ExperienceReplyPayload;

export interface ResponseDraft {
  id: string;
  apologyId: string;
  responseType: ResponseType;
  status: "draft";
  content: ResponseContent;
  createdAt: string;
  updatedAt: string;
}

export interface PublishedResponse {
  id: string;
  apologyId: string;
  responseType: ResponseType;
  status: "published";
  content: ResponseContent;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  publicToken?: string;
  manageToken?: string;
}

export interface ResponseRecord {
  id: string;
  apologyId: string;
  responseType: ResponseType;
  status: ResponseStatus;
  content: ResponseContent;
  publicTokenHash?: string | null;
  manageTokenHash?: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
}

export interface ResponseTokens {
  publicToken: string;
  manageToken: string;
}
