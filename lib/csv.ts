import type { LogEntry } from "./types";

const HEADER = ["やった内容", "開始時刻", "終了時刻", "終了予定時刻", "メモ"];

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function formatLocalDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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

export function logsForDate(logs: LogEntry[], dateKey: string): LogEntry[] {
  return logs.filter((l) => {
    if (!l.startAt) return false;
    const d = new Date(l.startAt);
    if (Number.isNaN(d.getTime())) return false;
    return formatLocalDateKey(d) === dateKey;
  });
}

export function buildCsv(logs: LogEntry[]): string {
  const rows: string[] = [];
  rows.push(HEADER.map(escapeCsvField).join(","));
  for (const log of logs) {
    const fields = [
      log.task,
      formatLocalDateTime(log.startAt),
      formatLocalDateTime(log.endAt),
      formatLocalDateTime(log.plannedEndAt),
      log.memo ?? "",
    ];
    rows.push(fields.map(escapeCsvField).join(","));
  }
  return rows.join("\r\n");
}

export function downloadCsv(dateKey: string, logs: LogEntry[]): void {
  if (typeof window === "undefined") return;
  const csv = buildCsv(logs);
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
