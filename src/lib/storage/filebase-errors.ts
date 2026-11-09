/**
 * S3 error classification, in one place.
 *
 * The distinction that matters: a **missing** object is a success for deletion
 * and a *failure* for renewal preflight. Everything that is not a 404 is a
 * failure — permission, signature, clock-skew, throttling and network errors
 * must never be mistaken for "already gone", or a deletion job would complete
 * while the object still exists.
 */

/** Codes Filebase documents as "object does not exist". */
const MISSING_CODES = new Set(["NotFound", "NoSuchKey", "404"]);

/** Codes that mean the request was refused or could not complete. */
export const FAILURE_CODES = new Set([
  "AccessDenied",
  "InvalidAccessKeyId",
  "SignatureDoesNotMatch",
  "SignatureExpired",
  "RequestTimeTooSkewed",
  "SlowDown",
  "InternalError",
  "ServiceUnavailable",
  "NotImplemented",
  "InvalidArgument",
  "MalformedXML",
]);

interface S3ErrorLike {
  name?: string;
  Code?: string;
  code?: string;
  message?: string;
  $metadata?: { httpStatusCode?: number };
}

function errorCode(error: unknown): string {
  const err = error as S3ErrorLike;
  return err?.Code ?? err?.code ?? err?.name ?? "";
}

export function isMissingObjectError(error: unknown): boolean {
  const err = error as S3ErrorLike;
  if (err?.$metadata?.httpStatusCode === 404) return true;
  return MISSING_CODES.has(errorCode(error));
}

/**
 * True when a per-key `DeleteObjects` entry means "already gone". S3 reports
 * that as an error entry even though the desired end state is reached.
 */
export function isAlreadyDeletedCode(code: string): boolean {
  return MISSING_CODES.has(code);
}

/** Never returns a raw provider message: it can contain bucket or key paths. */
export function sanitiseStorageError(error: unknown): string {
  const code = errorCode(error) || "UnknownError";
  const status = (error as S3ErrorLike)?.$metadata?.httpStatusCode;
  return status ? `${code} (HTTP ${status})` : code;
}
