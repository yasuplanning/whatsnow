"use client";

import { useState } from "react";
import Modal from "./Modal";
import { buildDateAtTime, nowHHMM } from "@/lib/time";

interface Props {
  onClose: () => void;
  onConfirm: (endAt: Date, memo: string) => void;
}

export default function EndModal({ onClose, onConfirm }: Props) {
  const [mode, setMode] = useState<"now" | "pick">("now");
  const [time, setTime] = useState<string>(nowHHMM());
  const [memo, setMemo] = useState<string>("");

  const handleSubmit = () => {
    const endAt = mode === "now" ? new Date() : buildDateAtTime(new Date(), time, false);
    onConfirm(endAt, memo);
  };

  return (
    <Modal title="いつ終了したか？" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("now")}
            className={`rounded-xl py-3 text-base font-semibold transition ${
              mode === "now"
                ? "bg-sky-500 text-white"
                : "bg-slate-700 text-slate-200"
            }`}
          >
            今
          </button>
          <button
            type="button"
            onClick={() => setMode("pick")}
            className={`rounded-xl py-3 text-base font-semibold transition ${
              mode === "pick"
                ? "bg-sky-500 text-white"
                : "bg-slate-700 text-slate-200"
            }`}
          >
            終了時刻を選択
          </button>
        </div>

        {mode === "pick" && (
          <div className="space-y-2">
            <label className="block text-sm text-slate-300">終了時刻</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-2xl tracking-wider text-white"
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm text-slate-300">メモ（任意）</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={4}
            placeholder="気づいたこと、振り返りなど"
            className="w-full resize-none rounded-xl bg-slate-900 px-4 py-3 text-base text-white placeholder:text-slate-500"
          />
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          className="w-full rounded-xl bg-emerald-500 py-4 text-lg font-bold text-white hover:bg-emerald-400"
        >
          登録して終了する
        </button>
      </div>
    </Modal>
  );
}
