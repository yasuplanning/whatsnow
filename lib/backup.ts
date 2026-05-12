import JSZip from "jszip";
import type {
  CheckinEntry,
  CountdownTimer,
  EventEntry,
  LogEntry,
  RecurringTodo,
  Subscription,
  TodoItem,
} from "./types";
import {
  getAllPhotos,
  getCountdownTimers,
  getRecurringTodos,
  getSubscriptions,
  getTodos,
  loadCheckins,
  loadEvents,
  loadLastActivityAt,
  loadLogs,
  restoreAllData,
  type BackupSnapshot,
} from "./storage";
import { formatLocalDateKey, nowJstIso, pad2 } from "./time";

const BACKUP_FORMAT = "whatsnow-backup";
const BACKUP_VERSION = 1;

interface Manifest {
  format: string;
  version: number;
  exportedAt: string;
  counts: {
    logs: number;
    events: number;
    checkins: number;
    todos: number;
    recurringTodos: number;
    countdowns: number;
    subscriptions: number;
    photos: number;
  };
}

interface DataPayload {
  logs: LogEntry[];
  events: EventEntry[];
  checkins: CheckinEntry[];
  todos: TodoItem[];
  recurringTodos: RecurringTodo[];
  countdowns: CountdownTimer[];
  subscriptions: Subscription[];
  lastActivityAt: string | null;
}

function mimeToExtension(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime === "image/svg+xml") return "svg";
  return "bin";
}

function extensionToMime(ext: string): string {
  const e = ext.toLowerCase();
  if (e === "png") return "image/png";
  if (e === "jpg" || e === "jpeg") return "image/jpeg";
  if (e === "webp") return "image/webp";
  if (e === "gif") return "image/gif";
  if (e === "svg") return "image/svg+xml";
  return "application/octet-stream";
}

function parseDataUrl(
  dataUrl: string
): { mime: string; base64: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  return { mime: m[1], base64: m[2] };
}

function buildTimestamp(): string {
  const d = new Date();
  return `${formatLocalDateKey(d)}-${pad2(d.getHours())}${pad2(d.getMinutes())}`;
}

export interface ExportResult {
  blob: Blob;
  filename: string;
  counts: Manifest["counts"];
}

export async function exportBackup(): Promise<ExportResult> {
  const logs = loadLogs();
  const events = loadEvents();
  const checkins = loadCheckins();
  const todos = getTodos();
  const recurringTodos = getRecurringTodos();
  const countdowns = getCountdownTimers();
  const subscriptions = getSubscriptions();
  const lastActivityAt = loadLastActivityAt();
  const photos = getAllPhotos();

  const data: DataPayload = {
    logs,
    events,
    checkins,
    todos,
    recurringTodos,
    countdowns,
    subscriptions,
    lastActivityAt,
  };

  const manifest: Manifest = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: nowJstIso(),
    counts: {
      logs: logs.length,
      events: events.length,
      checkins: checkins.length,
      todos: todos.length,
      recurringTodos: recurringTodos.length,
      countdowns: countdowns.length,
      subscriptions: subscriptions.length,
      photos: Object.keys(photos).length,
    },
  };

  const zip = new JSZip();
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  zip.file("data.json", JSON.stringify(data, null, 2));

  const photoIndex: Record<string, string> = {};
  for (const [photoId, dataUrl] of Object.entries(photos)) {
    const parsed = parseDataUrl(dataUrl);
    if (!parsed) continue;
    const ext = mimeToExtension(parsed.mime);
    const filename = `${photoId}.${ext}`;
    photoIndex[photoId] = filename;
    zip.file(`photos/${filename}`, parsed.base64, { base64: true });
  }
  zip.file("photos/index.json", JSON.stringify(photoIndex, null, 2));

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/zip",
  });
  return {
    blob,
    filename: `whatsnow-backup-${buildTimestamp()}.zip`,
    counts: manifest.counts,
  };
}

function isStringArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

