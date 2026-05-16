import type { CategoryDefinition } from "../category";
import type {
  CheckinEntry,
  CountdownTimer,
  LogEntry,
  RecurringTodo,
  Subscription,
  TodoItem,
} from "../types";

export const SCHEMA_VERSION = 1;

/**
 * Lightweight singleton pointer at `users/{u}/whatsnow/active.json`.
 *
 * The full LogEntry still lives elsewhere (currently inside latest.json; later
 * phases will move it to logs/{id}.json). This pointer says "which log is
 * currently running, and which device is holding the lease". A missing
 * active.json means "no active log".
 */
export interface ActiveLogPointer {
  logId: string;
  leasedByDevice: string;
  leaseStartedAt: string;
  leaseRenewedAt: string;
  leaseExpiresAt: string;
  /** Monotonic counter incremented on each PUT for client-side reasoning. */
  version: number;
  schemaVersion: number;
}

export interface BackupSnapshot {
  logs: LogEntry[];
  checkins: CheckinEntry[];
  todos: TodoItem[];
  recurringTodos: RecurringTodo[];
  countdowns: CountdownTimer[];
  subscriptions: Subscription[];
  categories: CategoryDefinition[];
  logCategories: CategoryDefinition[];
  lastActivityAt: string | null;
  photos: Record<string, string>;
}

export interface RemoteData {
  logs: LogEntry[];
  checkins: CheckinEntry[];
  todos: TodoItem[];
  recurringTodos: RecurringTodo[];
  countdowns: CountdownTimer[];
  subscriptions: Subscription[];
  categories: CategoryDefinition[];
  logCategories: CategoryDefinition[];
  lastActivityAt: string | null;
}

export interface RemoteSnapshot {
  schemaVersion: number;
  version: number;
  updatedAt: string;
  updatedBy: string;
  data: RemoteData;
}

export interface SnapshotMeta {
  version: number;
  etag: string | null;
  updatedAt: string;
  updatedBy: string;
}

export type SyncMode = "unknown" | "s3" | "local";

export type SyncStatus =
  | { kind: "idle" }
  | { kind: "syncing" }
  | { kind: "saving" }
  | { kind: "saved"; at: string }
  | { kind: "loadFailed"; message: string }
  | { kind: "saveFailed"; message: string }
  | { kind: "conflict" }
  | { kind: "offline" }
  | { kind: "localOnly" };

export const CONFLICT_MESSAGE =
  "他の端末でデータが更新されています。最新データを再読み込みしてから保存してください。";
export const LOAD_FAILED_MESSAGE =
  "S3から最新データを取得できなかったため、この端末の保存データを表示しています。";
