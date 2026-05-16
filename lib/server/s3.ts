import { S3Client } from "@aws-sdk/client-s3";

// NOTE: this module must only be imported from server code
// (route handlers under app/api/...). It reads server-only env vars.

export function isS3Configured(): boolean {
  return !!(
    process.env.AWS_REGION &&
    process.env.S3_WHATSNOW_BUCKET &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  );
}

let cached: S3Client | null = null;

export function getS3Client(): S3Client {
  if (cached) return cached;
  cached = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
  return cached;
}

export function getBucket(): string {
  return process.env.S3_WHATSNOW_BUCKET!;
}

// Phase 1 is single-user. WHATSNOW_USER_ID is the only knob.
// When auth is added later, derive userId from the request session here
// and keep the rest of the API the same.
export function getUserPrefix(): string {
  const u = process.env.WHATSNOW_USER_ID || "default";
  return `users/${u}/whatsnow`;
}

export function latestKey(): string {
  return `${getUserPrefix()}/latest.json`;
}

export function photoKey(id: string): string {
  return `${getUserPrefix()}/photos/${id}.json`;
}

export function backupKey(stamp: string): string {
  return `${getUserPrefix()}/backups/${stamp}.json`;
}

export function isNotFoundError(e: any): boolean {
  return (
    e?.Code === "NoSuchKey" ||
    e?.name === "NoSuchKey" ||
    e?.$metadata?.httpStatusCode === 404
  );
}

export function isPreconditionFailed(e: any): boolean {
  return (
    e?.$metadata?.httpStatusCode === 412 ||
    e?.Code === "PreconditionFailed" ||
    e?.name === "PreconditionFailed"
  );
}