function validateData(raw: unknown): DataPayload {
  if (!raw || typeof raw !== "object") {
    throw new Error("data.json の形式が不正です。");
  }
  const obj = raw as Record<string, unknown>;
  const arr = (key: string): unknown[] => {
    const v = obj[key];
    if (v === undefined || v === null) return [];
    if (!isStringArray(v)) {
      throw new Error(`data.json の "${key}" が配列ではありません。`);
    }
    return v;
  };
  return {
    logs: arr("logs") as LogEntry[],
    events: arr("events") as EventEntry[],
    checkins: arr("checkins") as CheckinEntry[],
    todos: arr("todos") as TodoItem[],
    recurringTodos: arr("recurringTodos") as RecurringTodo[],
    countdowns: arr("countdowns") as CountdownTimer[],
    subscriptions: arr("subscriptions") as Subscription[],
    lastActivityAt:
      typeof obj.lastActivityAt === "string" ? obj.lastActivityAt : null,
  };
}

export interface ImportPreview {
  exportedAt: string;
  counts: Manifest["counts"];
}

export async function importBackup(file: File): Promise<ImportPreview> {
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);

  const manifestFile = zip.file("manifest.json");
  if (!manifestFile) {
    throw new Error("manifest.json が見つかりません。バックアップZIPではない可能性があります。");
  }
  const manifestRaw = await manifestFile.async("string");
  let manifest: Manifest;
  try {
    manifest = JSON.parse(manifestRaw);
  } catch {
    throw new Error("manifest.json の解析に失敗しました。");
  }
  if (manifest.format !== BACKUP_FORMAT) {
    throw new Error("WhatsNowのバックアップ形式ではありません。");
  }
  if (manifest.version > BACKUP_VERSION) {
    throw new Error(
      `このアプリより新しい形式 (v${manifest.version}) のバックアップです。アプリを更新してください。`
    );
  }

  const dataFile = zip.file("data.json");
  if (!dataFile) {
    throw new Error("data.json が見つかりません。");
  }
  const dataRaw = await dataFile.async("string");
  let dataParsed: unknown;
  try {
    dataParsed = JSON.parse(dataRaw);
  } catch {
    throw new Error("data.json の解析に失敗しました。");
  }
  const data = validateData(dataParsed);

  const photos: Record<string, string> = {};
  const indexFile = zip.file("photos/index.json");
  let photoIndex: Record<string, string> = {};
  if (indexFile) {
    const indexRaw = await indexFile.async("string");
    try {
      const parsed = JSON.parse(indexRaw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        photoIndex = parsed as Record<string, string>;
      }
    } catch {
      // ignore
    }
  }

  const entries =
    Object.keys(photoIndex).length > 0
      ? Object.entries(photoIndex)
      : zip
          .file(/^photos\/[^/]+\.(png|jpe?g|webp|gif|svg)$/i)
          .map((f) => {
            const base = f.name.replace(/^photos\//, "");
            const dot = base.lastIndexOf(".");
            const id = dot === -1 ? base : base.slice(0, dot);
            return [id, base] as [string, string];
          });

  for (const [photoId, filename] of entries) {
    const f = zip.file(`photos/${filename}`);
    if (!f) continue;
    const dot = filename.lastIndexOf(".");
    const ext = dot === -1 ? "" : filename.slice(dot + 1);
    const mime = extensionToMime(ext);
    const base64 = await f.async("base64");
    photos[photoId] = `data:${mime};base64,${base64}`;
  }

  const snapshot: BackupSnapshot = {
    logs: data.logs,
    events: data.events,
    checkins: data.checkins,
    todos: data.todos,
    recurringTodos: data.recurringTodos,
    countdowns: data.countdowns,
    subscriptions: data.subscriptions,
    lastActivityAt: data.lastActivityAt,
    photos,
  };

  restoreAllData(snapshot);

  return {
    exportedAt: manifest.exportedAt,
    counts: manifest.counts,
  };
}

export function triggerDownload(blob: Blob, filename: string): void {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
