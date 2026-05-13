"use client";

import { useMemo, useState } from "react";
import Modal from "./Modal";
import CategorySelect from "./CategorySelect";
import CompletedTodoPickerModal from "./CompletedTodoPickerModal";
import type { LogEntry, TodoAllocation, TodoItem } from "@/lib/types";
import type { Category, CategoryDefinition } from "@/lib/category";
import {
  appendTimestampLine,
  diffMinutes,
  fromDatetimeLocal,
  toDatetimeLocal,
} from "@/lib/time";
import {
  getAllocationMinutes,
  getDurationMinutes,
  getNetMinutes,
  getUnallocatedMinutes,
  normalizeAllocations,
} from "@/lib/allocation";

interface Props {
  log: LogEntry;
  todos: TodoItem[];
  categories: CategoryDefinition[];
  onClose: () => void;
  onConfirm: (input: {
    startAt: Date;
    endAt: Date;
    deductionMinutes: number;
    memo: string;
    category: Category;
    subcategory: string | null;
    todoIds: string[];
    todoAllocations: TodoAllocation[];
  }) => void;
}

interface RatioRow {
  todoId: string;
  todo: TodoItem;
  ratio: string;
}

export default function EditPastTaskModal({
  log,
  todos,
  categories,
  onClose,
  onConfirm,
}: Props) {
  const initialStart = new Date(log.startAt);
  const initialEnd = log.endAt ? new Date(log.endAt) : new Date();

  const [startStr, setStartStr] = useState<string>(
    toDatetimeLocal(initialStart)
  );
  const [endStr, setEndStr] = useState<string>(toDatetimeLocal(initialEnd));
  const [deductionStr, setDeductionStr] = useState<string>(
    String(log.deductionMinutes ?? 0)
  );
  const [memo, setMemo] = useState<string>(log.memo);
  const [category, setCategory] = useState<Category>(log.category);
  const [subcategory, setSubcategory] = useState<string | null>(
    log.subcategory ?? null
  );
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);

  const linkedTodos = useMemo(() => {
    const result: TodoItem[] = [];
    for (const id of log.todoIds ?? []) {
      const t = todos.find((x) => x.id === id);
      if (t) result.push(t);
    }
    return result;
  }, [log.todoIds, todos]);

  const initialNormalized = useMemo(
    () =>
      normalizeAllocations(
        linkedTodos.map((t) => t.id),
        log.todoAllocations ?? []
      ),
    [linkedTodos, log.todoAllocations]
  );

  const [rows, setRows] = useState<RatioRow[]>(() =>
    linkedTodos.map((t) => {
      const found = initialNormalized.find((a) => a.todoId === t.id);
      return {
        todoId: t.id,
        todo: t,
        ratio: String(found?.ratio ?? 1),
      };
    })
  );

  const [error, setError] = useState<string>("");

  const preview = useMemo(() => {
    const startDate = fromDatetimeLocal(startStr);
    const endDate = fromDatetimeLocal(endStr);
    const deduction = Math.max(0, Math.floor(Number(deductionStr) || 0));
    if (!startDate || !endDate || endDate.getTime() <= startDate.getTime()) {
      return {
        valid: false,
        duration: 0,
        deduction,
        net: 0,
        allocations: [] as { todoId: string; minutes: number }[],
        unallocated: 0,
      };
    }
    const duration = Math.max(
      0,
      diffMinutes(startDate.toISOString(), endDate.toISOString()) ?? 0
    );
    const net = Math.max(0, duration - deduction);
    const parsedAllocations: TodoAllocation[] = rows.map((r) => ({
      todoId: r.todoId,
      ratio: Math.max(0, Math.floor(Number(r.ratio) || 0)),
    }));
    const fakeLog: LogEntry = {
      ...log,
      startAt: startDate.toISOString(),
      endAt: endDate.toISOString(),
      durationMinutes: duration,
      deductionMinutes: deduction,
      todoIds: rows.map((r) => r.todoId),
      todoAllocations: parsedAllocations,
    };
    const allocations = rows.map((r) => ({
      todoId: r.todoId,
      minutes: getAllocationMinutes(fakeLog, r.todoId),
    }));
    const unallocated = getUnallocatedMinutes(fakeLog);
    return {
      valid: true,
      duration: getDurationMinutes(fakeLog),
      deduction,
      net: getNetMinutes(fakeLog),
      allocations,
      unallocated,
    };
  }, [startStr, endStr, deductionStr, rows, log]);

  const handleRatioChange = (todoId: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.todoId === todoId ? { ...r, ratio: value } : r))
    );
  };

  const handleRemoveLinkedTodo = (todoId: string) => {
    setRows((prev) => prev.filter((r) => r.todoId !== todoId));
  };

  const handlePickTodo = (todo: TodoItem) => {
    setRows((prev) => {
      if (prev.some((r) => r.todoId === todo.id)) return prev;
      return [...prev, { todoId: todo.id, todo, ratio: "1" }];
    });
    setPickerOpen(false);
  };

  const handleSubmit = () => {
    setError("");
    const startDate = fromDatetimeLocal(startStr);
    if (!startDate) {
      setError("開始時間を入力してください。");
      return;
    }
    const endDate = fromDatetimeLocal(endStr);
    if (!endDate) {
      setError("終了時間を入力してください。");
      return;
    }
    if (endDate.getTime() <= startDate.getTime()) {
      setError("終了時間は開始時間より後にしてください。");
      return;
    }
    const deductionNum = Number(deductionStr);
    if (!Number.isFinite(deductionNum) || deductionNum < 0) {
      setError("控除時間は0以上の整数で入力してください。");
      return;
    }
    if (!Number.isInteger(deductionNum)) {
      setError("控除時間は整数で入力してください。");
      return;
    }
    const allocations: TodoAllocation[] = [];
    for (const r of rows) {
      const num = Number(r.ratio);
      if (!Number.isFinite(num) || num < 0 || !Number.isInteger(num)) {
        setError("配分比率は0以上の整数で入力してください。");
        return;
      }
      allocations.push({ todoId: r.todoId, ratio: num });
    }
    if (rows.length > 0) {
      const total = allocations.reduce((s, a) => s + a.ratio, 0);
      if (total === 0) {
        setError(
          "紐づくToDoがあるとき、すべての配分比率を0にすることはできません。"
        );
        return;
      }
    }
    onConfirm({
      startAt: startDate,
      endAt: endDate,
      deductionMinutes: deductionNum,
      memo,
      category,
      subcategory,
      todoIds: rows.map((r) => r.todoId),
      todoAllocations: allocations,
    });
  };

  const deductionOverflow = preview.deduction > preview.duration;

  return (
    <Modal title="過去タスクを編集" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-900 p-3">
          <p className="whitespace-pre-wrap break-words text-base font-semibold">
            {log.task}
          </p>
        </div>

        <CategorySelect
          categories={categories}
          value={category}
          onChange={(c) => {
            setCategory(c);
            setSubcategory(null);
          }}
          subcategoryValue={subcategory}
          onSubcategoryChange={setSubcategory}
        />

        <div className="space-y-2">
          <label className="block text-sm text-slate-300">開始時間</label>
          <input
            type="datetime-local"
            value={startStr}
            onChange={(e) => setStartStr(e.target.value)}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-lg text-white"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-slate-300">終了時間</label>
          <input
            type="datetime-local"
            value={endStr}
            onChange={(e) => setEndStr(e.target.value)}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-lg text-white"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-slate-300">
            控除時間（分）
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={deductionStr}
            onChange={(e) => setDeductionStr(e.target.value)}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-lg text-white"
          />
          <p className="text-xs text-slate-400">
            休憩・移動などの合計分数を入力。内訳はメモ欄に記入してください。
          </p>
          {deductionOverflow && (
            <p className="text-xs text-amber-300">
              控除時間が所要時間を超えています。正味時間は0分として扱われます。
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm text-slate-300">メモ</label>
            <button
              type="button"
              onClick={() => setMemo((prev) => appendTimestampLine(prev))}
              aria-label="タイムスタンプを挿入"
              title="タイムスタンプを挿入"
              className="rounded-md bg-slate-800 p-1.5 text-slate-200 hover:bg-slate-700"
            >
              <ClockIcon className="h-4 w-4" />
            </button>
          </div>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={4}
            className="w-full resize-none rounded-xl bg-slate-900 px-4 py-3 text-base text-white placeholder:text-slate-500"
          />
        </div>

        <div className="space-y-2 rounded-xl bg-slate-900/60 p-3">
          <p className="text-sm font-semibold text-slate-200">
            紐づくToDo / 時間配分
          </p>
          {rows.length > 0 && (
            <p className="text-xs text-slate-400">
              配分率は割合ではなく相対比です。例：1:1
              は半分ずつ、2:1 は約2/3と1/3です。計算時に正規化され、分未満は切り捨てられます。
            </p>
          )}
          {rows.map((r) => {
            const alloc = preview.allocations.find(
              (a) => a.todoId === r.todoId
            );
            return (
              <div
                key={r.todoId}
                className="rounded-lg bg-slate-900 p-2 space-y-1"
              >
                <div className="flex items-center gap-2">
                  <span className="flex-1 break-words text-sm text-slate-100">
                    {r.todo.title}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={r.ratio}
                    onChange={(e) =>
                      handleRatioChange(r.todoId, e.target.value)
                    }
                    className="w-20 rounded-md bg-slate-800 px-2 py-1 text-base text-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveLinkedTodo(r.todoId)}
                    className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-rose-600 hover:text-white"
                  >
                    解除
                  </button>
                </div>
                <p className="text-xs text-sky-300">
                  割当: {alloc?.minutes ?? 0}分
                </p>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="w-full rounded-md bg-slate-800 py-2 text-xs text-slate-200 hover:bg-slate-700"
          >
            ＋ 完了済みToDoを紐づける
          </button>
        </div>

        <div className="space-y-1 rounded-xl bg-slate-900/60 p-3 text-xs text-slate-300">
          <div className="flex justify-between">
            <span>所要時間</span>
            <span className="tabular-nums">{preview.duration}分</span>
          </div>
          <div className="flex justify-between">
            <span>控除時間</span>
            <span className="tabular-nums">{preview.deduction}分</span>
          </div>
          <div className="flex justify-between font-semibold text-slate-100">
            <span>正味時間</span>
            <span className="tabular-nums">{preview.net}分</span>
          </div>
          {preview.unallocated > 0 && (
            <p className="pt-1 text-[10px] text-slate-500">
              ※ 端数切り捨てにより{preview.unallocated}分が未配分です。
            </p>
          )}
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          className="w-full rounded-xl bg-sky-500 py-4 text-lg font-bold text-white hover:bg-sky-400"
        >
          保存
        </button>
      </div>
      {pickerOpen && (
        <CompletedTodoPickerModal
          todos={todos}
          excludeIds={rows.map((r) => r.todoId)}
          onClose={() => setPickerOpen(false)}
          onPick={handlePickTodo}
        />
      )}
    </Modal>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
