"use client";

import { useState } from "react";
import Modal from "./Modal";
import CategorySelect from "./CategorySelect";
import type { LogEntry } from "@/lib/types";
import { fromDatetimeLocal, toDatetimeLocal } from "@/lib/time";
import type { Category, CategoryDefinition } from "@/lib/category";

interface Props {
  categories: CategoryDefinition[];
  log: LogEntry;
  onClose: () => void;
  onConfirm: (input: {
    startAt: Date;
    plannedEndAt: Date | null;
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

  const [start, setStart] = useState<string>(toDatetimeLocal(initialStartDate));
  const [plannedMode, setPlannedMode] = useState<"unknown" | "pick">(
    log.plannedEndAt ? "pick" : "unknown"
  );
  const [plannedEnd, setPlannedEnd] = useState<string>(
    log.plannedEndAt
      ? toDatetimeLocal(new Date(log.plannedEndAt))
      : toDatetimeLocal(fallbackPlanned)
  );
  const [category, setCategory] = useState<Category>(log.category);
  const [subcategory, setSubcategory] = useState<string | null>(
    log.subcategory ?? null
  );
  const [error, setError] = useState<string>("");

  const handleSubmit = () => {
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
      startAt: startDate,
      plannedEndAt: plannedEndDate,
      category,
      subcategory,
    });
  };

  return (
    <Modal title="編集" onClose={onClose}>
      <div className="space-y-4">
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

