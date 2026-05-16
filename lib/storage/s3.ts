"use client";

import { getDeviceId } from "./device";
import {
  CONFLICT_MESSAGE,
  LOAD_FAILED_MESSAGE,
  SCHEMA_VERSION,
  type RemoteData,
  type RemoteSnapshot,
  type SnapshotMeta,
  type SyncMode,
  type SyncStatus,
} from "./types";

let mode: SyncMode = "unknown";
let currentMeta: SnapshotMeta | null = null;
let dirty = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let inflightSave: Promise<void> | null = null;
let pendingSnapshotProvider: (() => RemoteData) | null = null;

const statusListeners = new Set<(s: SyncStatus) => void>();
const photoListeners = new Set<() => void>();
let currentStatus: SyncStatus = { kind: "idle" };

const SAVE_DEBOUNCE_MS = 600;

function setStatus(s: SyncStatus): void {
  currentStatus = s;
  for (const l of statusListeners) {
    try {
      l(s);
    } catch {
      // ignore listener errors
    }
  }
}

export function getSyncStatus(): SyncStatus {
  return currentStatus;
}

export function subscribeSyncStatus(
  fn: (s: SyncStatus) => void
): () => void {
  statusListeners.add(fn);
  fn(currentStatus);
  return () => {
    statusListeners.delete(fn);
  };
}

export function subscribePhotoUpdate(fn: () => void): () => void {
  photoListeners.add(fn);
  return () => {
    photoListeners.delete(fn);
  };
}

function notifyPhotoUpdate(): void {
  for (const l of photoListeners) {
    try {
      l();
    } catch {
      // ignore
    }
  }
}

export function getMode(): SyncMode {
  return mode;
}

export function setSnapshotProvider(provider: () => RemoteData): void {
  pendingSnapshotProvider = provider;
}

export function getCurrentMeta(): SnapshotMeta | null {
  return currentMeta;
}

export interface FetchedSnapshot {
  data: RemoteData | null;
  meta: SnapshotMeta | null;
  status: "ok" | "empty" | "unconfigured" | "error";
  errorMessage?: string;
}

export async function fetchLatestFromS3(): Promise<FetchedSnapshot> {
  if (typeof window === "undefined") {
    return {
      data: null,
      meta: null,
      status: "error",
      errorMessage: "no window",
    };
  }
  setStatus({ kind: "syncing" });
  try {
    const res = await fetch("/api/storage/load", {
      method: "GET",
      cache: "no-store",
    });
    if (res.status === 503) {
      mode = "local";
      setStatus({ kind: "localOnly" });
      return { data: null, meta: null, status: "unconfigured" };
    }
    if (res.status === 404) {
      mode = "s3";
      currentMeta = {
        version: 0,
        etag: null,
        updatedAt: "",
        updatedBy: "",
      };
      setStatus({ kind: "saved", at: new Date().toISOString() });
      return { data: null, meta: currentMeta, status: "empty" };
    }
    if (!res.ok) {
      mode = "local";
      const msg = `${res.status} ${res.statusText}`;
      setStatus({ kind: "loadFailed", message: LOAD_FAILED_MESSAGE });
      return { data: null, meta: null, status: "error", errorMessage: msg };
    }
    const json = (await res.json()) as {
      snapshot: RemoteSnapshot | null;
      etag?: string | null;
    };
    if (!json.snapshot || typeof json.snapshot !== "object") {
      mode = "s3";
      currentMeta = {
        version: 0,
        etag: null,
        updatedAt: "",
        updatedBy: "",
      };
      setStatus({ kind: "saved", at: new Date().toISOString() });
      return { data: null, meta: currentMeta, status: "empty" };
    }
    const snap = json.snapshot;
    if (!snap.data || typeof snap.data !== "object") {
      throw new Error("invalid snapshot data");
    }
    mode = "s3";
    currentMeta = {
      version: typeof snap.version === "number" ? snap.version : 0,
      etag: typeof json.etag === "string" ? json.etag : null,
      updatedAt: typeof snap.updatedAt === "string" ? snap.updatedAt : "",
      updatedBy: typeof snap.updatedBy === "string" ? snap.updatedBy : "",
    };
    setStatus({ kind: "saved", at: new Date().toISOString() });
    return { data: snap.data, meta: currentMeta, status: "ok" };
  } catch (e) {
    mode = "local";
    const msg = e instanceof Error ? e.message : String(e);
    setStatus({ kind: "loadFailed", message: LOAD_FAILED_MESSAGE });
    return { data: null, meta: null, status: "error", errorMessage: msg };
  }
}

