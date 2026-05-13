"use client";

import { useState } from "react";
import Modal from "./Modal";
import CategorySelect from "./CategorySelect";
import type { LogEntry } from "@/lib/types";
import {
  appendTimestampLine,
  fromDatetimeLocal,
  toDatetimeLocal,
} from "@/lib/time";
import type { Category, CategoryDefinition } from "@/lib/category";

interface Props {
  categories: CategoryDefinition[];
  log: LogEntry;
  onClose: () => void;
  onConfirm: (input: {
    task: string;
    startAt: Date;
    plannedEndAt: Date | null;
    memo: string;
    category: Category;
    subcategory: string | null;
  }) => void;
  onAddSubcategory?: (categoryName: string) => void;
}

export default function EditActiveTaskModal({
  categories,
  log,
  onClose,
  onConfirm,
  onAddSubcategory,
}: Props) {
  const initialStartDate = new Date(log.startAt);
  const fallbackPlanned = new Date(initialStartDate.getTime() + 60 * 60 * 1000);

  const [task, setTask] = useState<string>(log.task);
  const [start, setStart] = useState<string>(toDatetimeLocal(initialStartDate));
  const [plannedMode, setPlannedMode] = useState<"unknown" | "pick">(
    log.plannedEndAt ? "pick" : "unknown"
  );
  const [plannedEnd, setPlannedEnd] = useState<string>(
    log.plannedEndAt
      ? toDatetimeLocal(new Date(log.plannedEndAt))
      : toDatetimeLocal(fallbackPlanned)
  );
  const [memo, setMemo] = useState<string>(log.memo);
  const [category, setCategory] = useState<Category>(log.category);
  const [subcategory, setSubcategory] = useState<string | null>(
    log.subcategory ?? null
  );
  const [error, setError] = useState<string>("");

  const handleSubmit = () => {
    const trimmedTask = task.trim();
    if (!trimmedTask) {
      setError("内容を入力してください。");
      return;
    }
    const startDate = fromDatetimeLocal(start);
    if (!startDate) {
      setError("開始時刻を入力してください。");
      return;
    }
    let plannedEndDate: Date | null = null;
    if (plannedMode === "pick") {
      plannedEndDate = fromDatetimeLocal(plannedEnd);
      if (!plannedEndDate) {
        setError("終了予定時刻を入力してください。");
        return;
      }
      if (plannedEndDate.getTime() <= startDate.getTime()) {
        setError("終了予定時刻は開始時刻より後にしてください。");
        return;
      }
    }
    onConfirm({
      task: trimmedTask,
      startAt: startDate,
      plannedEndAt: plannedEndDate,
      memo,
      category,
      subcategory,
    });
  };

  return (
    <Modal title="編集" onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm text-slate-300">やった内容</label>
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl bg-slate-900 px-4 py-3 text-base text-white placeholder:text-slate-500"
          />
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
          onAddSubcategory={onAddSubcategory}
        />

        <div className="space-y-2">
          <label className="block text-sm text-slate-300">開始時刻</label>
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-lg text-white"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-slate-300">終了予定時刻</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPlannedMode("unknown")}
              className={`rounded-xl py-3 text-base font-semibold transition ${
                plannedMode === "unknown"
                  ? "bg-sky-500 text-white"
                  : "bg-slate-700 text-slate-200"
              }`}
            >
              未定
            </button>
            <button
              type="button"
              onClick={() => setPlannedMode("pick")}
              className={`rounded-xl py-3 text-base font-semibold transition ${
                plannedMode === "pick"
                  ? "bg-sky-500 text-white"
                  : "bg-slate-700 text-slate-200"
              }`}
            >
              時刻を指定
            </button>
          </div>
          {plannedMode === "pick" && (
            <input
              type="datetime-local"
              value={plannedEnd}
              onChange={(e) => setPlannedEnd(e.target.value)}
              className="mt-2 w-full rounded-xl bg-slate-900 px-4 py-3 text-lg text-white"
            />
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm text-slate-300">メモ（任意）</label>
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
            rows={3}
            className="w-full resize-none rounded-xl bg-slate-900 px-4 py-3 text-base text-white placeholder:text-slate-500"
          />
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
