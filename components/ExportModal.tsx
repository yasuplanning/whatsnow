"use client";

import { useState } from "react";
import Modal from "./Modal";
import { formatLocalDateKey } from "@/lib/csv";

interface Props {
  onClose: () => void;
  onExport: (dateKey: string, format: "csv" | "json") => void;
}

export default function ExportModal({ onClose, onExport }: Props) {
  const [date, setDate] = useState<string>(formatLocalDateKey(new Date()));

  return (
    <Modal title="エクスポート" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-300">
          選択した日付のログを書き出します。
        </p>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-xl bg-slate-900 px-4 py-3 text-xl text-white"
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onExport(date, "csv")}
            className="rounded-xl bg-sky-500 py-4 text-base font-bold text-white hover:bg-sky-400"
          >
            CSVをダウンロード
          </button>
          <button
            type="button"
            onClick={() => onExport(date, "json")}
            className="rounded-xl bg-slate-700 py-4 text-base font-bold text-white hover:bg-slate-600"
          >
            JSONをダウンロード
          </button>
        </div>
      </div>
    </Modal>
  );
}
