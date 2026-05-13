"use client";

import { useState } from "react";
import Modal from "./Modal";
import type { TodoAlert, TodoItem } from "@/lib/types";
import { fromDatetimeLocal, toDatetimeLocal } from "@/lib/time";
import {
  inferCategoryFromTitleAndMemo,
  type Category,
  type CategoryDefinition,
} from "@/lib/category";
import CategorySelect from "./CategorySelect";

type AlertUnit = "minute" | "hour" | "day";

interface AlertDraft {
  id: string;
  amount: number;
  unit: AlertUnit;
  notified: boolean;
}

interface Props {
  categories: CategoryDefinition[];
  initial: TodoItem | null;
  onClose: () => void;
  onSubmit: (input: {
    title: string;
    memo: string;
    progress: number;
    deadline: Date | null;
    category: Category;
    subcategory: string | null;
    important: boolean;
    alerts: TodoAlert[];
  }) => void;
  onComplete?: () => void;
  onDelete?: () => void;
}

function minutesToDraft(minutesBefore: number): {
  amount: number;
  unit: AlertUnit;
} {
  if (minutesBefore > 0 && minutesBefore % 1440 === 0) {
    return { amount: minutesBefore / 1440, unit: "day" };
  }
  if (minutesBefore > 0 && minutesBefore % 60 === 0) {
    return { amount: minutesBefore / 60, unit: "hour" };
  }
  return { amount: minutesBefore, unit: "minute" };
}

function draftToMinutes(amount: number, unit: AlertUnit): number {
  if (unit === "day") return amount * 1440;
  if (unit === "hour") return amount * 60;
  return amount;
}

function makeAlertId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const PROGRESS_OPTIONS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];

function defaultDeadline(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(18, 0, 0, 0);
  return d;
}

