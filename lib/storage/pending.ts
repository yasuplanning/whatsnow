// Persistent queue of unflushed mutations. The runtime layer (s3.ts) will
// consume entries from here in later phases. For now this module is purely
// the localStorage-backed durable store — no flushing is wired up yet.
//
// Each op is idempotent on its `id`. Duplicate enqueues with the same id are
// merged (later wins on `queuedAt`).

const PENDING_STORAGE_KEY = "whatsnow.pending.v1";

export type PendingOpKind = "upsert" | "delete";

export type PendingEntityKind =
  | "log"
  | "todo"
  | "checkin"
  | "countdown"
  | "subscription"
  | "recurringTodo"
  | "category"
  | "logCategory"
  | "active";

export interface PendingOp {
  id: string;
  kind: PendingOpKind;
  entity: PendingEntityKind;
  entityId: string;
  payload?: unknown;
  baseVersion: number;
  queuedAt: string;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readQueue(): PendingOp[] {
  if (!isBrowser()) return [];
  try {
    const text = window.localStorage.getItem(PENDING_STORAGE_KEY);
    if (!text) return [];
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPendingOp);
  } catch {
    return [];
  }
}

function writeQueue(ops: PendingOp[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(ops));
  } catch {
    // localStorage is full or denied — caller has no recourse; surface via UI later.
  }
}

function isPendingOp(value: unknown): value is PendingOp {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    (v.kind === "upsert" || v.kind === "delete") &&
    typeof v.entity === "string" &&
    typeof v.entityId === "string" &&
    typeof v.baseVersion === "number" &&
    typeof v.queuedAt === "string"
  );
}

export function enqueue(op: PendingOp): void {
  const queue = readQueue();
  const idx = queue.findIndex((o) => o.id === op.id);
  if (idx === -1) {
    queue.push(op);
  } else {
    queue[idx] = op;
  }
  writeQueue(queue);
}

export function peek(): PendingOp | null {
  const queue = readQueue();
  return queue[0] ?? null;
}

export function list(): PendingOp[] {
  return readQueue();
}

export function dequeue(opId: string): void {
  const queue = readQueue();
  const next = queue.filter((o) => o.id !== opId);
  if (next.length !== queue.length) writeQueue(next);
}

export function clear(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(PENDING_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function size(): number {
  return readQueue().length;
}
