"use client";

import { useState } from "react";
import type {
  CheckinEntry,
  CountdownTimer,
  EventEntry,
  LogEntry,
  TodoItem,
} from "@/lib/types";
import { formatLocalDateKey } from "@/lib/csv";
import EventTimelineDay, {
  formatTimeHM,
  type TimelineItem,
} from "./EventTimelineDay";
import { CATEGORY_COLOR } from "@/lib/category";
import { getPhotoDataUrl } from "@/lib/storage";

interface Props {
  tasks: LogEntry[];
  events: EventEntry[];
  checkins: CheckinEntry[];
  countdowns: CountdownTimer[];
  todos: TodoItem[];
  onClose: () => void;
}

function shiftDate(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00+09:00`);
  d.setDate(d.getDate() + days);
  return formatLocalDateKey(d);
}

function formatDateLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00+09:00`);
  if (Number.isNaN(d.getTime())) return dateKey;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function EventTimelineModal({
  tasks,
  events,
  checkins,
  countdowns,
  todos,
  onClose,
}: Props) {
  const today = formatLocalDateKey(new Date());
  const [dateKey, setDateKey] = useState<string>(today);
  const [selected, setSelected] = useState<TimelineItem | null>(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/70 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-slate-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-2 bg-slate-800 px-4 py-3 text-slate-100">
          <h2 className="text-lg font-bold">できごと一覧</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm text-slate-300 hover:bg-slate-700"
            aria-label="閉じる"
          >
            ✕
          </button>
        </header>

        <div className="space-y-2 bg-white px-4 py-3 ring-1 ring-slate-200">
          <h3 className="text-base font-semibold text-slate-900">
            {formatDateLabel(dateKey)}のできごと
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setDateKey(shiftDate(dateKey, -1))}
              className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-300"
            >
              ← 前の日
            </button>
            <button
              type="button"
              onClick={() => setDateKey(today)}
              className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-300"
            >
              今日
            </button>
            <button
              type="button"
              onClick={() => setDateKey(shiftDate(dateKey, 1))}
              className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-300"
            >
              次の日 →
            </button>
            <input
              type="date"
              value={dateKey}
              onChange={(e) => setDateKey(e.target.value)}
              className="ml-auto rounded-lg bg-slate-100 px-2 py-1 text-sm text-slate-900 ring-1 ring-slate-300"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-100 px-3 py-3">
          <EventTimelineDay
            dateKey={dateKey}
            tasks={tasks}
            events={events}
            checkins={checkins}
            countdowns={countdowns}
            todos={todos}
            onSelect={setSelected}
          />
        </div>
      </div>

      {selected && (
        <TimelineDetail item={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function TimelineDetail({
  item,
  onClose,
}: {
  item: TimelineItem;
  onClose: () => void;
}) {
  const photoDataUrl = getPhotoDataUrl(item.photoId);
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md space-y-3 rounded-2xl bg-white p-4 text-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="break-words text-lg font-bold">{item.title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-0.5 text-sm text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          <span className="rounded bg-slate-200 px-2 py-0.5 text-xs">
            {item.kind}
          </span>
          {item.category && (
            <span className={`rounded px-2 py-0.5 text-xs ${CATEGORY_COLOR[item.category]}`}>
              {item.category}
            </span>
          )}
          {item.status && (
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
              {item.status}
            </span>
          )}
        </div>
        <dl className="space-y-1 text-sm">
          {item.startIso && (
            <DetailRow
              label={item.isPoint ? "時刻" : "開始"}
              value={formatTimeHM(item.startIso)}
            />
          )}
          {item.endIso && (
            <DetailRow label="終了" value={formatTimeHM(item.endIso)} />
          )}
          {item.durationMinutes != null && (
            <DetailRow label="所要時間" value={`${item.durationMinutes}分`} />
          )}
        </dl>
        {item.memo && (
          <div className="rounded-lg bg-slate-100 p-2 text-sm whitespace-pre-wrap break-words">
            {item.memo}
          </div>
        )}
        {photoDataUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoDataUrl}
              alt={item.photoSummary ?? ""}
              className="max-h-64 w-full rounded-lg object-contain"
            />
            {item.photoSummary && (
              <p className="text-xs text-slate-500">{item.photoSummary}</p>
            )}
          </>
        )}
        {!photoDataUrl && item.photoPath && (
          <p className="text-xs text-slate-500">photoPath: {item.photoPath}</p>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
