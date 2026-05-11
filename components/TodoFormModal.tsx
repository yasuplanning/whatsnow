"use client";

import { useState } from "react";
import Modal from "./Modal";
import type { TodoItem } from "@/lib/types";
import { fromDatetimeLocal, toDatetimeLocal } from "@/lib/time";

interface Props {
  initial: TodoItem | null;
  onClose: () => void;
  onSubmit: (input: {
    title: string;
    memo: string;
    progress: number;
    deadline: Date | null;
  }) => void;
  onComplete?: () => void;
  onDelete?: () => void;
}

const PROGRESS_OPTIONS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];

function defaultDeadline(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(18, 0, 0, 0);
  return d;
}

export default function TodoFormModal({
  initial,
  onClose,
  onSubmit,
  onComplete,
  onDelete,
}: Props) {
  const isEdit = initial !== null;
  const [title, setTitle] = useState<string>(initial?.title ?? "");
  const [memo, setMemo] = useState<string>(initial?.memo ?? "");
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
  const [error, setError] = useState<string>("");

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
    onSubmit({
      title: trimmed,
      memo,
      progress,
      deadline: deadlineDate,
    });
  };

  const handleComplete = () => {
    if (!onComplete) return;
    if (typeof window !== "undefined" && !window.confirm("このやるべきことを完了にしますか？")) {
      return;
    }
    onComplete();
  };

  const handleDelete = () => {
    if (!onDelete) return;
    if (typeof window !== "undefined" && !window.confirm("このやるべきことを削除しますか？")) {
      return;
    }
    onDelete();
  };

  return (
    <Modal title={isEdit ? "やるべきこと編集" : "やるべきこと追加"} onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm text-slate-300">title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: 確定申告の書類をまとめる"
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-base text-white placeholder:text-slate-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-slate-300">memo（任意）</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
            placeholder="気をつけたいこと、次に進める一歩など"
            className="w-full resize-none rounded-xl bg-slate-900 px-4 py-3 text-base text-white placeholder:text-slate-500"
          />
        </div>

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
