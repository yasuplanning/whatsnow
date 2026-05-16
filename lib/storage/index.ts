// Public storage API. Existing call sites import from "@/lib/storage";
// most names are preserved so app/page.tsx and lib/backup.ts keep working.
//
// Phase 1 strategy:
//   - localStorage is the synchronous read cache.
//   - All save* calls write to localStorage immediately, then schedule a
//     debounced push to S3 via lib/storage/s3.ts.
//   - On startup the page calls initStorageSync() to fetch latest.json from S3
//     and overwrite the local cache (or initialise S3 if the file is missing).
//
// When auth/multi-user is added later, only lib/server/s3.ts and the
// /api/storage/* routes need to learn about userId; this layer stays the same.

import type {
  CheckinEntry,
  CountdownTimer,
  LogEntry,
  RecurringTodo,
  Subscription,
  TodoItem,
} from "../types";
import type { CategoryDefinition } from "../category";
import * as Local from "./local";
import {
  type BackupSnapshot,
  type RemoteData,
  type SyncStatus,
} from "./types";
import {
  deletePhotoRemote,
  fetchLatestFromS3,
  fetchPhotoIfMissing,
  flushSave,
  getCurrentMeta,
  getMode,
  getSyncStatus,
  scheduleSave,
  setSnapshotProvider,
  subscribePhotoUpdate,
  subscribeSyncStatus,
  uploadPhoto,
} from "./s3";

// ---------------------------------------------------------------------------
// Re-export pure helpers (no IO) and read-only loaders unchanged.
// ---------------------------------------------------------------------------

export {
  // ids / pure
  generateId,
  findActiveLog,
  upsertLog,
  upsertCheckin,
  removeCheckin,
  addTodo,
  updateTodo,
  deleteTodo,
  completeTodo,
  getTodoById,
  moveTodoUp,
  moveTodoDown,
  reorderOpenTodos,
  addRecurringTodo,
  updateRecurringTodo,
  deleteRecurringTodo,
  getRecurringTodoById,
  addCountdownTimer,
  updateCountdownTimer,
  completeCountdownTimer,
  cancelCountdownTimer,
  getActiveCountdownTimers,
  addSubscription,
  updateSubscription,
  deleteSubscription,
  // sync read-from-cache loaders
  loadLogs,
  loadCheckins,
  loadLastActivityAt,
  getTodos,
  getRecurringTodos,
  getCountdownTimers,
  getSubscriptions,
  getCategoriesFromStorage,
  getAllPhotos,
} from "./local";

export type { BackupSnapshot } from "./types";

// Re-export sync-status surface for the UI.
export {
  subscribeSyncStatus,
  subscribePhotoUpdate,
  getSyncStatus,
  getMode,
};
export type { SyncStatus } from "./types";

// ---------------------------------------------------------------------------
// Snapshot provider: builds the RemoteData payload for S3 from the local cache.
// ---------------------------------------------------------------------------

function buildRemoteSnapshot(): RemoteData {
  return {
    logs: Local.loadLogs(),
    checkins: Local.loadCheckins(),
    todos: Local.getTodos(),
    recurringTodos: Local.getRecurringTodos(),
    countdowns: Local.getCountdownTimers(),
    subscriptions: Local.getSubscriptions(),
    categories: Local.getCategoriesFromStorage(),
    // Per-device idle indicator; never synchronised across devices.
    lastActivityAt: null,
  };
}

function applyRemoteToLocal(data: RemoteData): void {
  Local.saveLogs(data.logs ?? []);
  Local.saveCheckins(data.checkins ?? []);
  Local.saveTodos(data.todos ?? []);
  Local.saveRecurringTodos(data.recurringTodos ?? []);
  Local.saveCountdownTimers(data.countdowns ?? []);
  Local.saveSubscriptions(data.subscriptions ?? []);
  if (Array.isArray(data.categories) && data.categories.length > 0) {
    Local.saveCategories(data.categories);
  }
  // Intentionally skip lastActivityAt: this field is per-device.
}

// ---------------------------------------------------------------------------
// Init / reload entry points the page calls.
// ---------------------------------------------------------------------------

export interface InitResult {
  ok: boolean;
  status: "ok" | "empty" | "unconfigured" | "error";
  usedRemote: boolean;
  errorMessage?: string;
}

let initialised = false;

export async function initStorageSync(): Promise<InitResult> {
  setSnapshotProvider(buildRemoteSnapshot);
  const fetched = await fetchLatestFromS3();
  if (fetched.status === "ok" && fetched.data) {
    // Once we know S3 is the source of truth, stop the migrate-on-read
    // auto-writeback so a plain reload does not race other devices.
    Local.setShouldWriteBackOnRead(false);
    applyRemoteToLocal(fetched.data);
    initialised = true;
    return { ok: true, status: "ok", usedRemote: true };
  }
  if (fetched.status === "empty") {
    Local.setShouldWriteBackOnRead(false);
    initialised = true;
    // Push current local cache up so S3 has an initial latest.json.
    scheduleSave();
    return { ok: true, status: "empty", usedRemote: false };
  }
  if (fetched.status === "unconfigured") {
    initialised = true;
    return { ok: true, status: "unconfigured", usedRemote: false };
  }
  initialised = true;
  return {
    ok: false,
    status: "error",
    usedRemote: false,
    errorMessage: fetched.errorMessage,
  };
}

