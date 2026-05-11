import type { CheckinEntry, EventEntry, LogEntry } from "./types";

const HEADER = [
  "type",
  "内容",
  "開始時刻",
  "終了時刻",
  "終了予定時刻",
  "イベント時刻",
  "チェックイン時刻",
  "メモ",
  "写真",
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

export function formatLocalDateTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
}

export function entriesForDate(
  tasks: LogEntry[],
  events: EventEntry[],
  checkins: CheckinEntry[],
  dateKey: string
): FilteredEntries {
  return {
    tasks: tasks.filter((t) => dateKeyOf(t.startAt) === dateKey),
    events: events.filter((e) => dateKeyOf(e.timestamp) === dateKey),
    checkins: checkins.filter((c) => dateKeyOf(c.checkedAt) === dateKey),
  };
}

interface CsvRow {
  type: string;
  content: string;
  startAt: string;
  endAt: string;
  plannedEndAt: string;
  timestamp: string;
  checkedAt: string;
  memo: string;
  photo: string;
  sortKey: string;
}

function taskRow(t: LogEntry): CsvRow {
  return {
    type: "task",
    content: t.task,
    startAt: formatLocalDateTime(t.startAt),
    endAt: formatLocalDateTime(t.endAt),
    plannedEndAt: formatLocalDateTime(t.plannedEndAt),
    timestamp: "",
    checkedAt: "",
    memo: t.memo,
    photo: "",
    sortKey: t.startAt ?? "",
  };
}

function eventRow(e: EventEntry): CsvRow {
  return {
    type: "event",
    content: e.content,
    startAt: "",
    endAt: "",
    plannedEndAt: "",
    timestamp: formatLocalDateTime(e.timestamp),
    checkedAt: "",
    memo: e.memo,
    photo: e.photo ?? "",
    sortKey: e.timestamp ?? "",
  };
}

function checkinRow(c: CheckinEntry): CsvRow {
  return {
    type: "checkin",
    content: c.text,
    startAt: "",
    endAt: "",
    plannedEndAt: "",
    timestamp: "",
    checkedAt: formatLocalDateTime(c.checkedAt),
    memo: "",
    photo: "",
    sortKey: c.checkedAt ?? "",
  };
}

export function buildCsv(
  tasks: LogEntry[],
  events: EventEntry[],
  checkins: CheckinEntry[]
): string {
  const rows: CsvRow[] = [
    ...tasks.map(taskRow),
    ...events.map(eventRow),
    ...checkins.map(checkinRow),
  ];
  rows.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  const lines: string[] = [];
  lines.push(HEADER.map(escapeCsvField).join(","));
  for (const r of rows) {
    lines.push(
      [
        r.type,
        r.content,
        r.startAt,
        r.endAt,
        r.plannedEndAt,
        r.timestamp,
        r.checkedAt,
        r.memo,
        r.photo,
      ]
        .map(escapeCsvField)
        .join(",")
    );
  }
  return lines.join("\r\n");
}

export function downloadCsv(
  dateKey: string,
  tasks: LogEntry[],
  events: EventEntry[],
  checkins: CheckinEntry[]
): void {
  if (typeof window === "undefined") return;
  const csv = buildCsv(tasks, events, checkins);
  const bom = "﻿";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `lifelog-${dateKey}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