export function scheduleSave(): void {
  if (mode !== "s3") return;
  if (!pendingSnapshotProvider) return;
  dirty = true;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void flushSave();
  }, SAVE_DEBOUNCE_MS);
}

export async function flushSave(): Promise<void> {
  if (inflightSave) {
    await inflightSave;
    return;
  }
  if (!dirty || !pendingSnapshotProvider || mode !== "s3") return;
  // Conflict state must be resolved by an explicit reload before we try again.
  if (getSyncStatus().kind === "conflict") return;

  const provider = pendingSnapshotProvider;
  inflightSave = (async () => {
    setStatus({ kind: "saving" });
    const baseVersion = currentMeta?.version ?? 0;
    const etag = currentMeta?.etag ?? null;
    const deviceId = getDeviceId();
    const updatedAt = new Date().toISOString();
    try {
      const data = provider();
      // mark clean BEFORE the request: any save invoked during the request
      // will flip dirty back to true and trigger another flush after this one.
      dirty = false;
      const body = {
        baseVersion,
        etag,
        snapshot: {
          schemaVersion: SCHEMA_VERSION,
          version: baseVersion + 1,
          updatedAt,
          updatedBy: deviceId,
          data,
        } as RemoteSnapshot,
      };
      const res = await fetch("/api/storage/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 409) {
        // Re-mark dirty so a future reload + edit can retry; but stop the loop now.
        dirty = true;
        setStatus({ kind: "conflict" });
        return;
      }
      if (!res.ok) {
        dirty = true;
        const text = await res.text().catch(() => "");
        setStatus({
          kind: "saveFailed",
          message: text || `${res.status}`,
        });
        return;
      }
      const j = (await res.json()) as {
        version?: number;
        etag?: string | null;
      };
      currentMeta = {
        version: typeof j.version === "number" ? j.version : baseVersion + 1,
        etag: typeof j.etag === "string" ? j.etag : null,
        updatedAt,
        updatedBy: deviceId,
      };
      setStatus({ kind: "saved", at: updatedAt });
    } catch (e) {
      dirty = true;
      setStatus({
        kind: "saveFailed",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  })();
  try {
    await inflightSave;
  } finally {
    inflightSave = null;
  }
  const finalKind: SyncStatus["kind"] = getSyncStatus().kind;
  if (dirty && finalKind !== "conflict" && finalKind !== "saveFailed") {
    scheduleSave();
  }
}

// ---------------------------------------------------------------------------
// Photos: split off latest.json. PUT/GET/DELETE per photoId.
// `getPhotoDataUrl` in the index layer is sync (called from useMemo); when
// the photo is missing locally it asks us to fetch in background and notifies
// listeners so the view re-renders.
// ---------------------------------------------------------------------------

const photoFetchInflight = new Set<string>();

export async function uploadPhoto(
  photoId: string,
  dataUrl: string
): Promise<void> {
  if (mode !== "s3") return;
  try {
    await fetch(`/api/storage/photo/${encodeURIComponent(photoId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl }),
    });
  } catch {
    // best-effort; the binary still lives in localStorage cache.
    // A future phase 2 should add a retry/upload-queue here.
  }
}

export async function deletePhotoRemote(photoId: string): Promise<void> {
  if (mode !== "s3") return;
  try {
    await fetch(`/api/storage/photo/${encodeURIComponent(photoId)}`, {
      method: "DELETE",
    });
  } catch {
    // ignore
  }
}

export function fetchPhotoIfMissing(
  photoId: string,
  isCached: () => boolean,
  write: (dataUrl: string) => void
): void {
  if (mode !== "s3") return;
  if (!photoId) return;
  if (isCached()) return;
  if (photoFetchInflight.has(photoId)) return;
  photoFetchInflight.add(photoId);
  void (async () => {
    try {
      const res = await fetch(
        `/api/storage/photo/${encodeURIComponent(photoId)}`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const j = (await res.json()) as { dataUrl?: string };
      if (j && typeof j.dataUrl === "string") {
        write(j.dataUrl);
        notifyPhotoUpdate();
      }
    } catch {
      // ignore — photo will stay missing this session
    } finally {
      photoFetchInflight.delete(photoId);
    }
  })();
}

export { CONFLICT_MESSAGE, LOAD_FAILED_MESSAGE };