export async function forceReloadFromS3(): Promise<InitResult> {
  const fetched = await fetchLatestFromS3();
  if (fetched.status === "ok" && fetched.data) {
    Local.setShouldWriteBackOnRead(false);
    applyRemoteToLocal(fetched.data);
    return { ok: true, status: "ok", usedRemote: true };
  }
  if (fetched.status === "empty") {
    Local.setShouldWriteBackOnRead(false);
    return { ok: true, status: "empty", usedRemote: false };
  }
  if (fetched.status === "unconfigured") {
    return { ok: true, status: "unconfigured", usedRemote: false };
  }
  return {
    ok: false,
    status: "error",
    usedRemote: false,
    errorMessage: fetched.errorMessage,
  };
}

export async function flushPendingSaves(): Promise<void> {
  await flushSave();
}

export function getSnapshotMeta() {
  return getCurrentMeta();
}

// ---------------------------------------------------------------------------
// Wrapped writers: write local cache + schedule S3 push.
// ---------------------------------------------------------------------------

function afterWrite(): void {
  if (initialised) scheduleSave();
}

export function saveLogs(items: LogEntry[]): void {
  Local.saveLogs(items);
  afterWrite();
}
export function saveCheckins(items: CheckinEntry[]): void {
  Local.saveCheckins(items);
  afterWrite();
}
export function saveTodos(items: TodoItem[]): void {
  Local.saveTodos(items);
  afterWrite();
}
export function saveRecurringTodos(items: RecurringTodo[]): void {
  Local.saveRecurringTodos(items);
  afterWrite();
}
export function saveCountdownTimers(items: CountdownTimer[]): void {
  Local.saveCountdownTimers(items);
  afterWrite();
}
export function saveSubscriptions(items: Subscription[]): void {
  Local.saveSubscriptions(items);
  afterWrite();
}
export function saveCategories(items: CategoryDefinition[]): void {
  Local.saveCategories(items);
  afterWrite();
}

// lastActivityAt: per spec, kept locally and not synced to S3.
// Still mirrored into latest.json on the next push so a fresh device sees
// a sensible value, but writes do not by themselves trigger a push.
export function saveLastActivityAt(iso: string): void {
  Local.saveLastActivityAt(iso);
}
export function clearLastActivityAt(): void {
  Local.clearLastActivityAt();
}

export function clearAllLogs(): void {
  Local.clearAllLogs();
  afterWrite();
}
export function clearAllCheckins(): void {
  Local.clearAllCheckins();
  afterWrite();
}
export function clearAllTodos(): void {
  Local.clearAllTodos();
  afterWrite();
}
export function clearAllRecurringTodos(): void {
  Local.clearAllRecurringTodos();
  afterWrite();
}
export function clearAllCountdownTimers(): void {
  Local.clearAllCountdownTimers();
  afterWrite();
}
export function clearAllSubscriptions(): void {
  Local.clearAllSubscriptions();
  afterWrite();
}
export function clearAllCategories(): void {
  Local.clearAllCategories();
  afterWrite();
}
export function clearAllPhotos(): void {
  Local.clearAllPhotos();
  // Photos live in their own S3 keys; phase 1 does not bulk-delete remote
  // photos here. Backup-restore replaces the photo set explicitly via
  // setAllPhotos which uploads each entry.
}

// ---------------------------------------------------------------------------
// Photos.
// ---------------------------------------------------------------------------

export function savePhoto(dataUrl: string): {
  photoId: string;
  photoPath: string;
} {
  const result = Local.savePhoto(dataUrl);
  void uploadPhoto(result.photoId, dataUrl);
  return result;
}

export function removePhoto(photoId: string | null | undefined): void {
  if (!photoId) return;
  Local.removePhoto(photoId);
  void deletePhotoRemote(photoId);
}

export function getPhotoDataUrl(
  photoId: string | null | undefined
): string | null {
  if (!photoId) return null;
  const cached = Local.getPhotoDataUrl(photoId);
  if (cached) return cached;
  if (getMode() === "s3") {
    fetchPhotoIfMissing(
      photoId,
      () => Local.getPhotoDataUrl(photoId) !== null,
      (dataUrl) => Local.setPhotoCache(photoId, dataUrl)
    );
  }
  return null;
}

export function setAllPhotos(map: Record<string, string>): void {
  Local.setAllPhotos(map);
  if (getMode() === "s3") {
    // Fire-and-forget upload of each photo. Phase 1: simple loop.
    // Phase 2 should batch / retry / dedupe.
    for (const [id, dataUrl] of Object.entries(map)) {
      void uploadPhoto(id, dataUrl);
    }
  }
}

export function restoreAllData(snapshot: BackupSnapshot): void {
  Local.restoreAllData(snapshot);
  // Push the restored state to S3 as the new authoritative latest.json.
  if (getMode() === "s3") {
    if (snapshot.photos) {
      for (const [id, dataUrl] of Object.entries(snapshot.photos)) {
        void uploadPhoto(id, dataUrl);
      }
    }
    afterWrite();
  }
}
