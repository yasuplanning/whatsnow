"use client";

import { useMemo } from "react";
import type {
  CheckinEntry,
  CountdownTimer,
  EventEntry,
  LogEntry,
  TodoItem,
} from "@/lib/types";
import type { Category } from "@/lib/category";
import { CATEGORY_COLOR } from "@/lib/category";

export type TimelineKind =
  | "task"
  | "event"
  | "checkin"
  | "countdown"
  | "todoDone";

export interface TimelineItem {
  id: string;
  kind: TimelineKind;
  title: string;
  category: Category | null;
  startIso: string | null;
  endIso: string | null;
  startMs: number;
  endMs: number;
  isPoint: boolean;
  durationMinutes: number | null;
  memo: string;
  status: string;
  photoId: string | null;
  photoPath: string | null;
  photoSummary: string | null;
}

interface Props {
  dateKey: string;
  tasks: LogEntry[];
  events: EventEntry[];
  checkins: CheckinEntry[];
  countdowns: CountdownTimer[];
  todos: TodoItem[];
  onSelect: (item: TimelineItem) => void;
}

const PX_PER_MINUTE = 1;
const HOUR_PX = 60;
const TOTAL_PX = HOUR_PX * 24;
const POINT_PIXEL_HEIGHT = 26;
const POINT_OVERLAP_MIN = 30;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function getDayBounds(dateKey: string): { start: number; end: number } {
  const start = new Date(`${dateKey}T00:00:00+09:00`).getTime();
  return { start, end: start + 24 * 60 * 60 * 1000 };
}

function parseMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
}

function clipRange(
  s: number,
  e: number,
  dayStart: number,
  dayEnd: number
): { s: number; e: number } | null {
  const cs = Math.max(s, dayStart);
  const ce = Math.min(e, dayEnd);
  if (ce <= cs) return null;
  return { s: cs, e: ce };
}

const KIND_COLORS: Record<TimelineKind, string> = {
  task: "bg-blue-100 text-blue-900 border-blue-300",
  event: "bg-emerald-100 text-emerald-900 border-emerald-300",
  checkin: "bg-slate-200 text-slate-700 border-slate-300",
  countdown: "bg-purple-100 text-purple-900 border-purple-300",
  todoDone: "bg-orange-100 text-orange-900 border-orange-300",
};

const KIND_LABEL: Record<TimelineKind, string> = {
  task: "task",
  event: "event",
  checkin: "checkin",
  countdown: "countdown",
  todoDone: "todo完了",
};

