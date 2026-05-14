"use client";

import { useState } from "react";
import Modal from "./Modal";
import { appendTimestampLine } from "@/lib/time";

interface Props {
  onClose: () => void;
  onConfirm: (text: string) => void;
}

export default function TaskMemoModal({ onClose, onConfirm }: Props) {
  const [text, setText] = useState<string>("");

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onConfirm(text);
  };

  return (
    <Modal title="メモ" onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm text-slate-300">メモ</label>
            <button
              type="button"
              onClick={() => setText((prev) => appendTimestampLine(prev))}
              aria-label="タイムスタンプを挿入"
              title="タイムスタンプを挿入"
              className="rounded-md bg-slate-800 p-1.5 text-slate-200 hover:bg-slate-700"
            >
              <ClockIcon className="h-4 w-4" />
            </button>
          </div>
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder="気づき、進捗、メモなど"
            className="w-full resize-none rounded-xl bg-slate-900 px-4 py-3 text-base text-white placeholder:text-slate-500"
          />
        </div>
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
            disabled={!text.trim()}
            className="rounded-xl bg-sky-500 py-3 text-base font-bold text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            追加
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
