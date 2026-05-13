"use client";

import { useState } from "react";
import type {
  CheckinEntry,
  CountdownTimer,
  EventEntry,
  LogEntry,
  TodoItem,
} from "@/lib/types";
import { formatLocalDateKey } from "@/lib/time";
import EventTimelineDay, {
  formatTimeHM,
  type TimelineItem,
} from "./EventTimelineDay";
import { CATEGORY_COLOR } from "@/lib/category";
import { getPhotoDataUrl } from "@/lib/storage";
import {
  countContributingTasks,
  getAllocationMinutes,
  getTotalAllocatedMinutes,
} from "@/lib/allocation";

interface Props {
  tasks: LogEntry[];
  events: EventEntry[];
  checkins: CheckinEntry[];
  countdowns: CountdownTimer[];
  todos: TodoItem[];
  onClose: () => void;
  onEditTask?: (log: LogEntry) => void;
  onEditTodo?: (todo: TodoItem) => void;
  onAddPast?: () => void;
}

function shiftDate(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00+09:00`);
  d.setDate(d.getDate() + days);
  return formatLocalDateKey(d);
}

function todoToTimelineItem(t: TodoItem): TimelineItem {
  return {
    id: t.id,
    kind: "todoDone",
    title: t.title,
    category: t.category,
    startIso: t.doneAt,
    endIso: null,
    startMs: 0,
    endMs: 0,
    isPoint: true,
    durationMinutes: null,
    memo: t.memo,
    status: t.status,
    photoId: null,
    photoPath: null,
    photoSummary: null,
  };
}

function taskLogToTimelineItem(log: LogEntry): TimelineItem {
  return {
    id: log.id,
    kind: "task",
    title: log.task,
    category: log.category,
    startIso: log.startAt,
    endIso: log.endAt,
    startMs: 0,
    endMs: 0,
    isPoint: false,
    durationMinutes: log.durationMinutes,
    memo: log.memo,
    status: log.status,
    photoId: null,
    photoPath: null,
    photoSummary: null,
  };
}

export default function EventTimelineModal({
  tasks,
  events,
  checkins,
  countdowns,
  todos,
  onClose,
  onEditTask,
  onEditTodo,
  onAddPast,
}: Props) {
  const today = formatLocalDateKey(new Date());
  const [dateKey, setDateKey] = useState<string>(today);
  const [selected, setSelected] = useState<TimelineItem | null>(null);
  const [selectedTodo, setSelectedTodo] = useState<TimelineItem | null>(null);

  const linkedTodosForSelected: TimelineItem[] | null = (() => {
    if (!selected || selected.kind !== "task") return null;
    const task = tasks.find((t) => t.id === selected.id);
    if (!task) return null;
    const items: TimelineItem[] = [];
    for (const id of task.todoIds) {
      const t = todos.find((x) => x.id === id);
      if (t) items.push(todoToTimelineItem(t));
    }
    return items;
  })();

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
          <h2 className="text-lg font-bold">過去ログ</h2>
          <div className="flex items-center gap-2">
            {onAddPast && (
              <button
                type="button"
                onClick={onAddPast}
                className="rounded-lg bg-slate-700 px-3 py-1 text-sm font-semibold text-slate-100 hover:bg-slate-600"
              >
                ＋ 過去の記録を追加
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-3 py-1 text-sm text-slate-300 hover:bg-slate-700"
              aria-label="閉じる"
            >
              ✕
            </button>
          </div>
        </header>

        <div className="space-y-2 bg-white px-4 py-3 ring-1 ring-slate-200">
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
        <TimelineDetail
          item={selected}
          linkedTodos={linkedTodosForSelected ?? undefined}
          onSelectTodo={setSelectedTodo}
          onEdit={
            selected.kind === "task" && onEditTask
              ? () => {
                  const task = tasks.find((t) => t.id === selected.id);
                  if (!task) return;
                  onEditTask(task);
                  setSelected(null);
                  setSelectedTodo(null);
                }
              : undefined
          }
          onClose={() => {
            setSelected(null);
            setSelectedTodo(null);
          }}
        />
      )}
      {selectedTodo && (
        <TimelineDetail
          item={selectedTodo}
          onEdit={
            onEditTodo
              ? () => {
                  const target = todos.find((t) => t.id === selectedTodo.id);
                  if (!target) return;
                  onEditTodo(target);
                  setSelected(null);
                  setSelectedTodo(null);
                }
              : undefined
          }
          totalAllocated={
            selectedTodo.kind === "todoDone"
              ? {
                  minutes: getTotalAllocatedMinutes(tasks, selectedTodo.id),
                  taskCount: countContributingTasks(tasks, selectedTodo.id),
                  done: selectedTodo.status === "done",
                }
              : undefined
          }
          contributingTasks={
            selectedTodo.kind === "todoDone"
              ? tasks
                  .map((log) => ({
                    log,
                    minutes: getAllocationMinutes(log, selectedTodo.id),
                  }))
                  .filter((x) => x.minutes > 0)
                  .sort((a, b) => {
                    const aMs = new Date(a.log.startAt).getTime();
                    const bMs = new Date(b.log.startAt).getTime();
                    return bMs - aMs;
                  })
                  .map((x) => ({
                    id: x.log.id,
                    title: x.log.task,
                    minutes: x.minutes,
                  }))
              : undefined
          }
          onSelectTask={(taskId) => {
            const target = tasks.find((t) => t.id === taskId);
            if (!target) return;
            setSelectedTodo(null);
            setSelected(taskLogToTimelineItem(target));
          }}
          onClose={() => setSelectedTodo(null)}
          zIndexClass="z-[70]"
        />
      )}
    </div>
  );
}

function TimelineDetail({
  item,
  linkedTodos,
  onSelectTodo,
  onEdit,
  totalAllocated,
  contributingTasks,
  onSelectTask,
  onClose,
  zIndexClass = "z-[60]",
}: {
  item: TimelineItem;
  linkedTodos?: TimelineItem[];
  onSelectTodo?: (todo: TimelineItem) => void;
  onEdit?: () => void;
  totalAllocated?: { minutes: number; taskCount: number; done: boolean };
  contributingTasks?: { id: string; title: string; minutes: number }[];
  onSelectTask?: (taskId: string) => void;
  onClose: () => void;
  zIndexClass?: string;
}) {
  const photoDataUrl = getPhotoDataUrl(item.photoId);
  const [showContributors, setShowContributors] = useState(false);
  return (
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center bg-black/70 p-4`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md space-y-3 rounded-2xl bg-white p-4 text-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="break-words text-lg font-bold">{item.title}</h3>
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="rounded-md bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-300"
              >
                編集
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-2 py-0.5 text-sm text-slate-500 hover:bg-slate-100"
            >
              ✕
            </button>
          </div>
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
        {totalAllocated && (
          <div className="rounded-lg bg-sky-50 p-2 text-sm text-slate-800">
            <button
              type="button"
              onClick={() => setShowContributors((v) => !v)}
              disabled={
                !contributingTasks || contributingTasks.length === 0
              }
              className="flex w-full items-center justify-between gap-2 text-left disabled:cursor-default"
            >
              <span className="font-semibold">
                {totalAllocated.done
                  ? "完了までにかかった総時間"
                  : "現在までの累計作業時間"}
                ：{totalAllocated.minutes}分
              </span>
              {contributingTasks && contributingTasks.length > 0 && (
                <span className="shrink-0 text-xs text-slate-500">
                  {showContributors ? "▲" : "▼"}
                </span>
              )}
            </button>
            {totalAllocated.taskCount > 0 && (
              <p className="text-xs text-slate-500">
                タスク{totalAllocated.taskCount}件から集計
              </p>
            )}
            {showContributors &&
              contributingTasks &&
              contributingTasks.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {contributingTasks.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => onSelectTask?.(t.id)}
                        className="flex w-full items-center justify-between gap-2 rounded-md bg-white px-2 py-1 text-left hover:bg-slate-100"
                      >
                        <span className="break-words text-sm text-slate-800">
                          {t.title}
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-slate-500">
                          {t.minutes}分
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
          </div>
        )}
        {linkedTodos && linkedTodos.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-600">
              紐づくToDo（{linkedTodos.length}件）
            </p>
            <ul className="space-y-1">
              {linkedTodos.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onSelectTodo?.(t)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg bg-slate-100 px-2 py-1 text-left text-sm text-slate-800 hover:bg-slate-200"
                  >
                    <span className="break-words">{t.title}</span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {t.status === "done" ? "完了" : "未完了"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
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
