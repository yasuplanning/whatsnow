"use client";

import { useState } from "react";
import Modal from "./Modal";
import type { TodoItem } from "@/lib/types";

const PROGRESS_OPTIONS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];

interface Props {
  todo: TodoItem;
  onClose: () => void;
  onComplete: () => void;
  onContinue: (input: { progress: number; memo: string }) => void;
}

export default function TodoFollowupModal({
  todo,
  onClose,
  onComplete,
  onContinue,
}: Props) {
  const [mode, setMode] = useState<"ask" | "progress">("ask");
  const initialProgress = PROGRESS_OPTIONS.includes(todo.progress)
    ? todo.progress
    : 0;
  const [progress, setProgress] = useState<number>(initialProgress);
  const [memo, setMemo] = useState<string>(todo.memo);

  return (
    <Modal title="ToDo" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-900 p-3">
          <p className="break-words text-base font-semibold">{todo.title}</p>
        </div>

        {mode === "ask" && (
          <>
            <p className="text-base">この「ToDo」も完了にしますか？</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("progress")}
                className="rounded-xl bg-slate-700 py-4 text-base font-semibold text-white hover:bg-slate-600"
              >
                いいえ
              </button>
              <button
                type="button"
                onClick={onComplete}
                className="rounded-xl bg-emerald-500 py-4 text-base font-bold text-white hover:bg-emerald-400"
              >
                はい
              </button>
            </div>
          </>
        )}

        {mode === "progress" && (
          <div className="space-y-4">
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
            </div>

            <div className="space-y-2">
              <label className="block text-sm text-slate-300">
                todo memo（任意）
              </label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={3}
                placeholder="ToDo自体の継続メモ"
                className="w-full resize-none rounded-xl bg-slate-900 px-4 py-3 text-base text-white placeholder:text-slate-500"
              />
            </div>

            <button
              type="button"
              onClick={() => onContinue({ progress, memo })}
              className="w-full rounded-xl bg-sky-500 py-4 text-lg font-bold text-white hover:bg-sky-400"
            >
              更新
            </button>
            <button
              type="button"
              onClick={() => setMode("ask")}
              className="w-full rounded-xl border border-slate-700 py-3 text-sm text-slate-300 hover:bg-slate-800"
            >
              戻る
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
