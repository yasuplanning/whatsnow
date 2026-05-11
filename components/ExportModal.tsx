"use client";

import { useState } from "react";
import Modal from "./Modal";
import { formatLocalDateKey } from "@/lib/csv";

interface Props {
  onClose: () => void;
  onExport: (dateKey: string) => void;
}

export default function ExportModal({ onClose, onExport }: Props) {
  const [date, setDate] = useState<string>(formatLocalDateKey(new Date()));

  return (
    <Modal title="エクスポート" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-300">
          選択した日付に開始したログをCSVで書き出します。
        </p>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-xl bg-slate-900 px-4 py-3 text-xl text-white"
        />
        <button
          type="button"
          onClick={() => onExport(date)}
          className="w-full rounded-xl bg-sky-500 py-4 text-lg font-bold text-white hover:bg-sky-400"
        >
          ダウンロード
        </button>
      </div>
    </Modal>
  );
}
