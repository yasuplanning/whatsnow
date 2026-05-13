"use client";

import { useMemo, useState } from "react";
import Modal from "./Modal";
import type { LogEntry, TodoItem } from "@/lib/types";
import type { CategoryDefinition } from "@/lib/category";
import { getCategoryColor } from "@/lib/category";
import { getAllocationMinutes, getDurationMinutes } from "@/lib/allocation";
import { formatLocalDateKey, formatClock } from "@/lib/time";

type Mode = "task" | "todo";
const ALL = "__ALL__";

interface Props {
  categories: CategoryDefinition[];
  logs: LogEntry[];
  todos: TodoItem[];
  onClose: () => void;
}

interface TodoBucket {
  todo: TodoItem;
  minutes: number;
}

interface TaskGroup {
  category: string;
  items: LogEntry[];
  totalMinutes: number;
}

interface TodoGroup {
  category: string;
  items: TodoBucket[];
  totalMinutes: number;
}

type Result =
  | { kind: "task"; groups: TaskGroup[] }
  | { kind: "todo"; groups: TodoGroup[] };

function startOfDayJst(s: string): number {
  return new Date(`${s}T00:00:00+09:00`).getTime();
}

function endOfDayJst(s: string): number {
  return new Date(`${s}T23:59:59.999+09:00`).getTime();
}

function formatMinutes(m: number): string {
  if (m <= 0) return "0分";
  if (m < 60) return `${m}分`;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return min === 0 ? `${h}時間` : `${h}時間${min}分`;
}

function daysAgoKey(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return formatLocalDateKey(d);
}

