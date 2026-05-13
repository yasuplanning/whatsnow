"use client";

import { useState } from "react";
import Modal from "./Modal";

interface Props {
  activeCount: number;
  onClose: () => void;
  onSubmit: (input: {
    durationMinutes: number;
    title: string;
    memo: string;
  }) => void;
}

function computeEndOfTodayMinutes(): number {
  const now = new Date();
  const target = new Date(now);
  target.setHours(23, 59, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return Math.max(1, Math.ceil((target.getTime() - now.getTime()) / 60000));
}

export default function CountdownFormModal({
  activeCount,
  onClose,
  onSubmit,
}: Props) {
  const reachedLimit = activeCount >= 3;
  const [minutes, setMinutes] = useState<string>("5");
  const [endOfToday, setEndOfToday] = useState<boolean>(false);
  const [title, setTitle] = useState<string>("");
  const [memo, setMemo] = useState<string>("");
  const [error, setError] = useState<string>(
    reachedLimit ? "同時に使えるタイマーは3つまでです" : ""
  );

  const handleSubmit = () => {
    if (reachedLimit) {
      setError("同時に使えるタイマーは3つまでです");
      return;
    }
    const trimmed = title.trim();
    if (!trimmed) {
      setError("タイトルを入力してください。");
      return;
    }
    let durationMinutes: number;
    if (endOfToday) {
      durationMinutes = computeEndOfTodayMinutes();
    } else {
      const m = Math.floor(Number(minutes));
      if (!Number.isFinite(m) || m < 1 || m > 180) {
        setError("1〜180分で指定してください。");
        return;
      }
      durationMinutes = m;
    }
    onSubmit({ durationMinutes, title: trimmed, memo });
  };

  return (
    <Modal title="カウントダウンタイマー" onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm text-slate-300">何分後？</label>
          <input
            type="number"
            min={1}
            max={180}
            step={1}
            inputMode="numeric"
            value={minutes}
            disabled={endOfToday}
            onChange={(e) => setMinutes(e.target.value)}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-2xl tabular-nums text-white disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
          />
          <p className={`text-xs ${endOfToday ? "text-slate-500" : "text-slate-400"}`}>
            1〜180分
          </p>
          <label className="flex items-center gap-2 pt-1 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={endOfToday}
              onChange={(e) => setEndOfToday(e.target.checked)}
              className="h-5 w-5"
            />
            <span>今日中（本日 23:59 期限）</span>
          </label>
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-slate-300">タイトル</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: 電話する、洗濯物、カップラーメン"
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-base text-white placeholder:text-slate-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-slate-300">メモ（任意）</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl bg-slate-900 px-4 py-3 text-base text-white placeholder:text-slate-500"
          />
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-700 py-3 text-base font-semibold text-white hover:bg-slate-600"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={reachedLimit}
            className="rounded-xl bg-sky-500 py-3 text-base font-bold text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            開始
          </button>
        </div>
      </div>
    </Modal>
  );
}
