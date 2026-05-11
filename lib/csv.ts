import type {
  CheckinEntry,
  CountdownTimer,
  EventEntry,
  LogEntry,
  TodoItem,
} from "./types";
import {
  checkinToUnified,
  countdownToUnified,
  eventToUnified,
  taskToUnified,
  todoDoneToUnified,
  type UnifiedLog,
} from "./unified";

const HEADER = [
  "type",
  "title",
  "category",
  "startAt",
  "endAt",
  "durationMinutes",
  "memo",
  "status",
  "photoPath",
];

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function formatLocalDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dateKeyOf(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return formatLocalDateKey(d);
}

function escapeCsvField(value: string): string {
  const needsQuote = /[",\r\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

interface FilteredEntries {
  tasks: LogEntry[];
  events: EventEntry[];
  checkins: CheckinEntry[];
  countdowns: CountdownTimer[];
  todoDones: TodoItem[];
}

export function entriesForDate(
  tasks: LogEntry[],
  events: EventEntry[],
  checkins: CheckinEntry[],
  countdowns: CountdownTimer[],
  todos: TodoItem[],
  dateKey: string
): FilteredEntries {
  return {
    tasks: tasks.filter((t) => dateKeyOf(t.startAt) === dateKey),
    events: events.filter((e) => dateKeyOf(e.timestamp) === dateKey),
    checkins: checkins.filter((c) => dateKeyOf(c.checkedAt) === dateKey),
    countdowns: countdowns.filter((c) => dateKeyOf(c.startedAt) === dateKey),
    todoDones: todos.filter(
      (t) => t.status === "done" && dateKeyOf(t.doneAt) === dateKey
    ),
  };
}

function chooseStartAt(u: UnifiedLog): string {
  return (
    u.startAt ?? u.eventAt ?? u.checkinAt ?? u.endAt ?? u.updatedAt ?? ""
  );
}

function chooseEndAt(u: UnifiedLog): string {
  return u.endAt ?? "";
}

export function buildCsv(
  tasks: LogEntry[],
  events: EventEntry[],
  checkins: CheckinEntry[],
  countdowns: CountdownTimer[],
  todoDones: TodoItem[]
): string {
  const rows: UnifiedLog[] = [
    ...tasks.map(taskToUnified),
    ...events.map(eventToUnified),
    ...checkins.map(checkinToUnified),
    ...countdowns.map(countdownToUnified),
    ...todoDones.map(todoDoneToUnified),
  ];
  rows.sort((a, b) => chooseStartAt(a).localeCompare(chooseStartAt(b)));

  const lines: string[] = [];
  lines.push(HEADER.map(escapeCsvField).join(","));
  for (const r of rows) {
    lines.push(
      [
        r.type,
        r.title,
        r.category ?? "",
        chooseStartAt(r),
        chooseEndAt(r),
        r.durationMinutes != null ? String(r.durationMinutes) : "",
        r.memo,
        r.status,
        r.photoPath ?? "",
      ]
        .map(escapeCsvField)
        .join(",")
    );
  }
  return lines.join("\r\n");
}

export function buildUnifiedLogs(
  tasks: LogEntry[],
  events: EventEntry[],
  checkins: CheckinEntry[],
  countdowns: CountdownTimer[],
  todoDones: TodoItem[]
): UnifiedLog[] {
  const rows: UnifiedLog[] = [
    ...tasks.map(taskToUnified),
    ...events.map(eventToUnified),
    ...checkins.map(checkinToUnified),
    ...countdowns.map(countdownToUnified),
    ...todoDones.map(todoDoneToUnified),
  ];
  rows.sort((a, b) => chooseStartAt(a).localeCompare(chooseStartAt(b)));
  return rows;
}

export function downloadCsv(
  dateKey: string,
  tasks: LogEntry[],
  events: EventEntry[],
  checkins: CheckinEntry[],
  countdowns: CountdownTimer[],
  todoDones: TodoItem[]
): void {
  if (typeof window === "undefined") return;
  const csv = buildCsv(tasks, events, checkins, countdowns, todoDones);
  const bom = "﻿";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, `lifelog-${dateKey}.csv`);
}

export function downloadJson(
  dateKey: string,
  tasks: LogEntry[],
  events: EventEntry[],
  checkins: CheckinEntry[],
  countdowns: CountdownTimer[],
  todoDones: TodoItem[]
): void {
  if (typeof window === "undefined") return;
  const logs = buildUnifiedLogs(tasks, events, checkins, countdowns, todoDones);
  const json = JSON.stringify({ date: dateKey, logs }, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  triggerDownload(blob, `lifelog-${dateKey}.json`);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