export default function AggregateModal({
  categories,
  logs,
  todos,
  onClose,
}: Props) {
  const todayKey = formatLocalDateKey(new Date());
  const [mode, setMode] = useState<Mode>("task");
  const [categoryName, setCategoryName] = useState<string>(ALL);
  const [startDate, setStartDate] = useState<string>(daysAgoKey(30));
  const [endDate, setEndDate] = useState<string>(todayKey);
  const [shown, setShown] = useState<boolean>(false);

  const result = useMemo<Result | null>(() => {
    if (!shown) return null;
    const start = startOfDayJst(startDate);
    const end = endOfDayJst(endDate);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start)
      return null;
    const inPeriodTasks = logs.filter((l) => {
      const t = new Date(l.startAt).getTime();
      return Number.isFinite(t) && t >= start && t <= end;
    });
    if (mode === "task") {
      const filtered =
        categoryName === ALL
          ? inPeriodTasks
          : inPeriodTasks.filter((l) => l.category === categoryName);
      const byCategory = new Map<string, LogEntry[]>();
      for (const l of filtered) {
        const arr = byCategory.get(l.category) ?? [];
        arr.push(l);
        byCategory.set(l.category, arr);
      }
      const groups: TaskGroup[] = Array.from(byCategory.entries())
        .map(([cat, items]) => ({
          category: cat,
          items: items
            .slice()
            .sort(
              (a, b) =>
                new Date(b.startAt).getTime() - new Date(a.startAt).getTime()
            ),
          totalMinutes: items.reduce((s, l) => s + getDurationMinutes(l), 0),
        }))
        .sort((a, b) => b.totalMinutes - a.totalMinutes);
      return { kind: "task", groups };
    }
    const todoMinutes = new Map<string, number>();
    for (const l of inPeriodTasks) {
      for (const id of l.todoIds ?? []) {
        const mins = getAllocationMinutes(l, id);
        if (mins <= 0) continue;
        todoMinutes.set(id, (todoMinutes.get(id) ?? 0) + mins);
      }
    }
    const items: TodoBucket[] = [];
    for (const [id, minutes] of todoMinutes.entries()) {
      const t = todos.find((x) => x.id === id);
      if (t) items.push({ todo: t, minutes });
    }
    const filtered =
      categoryName === ALL
        ? items
        : items.filter((x) => x.todo.category === categoryName);
    const byCategory = new Map<string, TodoBucket[]>();
    for (const x of filtered) {
      const arr = byCategory.get(x.todo.category) ?? [];
      arr.push(x);
      byCategory.set(x.todo.category, arr);
    }
    const groups: TodoGroup[] = Array.from(byCategory.entries())
      .map(([cat, list]) => ({
        category: cat,
        items: list.slice().sort((a, b) => b.minutes - a.minutes),
        totalMinutes: list.reduce((s, x) => s + x.minutes, 0),
      }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);
    return { kind: "todo", groups };
  }, [shown, mode, categoryName, startDate, endDate, logs, todos]);

  const subgroupTasks = (
    cat: string,
    items: LogEntry[]
  ): { sub: string | null; items: LogEntry[]; total: number }[] | null => {
    const def = categories.find((c) => c.name === cat);
    if (!def || def.subcategories.length === 0) return null;
    const map = new Map<string | null, LogEntry[]>();
    for (const l of items) {
      const key =
        l.subcategory && def.subcategories.includes(l.subcategory)
          ? l.subcategory
          : null;
      const arr = map.get(key) ?? [];
      arr.push(l);
      map.set(key, arr);
    }
    return Array.from(map.entries())
      .map(([sub, list]) => ({
        sub,
        items: list,
        total: list.reduce((s, l) => s + getDurationMinutes(l), 0),
      }))
      .sort((a, b) => {
        if (a.sub === null) return 1;
        if (b.sub === null) return -1;
        return b.total - a.total;
      });
  };

  const subgroupTodos = (
    cat: string,
    items: TodoBucket[]
  ): { sub: string | null; items: TodoBucket[]; total: number }[] | null => {
    const def = categories.find((c) => c.name === cat);
    if (!def || def.subcategories.length === 0) return null;
    const map = new Map<string | null, TodoBucket[]>();
    for (const x of items) {
      const key =
        x.todo.subcategory && def.subcategories.includes(x.todo.subcategory)
          ? x.todo.subcategory
          : null;
      const arr = map.get(key) ?? [];
      arr.push(x);
      map.set(key, arr);
    }
    return Array.from(map.entries())
      .map(([sub, list]) => ({
        sub,
        items: list,
        total: list.reduce((s, x) => s + x.minutes, 0),
      }))
      .sort((a, b) => {
        if (a.sub === null) return 1;
        if (b.sub === null) return -1;
        return b.total - a.total;
      });
  };

  return (
    <Modal title="集計" onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm text-slate-300">集計対象</label>
          <select
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as Mode);
              setShown(false);
            }}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-base text-white"
          >
            <option value="task">タスク</option>
            <option value="todo">ToDo</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-slate-300">カテゴリ</label>
          <select
            value={categoryName}
            onChange={(e) => {
              setCategoryName(e.target.value);
              setShown(false);
            }}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-base text-white"
          >
            <option value={ALL}>すべて</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="block text-sm text-slate-300">開始日</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setShown(false);
              }}
              className="w-full rounded-xl bg-slate-900 px-3 py-2 text-base text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm text-slate-300">終了日</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setShown(false);
              }}
              className="w-full rounded-xl bg-slate-900 px-3 py-2 text-base text-white"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShown(true)}
          className="w-full rounded-xl bg-sky-500 py-3 text-base font-bold text-white hover:bg-sky-400"
        >
          表示
        </button>

        {result && (
          <div className="space-y-3 pt-2">
            {result.groups.length === 0 && (
              <p className="py-4 text-center text-sm text-slate-400">
                対象のデータがありません。
              </p>
            )}
            {result.kind === "task" &&
              result.groups.map((g) => {
                const subs = subgroupTasks(g.category, g.items);
                return (
                  <div
                    key={g.category}
                    className="space-y-2 rounded-xl bg-slate-900/60 p-3"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-sm font-semibold ${getCategoryColor(g.category, categories)}`}
                      >
                        {g.category}
                      </span>
                      <span className="text-sm font-bold tabular-nums text-slate-100">
                        {formatMinutes(g.totalMinutes)}
                      </span>
                    </div>
                    {subs ? (
                      <div className="space-y-2">
                        {subs.map((sg, idx) => (
                          <div
                            key={sg.sub ?? `__no_sub_${idx}`}
                            className="space-y-2 rounded-lg bg-slate-900 p-2"
                          >
                            <div className="flex items-baseline justify-between text-xs">
                              <span className="text-slate-300">
                                {sg.sub ?? "(サブカテゴリなし)"}
                              </span>
                              <span className="tabular-nums text-slate-200">
                                {formatMinutes(sg.total)}
                              </span>
                            </div>
                            <div className="space-y-1">
                              {sg.items.map((l) => (
                                <TaskCard key={l.id} log={l} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {g.items.map((l) => (
                          <TaskCard key={l.id} log={l} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            {result.kind === "todo" &&
              result.groups.map((g) => {
                const subs = subgroupTodos(g.category, g.items);
                return (
                  <div
                    key={g.category}
                    className="space-y-2 rounded-xl bg-slate-900/60 p-3"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-sm font-semibold ${getCategoryColor(g.category, categories)}`}
                      >
                        {g.category}
                      </span>
                      <span className="text-sm font-bold tabular-nums text-slate-100">
                        {formatMinutes(g.totalMinutes)}
                      </span>
                    </div>
                    {subs ? (
                      <div className="space-y-2">
                        {subs.map((sg, idx) => (
                          <div
                            key={sg.sub ?? `__no_sub_${idx}`}
                            className="space-y-2 rounded-lg bg-slate-900 p-2"
                          >
                            <div className="flex items-baseline justify-between text-xs">
                              <span className="text-slate-300">
                                {sg.sub ?? "(サブカテゴリなし)"}
                              </span>
                              <span className="tabular-nums text-slate-200">
                                {formatMinutes(sg.total)}
                              </span>
                            </div>
                            <div className="space-y-1">
                              {sg.items.map((x) => (
                                <TodoCard
                                  key={x.todo.id}
                                  todo={x.todo}
                                  minutes={x.minutes}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {g.items.map((x) => (
                          <TodoCard
                            key={x.todo.id}
                            todo={x.todo}
                            minutes={x.minutes}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </Modal>
  );
}

function TaskCard({ log }: { log: LogEntry }) {
  return (
    <div className="rounded-md bg-slate-800 px-2 py-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="break-words text-sm text-slate-100">{log.task}</span>
        <span className="shrink-0 text-xs tabular-nums text-slate-300">
          {formatMinutes(getDurationMinutes(log))}
        </span>
      </div>
      <p className="text-[10px] text-slate-500">
        {formatClock(log.startAt)}
      </p>
    </div>
  );
}

function TodoCard({ todo, minutes }: { todo: TodoItem; minutes: number }) {
  return (
    <div className="rounded-md bg-slate-800 px-2 py-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="break-words text-sm text-slate-100">{todo.title}</span>
        <span className="shrink-0 text-xs tabular-nums text-slate-300">
          {formatMinutes(minutes)}
        </span>
      </div>
      <p className="text-[10px] text-slate-500">
        {todo.status === "done" ? "完了" : `進捗 ${todo.progress}%`}
        {todo.deadline ? ` / 期限 ${formatClock(todo.deadline)}` : ""}
      </p>
    </div>
  );
}
