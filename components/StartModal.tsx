"use client";

import { useState } from "react";
import Modal from "./Modal";
import { buildDateAtTime, nowHHMM } from "@/lib/time";

interface Props {
  onClose: () => void;
  onConfirm: (startAt: Date) => void;
}

export default function StartModal({ onClose, onConfirm }: Props) {
  const [mode, setMode] = useState<"now" | "pick">("now");
  const [time, setTime] = useState<string>(nowHHMM());
  const [previousDay, setPreviousDay] = useState<boolean>(false);

  const handleSubmit = () => {
    if (mode === "now") {
      onConfirm(new Date());
      return;
    }
    const startAt = buildDateAtTime(new Date(), time, previousDay);
    onConfirm(startAt);
  };

  return (
    <Modal title="いつから？" onClose={onClose}>
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
            今から
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
            時刻を選択
          </button>
        </div>

        {mode === "pick" && (
          <div className="space-y-3">
            <label className="block text-sm text-slate-300">開始時刻</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-2xl tracking-wider text-white"
            />
            <label className="flex items-center gap-3 rounded-xl bg-slate-700 px-4 py-3">
              <input
                type="checkbox"
                checked={previousDay}
                onChange={(e) => setPreviousDay(e.target.checked)}
                className="h-5 w-5"
              />
              <span className="text-base">前日から</span>
            </label>
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          className="w-full rounded-xl bg-sky-500 py-4 text-lg font-bold text-white hover:bg-sky-400"
        >
          次へ
        </button>
      </div>
    </Modal>
  );
}
