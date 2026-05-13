"use client";

import { useState } from "react";
import Modal from "./Modal";
import type { RecurringFrequency, RecurringTodo } from "@/lib/types";
import {
  inferCategoryFromTitleAndMemo,
  type Category,
  type CategoryDefinition,
} from "@/lib/category";
import CategorySelect from "./CategorySelect";

interface Props {
  categories: CategoryDefinition[];
  initial: RecurringTodo | null;
  onClose: () => void;
  onSubmit: (input: {
    title: string;
    memo: string;
    frequency: RecurringFrequency;
    dayOfMonth: number;
    monthOfYear: number | null;
    deadlineDays: number;
    enabled: boolean;
    category: Category;
    subcategory: string | null;
  }) => void;
  onDelete?: () => void;
  onAddSubcategory?: (categoryName: string) => void;
}

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
const DEADLINE_OPTIONS = Array.from({ length: 31 }, (_, i) => i);

export default function RecurringTodoFormModal({
  categories,
  initial,
  onClose,
  onSubmit,
  onDelete,
  onAddSubcategory,
}: Props) {
  const isEdit = initial !== null;
  const [title, setTitle] = useState<string>(initial?.title ?? "");
  const [memo, setMemo] = useState<string>(initial?.memo ?? "");
  const [category, setCategory] = useState<Category>(
    initial?.category ?? categories[0]?.name ?? "その他"
  );
  const [subcategory, setSubcategory] = useState<string | null>(
    initial?.subcategory ?? null
  );
  const [categoryDirty, setCategoryDirty] = useState<boolean>(isEdit);
  const [frequency, setFrequency] = useState<RecurringFrequency>(
    initial?.frequency ?? "monthly"
  );
  const [dayOfMonth, setDayOfMonth] = useState<number>(initial?.dayOfMonth ?? 1);
  const [monthOfYear, setMonthOfYear] = useState<number>(
    initial?.monthOfYear ?? 1
  );
  const [deadlineDays, setDeadlineDays] = useState<number>(
    initial?.deadlineDays ?? 3
  );
  const [enabled, setEnabled] = useState<boolean>(initial?.enabled ?? true);
  const [error, setError] = useState<string>("");

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("title を入力してください。");
      return;
    }
    onSubmit({
      title: trimmed,
      memo,
      frequency,
      dayOfMonth,
      monthOfYear: frequency === "yearly" ? monthOfYear : null,
      deadlineDays,
      enabled,
      category,
      subcategory,
    });
  };

  const handleTitleChange = (next: string) => {
    setTitle(next);
    if (!categoryDirty) {
      setCategory(inferCategoryFromTitleAndMemo(next, memo));
    }
  };

  const handleMemoChange = (next: string) => {
    setMemo(next);
    if (!categoryDirty) {
      setCategory(inferCategoryFromTitleAndMemo(title, next));
    }
  };

  const handleDelete = () => {
    if (!onDelete) return;
    if (typeof window !== "undefined" && !window.confirm("このテンプレートを削除しますか？")) {
      return;
    }
    onDelete();
  };

  return (
    <Modal
      title={isEdit ? "毎月・毎年ToDo編集" : "毎月・毎年ToDo追加"}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm text-slate-300">title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="例: 請求書確認"
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-base text-white placeholder:text-slate-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-slate-300">memo（任意）</label>
          <textarea
            value={memo}
            onChange={(e) => handleMemoChange(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-xl bg-slate-900 px-4 py-3 text-base text-white placeholder:text-slate-500"
          />
        </div>

        <CategorySelect
          categories={categories}
          value={category}
          onChange={(c) => {
            setCategoryDirty(true);
            setCategory(c);
          }}
          subcategoryValue={subcategory}
          onSubcategoryChange={setSubcategory}
          onAddSubcategory={onAddSubcategory}
        />

        <div className="space-y-2">
          <label className="block text-sm text-slate-300">繰り返し</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFrequency("monthly")}
              className={`rounded-xl py-3 text-base font-semibold transition ${
                frequency === "monthly"
                  ? "bg-sky-500 text-white"
                  : "bg-slate-700 text-slate-200"
              }`}
            >
              毎月
            </button>
            <button
              type="button"
              onClick={() => setFrequency("yearly")}
              className={`rounded-xl py-3 text-base font-semibold transition ${
                frequency === "yearly"
                  ? "bg-sky-500 text-white"
                  : "bg-slate-700 text-slate-200"
              }`}
            >
              毎年
            </button>
          </div>
        </div>

        {frequency === "yearly" && (
          <div className="space-y-2">
            <label className="block text-sm text-slate-300">月</label>
            <select
              value={monthOfYear}
              onChange={(e) => setMonthOfYear(Number(e.target.value))}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-lg text-white"
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}月
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm text-slate-300">日</label>
          <select
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(Number(e.target.value))}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-lg text-white"
          >
            {DAY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}日
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-400">
            該当月に存在しない日（例: 2月30日）は月末に調整されます。
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-slate-300">
            発生日から何日以内に完了
          </label>
          <select
            value={deadlineDays}
            onChange={(e) => setDeadlineDays(Number(e.target.value))}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-lg text-white"
          >
            {DEADLINE_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}日後
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-3">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-5 w-5"
          />
          <span className="text-base">有効にする</span>
        </label>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          className="w-full rounded-xl bg-sky-500 py-4 text-lg font-bold text-white hover:bg-sky-400"
        >
          保存
        </button>

        {isEdit && onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            className="w-full rounded-xl bg-rose-600 py-3 text-base font-semibold text-white hover:bg-rose-500"
          >
            削除
          </button>
        )}
      </div>
    </Modal>
  );
}
