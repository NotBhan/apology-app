import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getServerEnv } from "../env";
import {
  DELETE_BATCH_SIZE,
  chunk,
  type DeleteBatchResult,
  type ObjectStore,
} from "./object-store";
import { isAlreadyDeletedCode, isMissingObjectError } from "./filebase-errors";

/**
 * The four wire operations, isolated behind an interface so tests can supply a
 * mock S3 client without touching the classification logic above it.
 */
export interface BucketTransport {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  head(key: string): Promise<void>;
  deleteKeys(keys: string[]): Promise<{
    deleted: string[];
    errors: { key: string; code: string }[];
  }>;
  presignGet(key: string, ttlSeconds: number): Promise<string>;
}

export interface FilebaseConfig {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
  /**
   * Filebase recommends `auto`; a wrong region is the documented top cause of
   * `SignatureDoesNotMatch`.
   */
  region: string;
}

/**
 * Credentials are passed explicitly and never read from ambient `AWS_*`:
 * Neon injects AWS variables for its own Object Storage when enabled, and an
 * implicit client would silently point at the wrong store.
 */
export function filebaseConfigFromEnv(): FilebaseConfig {
  const env = getServerEnv();
  return {
    accessKeyId: env.FILEBASE_ACCESS_KEY,
    secretAccessKey: env.FILEBASE_SECRET_KEY,
    bucket: env.FILEBASE_BUCKET,
    endpoint: env.FILEBASE_ENDPOINT,
    region: env.FILEBASE_REGION,
  };
}

export function createS3Transport(config: FilebaseConfig): BucketTransport {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return {
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          ContentLength: body.byteLength,
        }),
      );
    },

    async head(key) {
      await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }));
    },

    async deleteKeys(keys) {
      const response = await client.send(
        new DeleteObjectsCommand({
          Bucket: config.bucket,
          Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: false },
        }),
      );

      return {
        deleted: (response.Deleted ?? [])
          .map((entry) => entry.Key)
          .filter((key): key is string => Boolean(key)),
        errors: (response.Errors ?? [])
          .filter((entry): entry is { Key: string; Code: string } =>
            Boolean(entry.Key && entry.Code),
          )
          .map((entry) => ({ key: entry.Key, code: entry.Code })),
      };
    },

    async presignGet(key, ttlSeconds) {
      return getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: config.bucket, Key: key }),
        { expiresIn: ttlSeconds },
      );
    },
  };
}

export class FilebaseObjectStore implements ObjectStore {
  private readonly transport: BucketTransport;

  constructor(transport: BucketTransport) {
    this.transport = transport;
  }

  static fromEnv(): FilebaseObjectStore {
    return new FilebaseObjectStore(createS3Transport(filebaseConfigFromEnv()));
  }

  async put(key: string, body: Uint8Array, contentType: string): Promise<void> {
    await this.transport.put(key, body, contentType);
  }

  /**
   * Only a genuine 404 reports `exists:false`. Authorisation failures, clock
   * skew and network errors propagate so a renewal cannot be approved against
   * an object it merely failed to see.
   */
  async head(key: string): Promise<{ exists: boolean; size?: number }> {
    try {
      await this.transport.head(key);
      return { exists: true };
    } catch (error) {
      if (isMissingObjectError(error)) return { exists: false };
      throw error;
    }
  }

  async deleteMany(keys: string[]): Promise<DeleteBatchResult> {
    const result: DeleteBatchResult = { deleted: [], missing: [], failed: [] };
    if (keys.length === 0) return result;

    for (const batch of chunk(keys, DELETE_BATCH_SIZE)) {
      const response = await this.transport.deleteKeys(batch);

      for (const key of response.deleted) result.deleted.push(key);

      for (const { key, code } of response.errors) {
        // A missing key reaches the desired state, so it is not a failure.
        if (isAlreadyDeletedCode(code)) result.missing.push(key);
        else result.failed.push({ key, code });
      }
    }

    return result;
  }

  async presignGet(key: string, ttlSeconds: number): Promise<string> {
    return this.transport.presignGet(key, ttlSeconds);
  }
}
