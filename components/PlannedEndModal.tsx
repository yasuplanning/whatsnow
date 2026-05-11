"use client";

import { useMemo, useState } from "react";
import Modal from "./Modal";
import { buildHalfHourOptions } from "@/lib/time";

interface Props {
  startAt: Date;
  onClose: () => void;
  onConfirm: (plannedEndAt: Date | null) => void;
}

export default function PlannedEndModal({ startAt, onClose, onConfirm }: Props) {
  const [mode, setMode] = useState<"unknown" | "pick">("unknown");
  const options = useMemo(buildHalfHourOptions, []);
  const [selected, setSelected] = useState<string>(options[0]);

  const handleSubmit = () => {
    if (mode === "unknown") {
      onConfirm(null);
      return;
    }
    const [hStr, mStr] = selected.split(":");
    const h = Number(hStr);
    const m = Number(mStr);
    const planned = new Date(
      startAt.getFullYear(),
      startAt.getMonth(),
      startAt.getDate(),
      h,
      m,
      0,
      0
    );
    if (planned.getTime() <= startAt.getTime()) {
      planned.setDate(planned.getDate() + 1);
    }
    onConfirm(planned);
  };

  return (
    <Modal title="いつまで？" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("unknown")}
            className={`rounded-xl py-3 text-base font-semibold transition ${
              mode === "unknown"
                ? "bg-sky-500 text-white"
                : "bg-slate-700 text-slate-200"
            }`}
          >
            決まっていない
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
          <div className="space-y-2">
            <label className="block text-sm text-slate-300">
              終了予定時刻（30分刻み）
            </label>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-xl text-white"
            >
              {options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400">
              開始時刻より前の場合は翌日として扱います。
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          className="w-full rounded-xl bg-sky-500 py-4 text-lg font-bold text-white hover:bg-sky-400"
        >
          登録
        </button>
      </div>
    </Modal>
  );
}
