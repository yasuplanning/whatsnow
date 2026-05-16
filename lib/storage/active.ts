"use client";

import { getDeviceId } from "./device";
import { SCHEMA_VERSION, type ActiveLogPointer } from "./types";

// ---------------------------------------------------------------------------
// Singleton active-log pointer at active.json.
//
// This module mirrors the pattern used by s3.ts (fetch-based, per-call etag
// tracking) but is *not* wired into the debounced save loop — the active
// pointer's hot path (start / renew / end) is meant to be independent of
// latest.json saves so they cannot starve each other.
//
// Phase 1 strategy: existing logs[] in latest.json continues to carry
// status="active" too; we write both. Once Phase 2/3 split logs into
// individual files, active.json becomes the sole truth for "which log is
// currently running".
// ---------------------------------------------------------------------------

const DEFAULT_LEASE_MINUTES = 60;
const LEASE_RENEW_MS = 5 * 60 * 1000;

interface FetchedPointer {
  pointer: ActiveLogPointer | null;
  etag: string | null;
  status: "ok" | "absent" | "unconfigured" | "error";
  errorMessage?: string;
}

let lastFetchedEtag: string | null = null;

function isActiveLogPointer(v: unknown): v is ActiveLogPointer {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.logId === "string" &&
    typeof o.leasedByDevice === "string" &&
    typeof o.leaseStartedAt === "string" &&
    typeof o.leaseRenewedAt === "string" &&
    typeof o.leaseExpiresAt === "string" &&
    typeof o.version === "number" &&
    typeof o.schemaVersion === "number"
  );
}

export function getLastEtag(): string | null {
  return lastFetchedEtag;
}

export async function fetchActivePointer(): Promise<FetchedPointer> {
  if (typeof window === "undefined") {
    return { pointer: null, etag: null, status: "error", errorMessage: "no window" };
  }
  try {
    const res = await fetch("/api/storage/active", {
      method: "GET",
      cache: "no-store",
    });
    if (res.status === 503) {
      return { pointer: null, etag: null, status: "unconfigured" };
    }
    if (res.status === 404) {
      lastFetchedEtag = null;
      return { pointer: null, etag: null, status: "absent" };
    }
    if (!res.ok) {
      return {
        pointer: null,
        etag: null,
        status: "error",
        errorMessage: `${res.status} ${res.statusText}`,
      };
    }
    const json = (await res.json()) as {
      pointer: unknown;
      etag?: string | null;
    };
    const pointer = isActiveLogPointer(json.pointer) ? json.pointer : null;
    const etag = typeof json.etag === "string" ? json.etag : null;
    lastFetchedEtag = etag;
    return {
      pointer,
      etag,
      status: pointer ? "ok" : "absent",
    };
  } catch (e) {
    return {
      pointer: null,
      etag: null,
      status: "error",
      errorMessage: e instanceof Error ? e.message : String(e),
    };
  }
}

export interface PutPointerResult {
  ok: boolean;
  etag?: string | null;
  reason?: "conflict" | "unconfigured" | "error";
  message?: string;
}

/**
 * Write the pointer. When `expectedEtag` is provided we require it to match;
 * when null we require absence (first write or after end). Callers should
 * normally pass the result of the most recent `fetchActivePointer` etag.
 */
export async function putActivePointer(
  pointer: ActiveLogPointer,
  expectedEtag: string | null
): Promise<PutPointerResult> {
  if (typeof window === "undefined") {
    return { ok: false, reason: "error", message: "no window" };
  }
  try {
    const res = await fetch("/api/storage/active", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pointer, etag: expectedEtag }),
    });
    if (res.status === 503) {
      return { ok: false, reason: "unconfigured" };
    }
    if (res.status === 409) {
      return { ok: false, reason: "conflict" };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, reason: "error", message: text || `${res.status}` };
    }
    const json = (await res.json()) as { etag?: string | null };
    lastFetchedEtag = typeof json.etag === "string" ? json.etag : null;
    return { ok: true, etag: lastFetchedEtag };
  } catch (e) {
    return {
      ok: false,
      reason: "error",
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function clearActivePointer(
  expectedEtag: string | null
): Promise<PutPointerResult> {
  if (typeof window === "undefined") {
    return { ok: false, reason: "error", message: "no window" };
  }
  try {
    const res = await fetch("/api/storage/active", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etag: expectedEtag }),
    });
    if (res.status === 503) {
      return { ok: false, reason: "unconfigured" };
    }
    if (res.status === 409) {
      return { ok: false, reason: "conflict" };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, reason: "error", message: text || `${res.status}` };
    }
    lastFetchedEtag = null;
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      reason: "error",
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

// ---------------------------------------------------------------------------
// Constructors / helpers.
// ---------------------------------------------------------------------------

export function buildPointerForStart(logId: string): ActiveLogPointer {
  const now = new Date();
  return {
    logId,
    leasedByDevice: getDeviceId(),
    leaseStartedAt: now.toISOString(),
    leaseRenewedAt: now.toISOString(),
    leaseExpiresAt: new Date(
      now.getTime() + DEFAULT_LEASE_MINUTES * 60 * 1000
    ).toISOString(),
    version: 1,
    schemaVersion: SCHEMA_VERSION,
  };
}

export function buildPointerForRenew(
  current: ActiveLogPointer
): ActiveLogPointer {
  const now = new Date();
  return {
    ...current,
    leasedByDevice: getDeviceId(),
    leaseRenewedAt: now.toISOString(),
    leaseExpiresAt: new Date(
      now.getTime() + DEFAULT_LEASE_MINUTES * 60 * 1000
    ).toISOString(),
    version: (current.version ?? 1) + 1,
    schemaVersion: SCHEMA_VERSION,
  };
}

export function isLeaseExpired(pointer: ActiveLogPointer, now: Date): boolean {
  const exp = new Date(pointer.leaseExpiresAt).getTime();
  return Number.isFinite(exp) ? now.getTime() > exp : false;
}

export function isOwnedByThisDevice(pointer: ActiveLogPointer): boolean {
  return pointer.leasedByDevice === getDeviceId();
}

export const LEASE_RENEW_INTERVAL_MS = LEASE_RENEW_MS;
