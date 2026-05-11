"use client";

import { useState } from "react";
import Modal from "./Modal";
import type { TodoItem } from "@/lib/types";

interface Props {
  initial: TodoItem | null;
  onClose: () => void;
  onSubmit: (input: { title: string; memo: string; progress: number }) => void;
  onComplete?: () => void;
  onDelete?: () => void;
}

const PROGRESS_OPTIONS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];

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
  const [error, setError] = useState<string>("");

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("title を入力してください。");
      return;
    }
    onSubmit({ title: trimmed, memo, progress });
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