export function formatTimeHM(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function buildItems(
  dateKey: string,
  tasks: LogEntry[],
  events: EventEntry[],
  checkins: CheckinEntry[],
  countdowns: CountdownTimer[],
  todos: TodoItem[]
): TimelineItem[] {
  const { start: dayStart, end: dayEnd } = getDayBounds(dateKey);
  const items: TimelineItem[] = [];

  for (const t of tasks) {
    const s = parseMs(t.startAt);
    if (s === null) continue;
    const e = parseMs(t.endAt);
    if (e !== null) {
      const r = clipRange(s, e, dayStart, dayEnd);
      if (!r) continue;
      items.push({
        id: t.id,
        kind: "task",
        title: t.task,
        category: t.category,
        startIso: t.startAt,
        endIso: t.endAt,
        startMs: r.s - dayStart,
        endMs: r.e - dayStart,
        isPoint: false,
        durationMinutes: t.durationMinutes,
        memo: t.memo,
        status: t.status,
        photoId: null,
        photoPath: null,
        photoSummary: null,
      });
    } else if (s >= dayStart && s < dayEnd) {
      items.push({
        id: t.id,
        kind: "task",
        title: t.task,
        category: t.category,
        startIso: t.startAt,
        endIso: null,
        startMs: s - dayStart,
        endMs: s - dayStart,
        isPoint: true,
        durationMinutes: null,
        memo: t.memo,
        status: t.status,
        photoId: null,
        photoPath: null,
        photoSummary: null,
      });
    }
  }

  for (const e of events) {
    const s = parseMs(e.timestamp);
    if (s === null || s < dayStart || s >= dayEnd) continue;
    items.push({
      id: e.id,
      kind: "event",
      title: e.content,
      category: e.category,
      startIso: e.timestamp,
      endIso: null,
      startMs: s - dayStart,
      endMs: s - dayStart,
      isPoint: true,
      durationMinutes: null,
      memo: e.memo,
      status: "",
      photoId: e.photoId,
      photoPath: e.photoPath,
      photoSummary: e.photoSummary,
    });
  }

  for (const c of checkins) {
    const s = parseMs(c.checkedAt);
    if (s === null || s < dayStart || s >= dayEnd) continue;
    items.push({
      id: c.id,
      kind: "checkin",
      title: c.text,
      category: c.category,
      startIso: c.checkedAt,
      endIso: null,
      startMs: s - dayStart,
      endMs: s - dayStart,
      isPoint: true,
      durationMinutes: null,
      memo: "",
      status: "",
      photoId: null,
      photoPath: null,
      photoSummary: null,
    });
  }

  for (const c of countdowns) {
    const s = parseMs(c.startedAt);
    const e = parseMs(c.completedAt);
    if (s !== null && e !== null) {
      const r = clipRange(s, e, dayStart, dayEnd);
      if (!r) continue;
      const dur = Math.round((r.e - r.s) / 60000);
      items.push({
        id: c.id,
        kind: "countdown",
        title: c.title,
        category: c.category,
        startIso: c.startedAt,
        endIso: c.completedAt,
        startMs: r.s - dayStart,
        endMs: r.e - dayStart,
        isPoint: false,
        durationMinutes: dur,
        memo: c.memo,
        status: c.status,
        photoId: null,
        photoPath: null,
        photoSummary: null,
      });
    } else if (s !== null && s >= dayStart && s < dayEnd) {
      items.push({
        id: c.id,
        kind: "countdown",
        title: c.title,
        category: c.category,
        startIso: c.startedAt,
        endIso: null,
        startMs: s - dayStart,
        endMs: s - dayStart,
        isPoint: true,
        durationMinutes: null,
        memo: c.memo,
        status: c.status,
        photoId: null,
        photoPath: null,
        photoSummary: null,
      });
    }
  }

  for (const t of todos) {
    if (t.status !== "done") continue;
    const s = parseMs(t.doneAt) ?? parseMs(t.updatedAt);
    if (s === null || s < dayStart || s >= dayEnd) continue;
    items.push({
      id: t.id,
      kind: "todoDone",
      title: t.title,
      category: null,
      startIso: t.doneAt,
      endIso: null,
      startMs: s - dayStart,
      endMs: s - dayStart,
      isPoint: true,
      durationMinutes: null,
      memo: t.memo,
      status: t.status,
      photoId: null,
      photoPath: null,
      photoSummary: null,
    });
  }

  return items;
}

interface LaidOutItem {
  item: TimelineItem;
  col: number;
  cols: number;
}

function layoutTimeline(items: TimelineItem[]): LaidOutItem[] {
  const sorted = items.slice().sort((a, b) => a.startMs - b.startMs);
  const result: LaidOutItem[] = [];

  let cluster: { item: TimelineItem; col: number; endMs: number }[] = [];
  let clusterMaxEnd = -Infinity;

  const finalize = () => {
    if (cluster.length === 0) return;
    const cols = Math.max(...cluster.map((c) => c.col + 1));
    for (const c of cluster) {
      result.push({ item: c.item, col: c.col, cols });
    }
    cluster = [];
    clusterMaxEnd = -Infinity;
  };

  for (const item of sorted) {
    const itemEnd = item.isPoint
      ? item.startMs + POINT_OVERLAP_MIN * 60 * 1000
      : item.endMs;

    if (cluster.length > 0 && item.startMs >= clusterMaxEnd) {
      finalize();
    }

    const used = new Set(
      cluster.filter((c) => c.endMs > item.startMs).map((c) => c.col)
    );
    let col = 0;
    while (used.has(col)) col++;
    cluster.push({ item, col, endMs: itemEnd });
    clusterMaxEnd = Math.max(clusterMaxEnd, itemEnd);
  }
  finalize();
  return result;
}

interface Summary {
  total: number;
  byKind: Record<TimelineKind, number>;
  byCategoryMinutes: Map<Category, number>;
}

function computeSummary(items: TimelineItem[]): Summary {
  const byKind: Record<TimelineKind, number> = {
    task: 0,
    event: 0,
    checkin: 0,
    countdown: 0,
    todoDone: 0,
  };
  const byCategoryMinutes = new Map<Category, number>();
  for (const it of items) {
    byKind[it.kind] += 1;
    if (it.category && it.durationMinutes != null && it.durationMinutes > 0) {
      const prev = byCategoryMinutes.get(it.category) ?? 0;
      byCategoryMinutes.set(it.category, prev + it.durationMinutes);
    }
  }
  return { total: items.length, byKind, byCategoryMinutes };
}

export default function EventTimelineDay({
  dateKey,
  tasks,
  events,
  checkins,
  countdowns,
  todos,
  onSelect,
}: Props) {
  const items = useMemo(
    () => buildItems(dateKey, tasks, events, checkins, countdowns, todos),
    [dateKey, tasks, events, checkins, countdowns, todos]
  );
  const laidOut = useMemo(() => layoutTimeline(items), [items]);
  const summary = useMemo(() => computeSummary(items), [items]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500">
        この日の記録はありません
      </div>
    );
  }

  const totalDuration = Array.from(summary.byCategoryMinutes.values()).reduce(
    (a, b) => a + b,
    0
  );

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-white p-3 text-xs text-slate-700 ring-1 ring-slate-200">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span>task: {summary.byKind.task}件</span>
          <span>event: {summary.byKind.event}件</span>
          <span>checkin: {summary.byKind.checkin}件</span>
          <span>countdown: {summary.byKind.countdown}件</span>
          <span>todo完了: {summary.byKind.todoDone}件</span>
          {totalDuration > 0 && <span>合計時間: {totalDuration}分</span>}
        </div>
        {summary.byCategoryMinutes.size > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {Array.from(summary.byCategoryMinutes.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([cat, min]) => (
                <span
                  key={cat}
                  className={`rounded px-2 py-0.5 text-[10px] ${CATEGORY_COLOR[cat]}`}
                >
                  {cat}: {min}分
                </span>
              ))}
          </div>
        )}
      </div>

      <div
        className="relative rounded-2xl bg-white text-slate-900 ring-1 ring-slate-200"
        style={{ height: `${TOTAL_PX}px` }}
      >
        <div className="absolute inset-0">
          {Array.from({ length: 24 }, (_, h) => (
            <div
              key={h}
              className="absolute inset-x-0 border-t border-slate-200"
              style={{ top: `${h * HOUR_PX}px` }}
            >
              <span className="absolute -top-2 left-1 bg-white px-1 text-[10px] text-slate-500">
                {pad2(h)}:00
              </span>
            </div>
          ))}
        </div>
        <div className="absolute inset-y-0 left-12 right-2">
          {laidOut.map(({ item, col, cols }) => {
            const top = item.startMs / 60000;
            const rawHeight = (item.endMs - item.startMs) / 60000;
            const height = item.isPoint
              ? POINT_PIXEL_HEIGHT
              : Math.max(rawHeight * PX_PER_MINUTE, POINT_PIXEL_HEIGHT);
            const leftPct = (col / cols) * 100;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => onSelect(item)}
                className={`absolute overflow-hidden rounded-md border px-1.5 py-1 text-left text-[11px] leading-tight hover:brightness-95 ${KIND_COLORS[item.kind]}`}
                style={{
                  top: `${top}px`,
                  height: `${height}px`,
                  left: `${leftPct}%`,
                  width: `calc(${100 / cols}% - 2px)`,
                }}
              >
                <div className="line-clamp-1 font-semibold">{item.title}</div>
                <div className="line-clamp-1 text-[9px] opacity-80">
                  {item.isPoint
                    ? formatTimeHM(item.startIso)
                    : `${formatTimeHM(item.startIso)}–${formatTimeHM(item.endIso)}${item.durationMinutes != null ? ` / ${item.durationMinutes}分` : ""}`}
                </div>
                <div className="line-clamp-1 text-[9px] opacity-70">
                  {KIND_LABEL[item.kind]}
                  {item.category ? ` · ${item.category}` : ""}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