export default function TodoFormModal({
  categories,
  initial,
  onClose,
  onSubmit,
  onComplete,
  onDelete,
}: Props) {
  const isEdit = initial !== null;
  const [title, setTitle] = useState<string>(initial?.title ?? "");
  const [memo, setMemo] = useState<string>(initial?.memo ?? "");
  const [category, setCategory] = useState<Category>(
    initial?.category ?? "その他"
  );
  const [subcategory, setSubcategory] = useState<string | null>(
    initial?.subcategory ?? null
  );
  const [categoryDirty, setCategoryDirty] = useState<boolean>(isEdit);
  const [progress, setProgress] = useState<number>(() => {
    const init = initial?.progress ?? 0;
    if (init >= 100) return 90;
    return PROGRESS_OPTIONS.includes(init) ? init : 0;
  });
  const [deadlineMode, setDeadlineMode] = useState<"none" | "set">(
    initial?.deadline ? "set" : "none"
  );
  const [deadline, setDeadline] = useState<string>(
    initial?.deadline
      ? toDatetimeLocal(new Date(initial.deadline))
      : toDatetimeLocal(defaultDeadline())
  );
  const [important, setImportant] = useState<boolean>(
    initial?.important === true
  );
  const [alerts, setAlerts] = useState<AlertDraft[]>(() => {
    const init = initial?.alerts ?? [];
    return init.map((a) => {
      const { amount, unit } = minutesToDraft(a.minutesBefore);
      return { id: a.id, amount, unit, notified: a.notified };
    });
  });
  const [error, setError] = useState<string>("");

  const handleAddAlert = () => {
    if (alerts.length >= 3) return;
    setAlerts((prev) => [
      ...prev,
      { id: makeAlertId(), amount: 1, unit: "day", notified: false },
    ]);
  };

  const handleRemoveAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAlertAmountChange = (id: string, amount: number) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, amount, notified: false } : a
      )
    );
  };

  const handleAlertUnitChange = (id: string, unit: AlertUnit) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, unit, notified: false } : a
      )
    );
  };

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("title を入力してください。");
      return;
    }
    let deadlineDate: Date | null = null;
    if (deadlineMode === "set") {
      deadlineDate = fromDatetimeLocal(deadline);
      if (!deadlineDate) {
        setError("期限の日時を入力してください。");
        return;
      }
    }
    const normalizedAlerts: TodoAlert[] = [];
    if (important && deadlineDate) {
      for (const a of alerts) {
        if (!Number.isFinite(a.amount) || a.amount < 0) {
          setError("アラートの数値が不正です。");
          return;
        }
        const minutesBefore = Math.floor(draftToMinutes(a.amount, a.unit));
        normalizedAlerts.push({
          id: a.id,
          minutesBefore,
          notified: a.notified,
        });
      }
    }
    onSubmit({
      title: trimmed,
      memo,
      progress,
      deadline: deadlineDate,
      category,
      subcategory,
      important,
      alerts: normalizedAlerts,
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

  const handleComplete = () => {
    if (!onComplete) return;
    if (typeof window !== "undefined" && !window.confirm("このToDoを完了にしますか？")) {
      return;
    }
    onComplete();
  };

  const handleDelete = () => {
    if (!onDelete) return;
    if (typeof window !== "undefined" && !window.confirm("このToDoを削除しますか？")) {
      return;
    }
    onDelete();
  };

  return (
    <Modal title={isEdit ? "ToDo編集" : "ToDo追加"} onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm text-slate-300">title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="例: 確定申告の書類をまとめる"
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-base text-white placeholder:text-slate-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-slate-300">memo（任意）</label>
          <textarea
            value={memo}
            onChange={(e) => handleMemoChange(e.target.value)}
            rows={3}
            placeholder="気をつけたいこと、次に進める一歩など"
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
        />

        <div className="space-y-2">
          <label className="block text-sm text-slate-300">progress</label>
          <select
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-lg text-white"
          >
            {PROGRESS_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}%
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-400">
            100% にするには「完了にする」を押してください。
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-slate-300">期限（任意）</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDeadlineMode("none")}
              className={`rounded-xl py-3 text-base font-semibold transition ${
                deadlineMode === "none"
                  ? "bg-sky-500 text-white"
                  : "bg-slate-700 text-slate-200"
              }`}
            >
              未設定
            </button>
            <button
              type="button"
              onClick={() => setDeadlineMode("set")}
              className={`rounded-xl py-3 text-base font-semibold transition ${
                deadlineMode === "set"
                  ? "bg-sky-500 text-white"
                  : "bg-slate-700 text-slate-200"
              }`}
            >
              日時を指定
            </button>
          </div>
          {deadlineMode === "set" && (
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-2 w-full rounded-xl bg-slate-900 px-4 py-3 text-lg text-white"
            />
          )}
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={important}
              onChange={(e) => setImportant(e.target.checked)}
              className="h-5 w-5"
            />
            <span className="text-base">重要</span>
          </label>
          {important && deadlineMode !== "set" && (
            <p className="text-xs text-amber-300">
              アラートを設定するには期限の日時を指定してください。
            </p>
          )}
          {important && deadlineMode === "set" && (
            <div className="space-y-2 rounded-xl bg-slate-900/60 p-3">
              <p className="text-xs text-slate-300">
                期限の何分／時間／日前に通知するか（最大3つ）
              </p>
              {alerts.map((a) => (
                <div key={a.id} className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={a.amount}
                    onChange={(e) =>
                      handleAlertAmountChange(a.id, Number(e.target.value))
                    }
                    className="w-20 rounded-lg bg-slate-900 px-2 py-2 text-base text-white"
                  />
                  <select
                    value={a.unit}
                    onChange={(e) =>
                      handleAlertUnitChange(a.id, e.target.value as AlertUnit)
                    }
                    className="rounded-lg bg-slate-900 px-2 py-2 text-base text-white"
                  >
                    <option value="minute">分前</option>
                    <option value="hour">時間前</option>
                    <option value="day">日前</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveAlert(a.id)}
                    className="ml-auto rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-rose-600 hover:text-white"
                  >
                    削除
                  </button>
                </div>
              ))}
              {alerts.length < 3 && (
                <button
                  type="button"
                  onClick={handleAddAlert}
                  className="w-full rounded-md bg-slate-800 py-2 text-xs text-slate-200 hover:bg-slate-700"
                >
                  ＋ アラートを追加
                </button>
              )}
            </div>
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

        {isEdit && (onComplete || onDelete) && (
          <div className="grid grid-cols-2 gap-2 pt-2">
            {onComplete && (
              <button
                type="button"
                onClick={handleComplete}
                className="rounded-xl bg-emerald-600 py-3 text-base font-semibold text-white hover:bg-emerald-500"
              >
                完了にする
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-xl bg-rose-600 py-3 text-base font-semibold text-white hover:bg-rose-500"
              >
                削除
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
