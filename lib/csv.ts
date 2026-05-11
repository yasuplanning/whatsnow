import type {
  CheckinEntry,
  CountdownTimer,
  EventEntry,
  LogEntry,
  TodoItem,
} from "./types";

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
  "todoTitle",
  "ステータス",
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
  countdowns: CountdownTimer[];
}

export function entriesForDate(
  tasks: LogEntry[],
  events: EventEntry[],
  checkins: CheckinEntry[],
  countdowns: CountdownTimer[],
  dateKey: string
): FilteredEntries {
  return {
    tasks: tasks.filter((t) => dateKeyOf(t.startAt) === dateKey),
    events: events.filter((e) => dateKeyOf(e.timestamp) === dateKey),
    checkins: checkins.filter((c) => dateKeyOf(c.checkedAt) === dateKey),
    countdowns: countdowns.filter(
      (c) => dateKeyOf(c.startedAt) === dateKey
    ),
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
  todoTitle: string;
  status: string;
  sortKey: string;
}

function resolveTodoTitle(
  todoMap: Map<string, TodoItem>,
  todoId: string | null | undefined
): string {
  if (!todoId) return "";
  return todoMap.get(todoId)?.title ?? "";
}

function taskRow(t: LogEntry, todoMap: Map<string, TodoItem>): CsvRow {
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
    todoTitle: resolveTodoTitle(todoMap, t.todoId ?? null),
    status: t.status,
    sortKey: t.startAt ?? "",
  };
}

function eventRow(e: EventEntry, todoMap: Map<string, TodoItem>): CsvRow {
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
    todoTitle: resolveTodoTitle(todoMap, e.todoId ?? null),
    status: "",
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
    todoTitle: "",
    status: "",
    sortKey: c.checkedAt ?? "",
  };
}

function countdownRow(c: CountdownTimer): CsvRow {
  return {
    type: "countdown",
    content: c.title,
    startAt: formatLocalDateTime(c.startedAt),
    endAt: formatLocalDateTime(c.completedAt),
    plannedEndAt: formatLocalDateTime(c.dueAt),
    timestamp: "",
    checkedAt: "",
    memo: c.memo,
    photo: "",
    todoTitle: "",
    status: c.status,
    sortKey: c.startedAt ?? "",
  };
}

export function buildCsv(
  tasks: LogEntry[],
  events: EventEntry[],
  checkins: CheckinEntry[],
  countdowns: CountdownTimer[],
  todos: TodoItem[]
): string {
  const todoMap = new Map<string, TodoItem>();
  for (const t of todos) todoMap.set(t.id, t);

  const rows: CsvRow[] = [
    ...tasks.map((t) => taskRow(t, todoMap)),
    ...events.map((e) => eventRow(e, todoMap)),
    ...checkins.map(checkinRow),
    ...countdowns.map(countdownRow),
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
        r.todoTitle,
        r.status,
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
  checkins: CheckinEntry[],
  countdowns: CountdownTimer[],
  todos: TodoItem[]
): void {
  if (typeof window === "undefined") return;
  const csv = buildCsv(tasks, events, checkins, countdowns, todos);
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
