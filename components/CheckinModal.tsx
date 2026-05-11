"use client";

import { useState } from "react";
import Modal from "./Modal";

interface Props {
  onClose: () => void;
  onConfirm: (text: string) => void;
}

export default function CheckinModal({ onClose, onConfirm }: Props) {
  const [text, setText] = useState<string>("");

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <Modal title="今何をしていますか？" onClose={onClose}>
      <div className="space-y-4">
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="例: 皿を洗っている、子どもと遊んでいる、メールを見ている"
          className="w-full resize-none rounded-xl bg-slate-900 px-4 py-3 text-base text-white placeholder:text-slate-500"
        />
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
            登録
          </button>
        </div>
      </div>
    </Modal>
  );
}
