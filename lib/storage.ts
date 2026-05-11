import type { CheckinEntry, EventEntry, LogEntry } from "./types";

const STORAGE_KEY = "whatsnow.logs.v1";
const EVENT_STORAGE_KEY = "whatsnow.events.v1";
const CHECKIN_STORAGE_KEY = "whatsnow.checkins.v1";
const LAST_ACTIVITY_KEY = "whatsnow.lastActivityAt.v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadLogs(): LogEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({ ...item, type: "task" as const })) as LogEntry[];
  } catch {
    return [];
  }
}

export function saveLogs(logs: LogEntry[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch {
    // ignore quota errors
  }
}

export function findActiveLog(logs: LogEntry[]): LogEntry | null {
  return logs.find((l) => l.status === "active") ?? null;
}

export function upsertLog(logs: LogEntry[], entry: LogEntry): LogEntry[] {
  const idx = logs.findIndex((l) => l.id === entry.id);
  if (idx === -1) return [...logs, entry];
  const next = logs.slice();
  next[idx] = entry;
  return next;
}

export function clearAllLogs(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function loadEvents(): EventEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(EVENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({ ...item, type: "event" as const })) as EventEntry[];
  } catch {
    return [];
  }
}

export function saveEvents(events: EventEntry[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(events));
  } catch {
    // ignore quota errors
  }
}

export function upsertEvent(events: EventEntry[], entry: EventEntry): EventEntry[] {
  const idx = events.findIndex((e) => e.id === entry.id);
  if (idx === -1) return [...events, entry];
  const next = events.slice();
  next[idx] = entry;
  return next;
}

export function removeEvent(events: EventEntry[], id: string): EventEntry[] {
  return events.filter((e) => e.id !== id);
}

export function clearAllEvents(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(EVENT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function loadCheckins(): CheckinEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(CHECKIN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({ ...item, type: "checkin" as const })) as CheckinEntry[];
  } catch {
    return [];
  }
}

export function saveCheckins(checkins: CheckinEntry[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(CHECKIN_STORAGE_KEY, JSON.stringify(checkins));
  } catch {
    // ignore quota errors
  }
}

export function upsertCheckin(checkins: CheckinEntry[], entry: CheckinEntry): CheckinEntry[] {
  const idx = checkins.findIndex((c) => c.id === entry.id);
  if (idx === -1) return [...checkins, entry];
  const next = checkins.slice();
  next[idx] = entry;
  return next;
}

export function removeCheckin(checkins: CheckinEntry[], id: string): CheckinEntry[] {
  return checkins.filter((c) => c.id !== id);
}

export function clearAllCheckins(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(CHECKIN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function loadLastActivityAt(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(LAST_ACTIVITY_KEY);
  } catch {
    return null;
  }
}

export function saveLastActivityAt(iso: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(LAST_ACTIVITY_KEY, iso);
  } catch {
    // ignore
  }
}

export function clearLastActivityAt(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch {
    // ignore
  }
}
