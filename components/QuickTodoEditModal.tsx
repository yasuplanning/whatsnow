"use client";

import { useState } from "react";
import Modal from "./Modal";

interface Props {
  defaultTitle: string;
  onSubmit: (input: { title: string; memo: string }) => void;
  onCancel: () => void;
}

export default function QuickTodoEditModal({
  defaultTitle,
  onSubmit,
  onCancel,
}: Props) {
  const [title, setTitle] = useState<string>(defaultTitle);
  const [memo, setMemo] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("タイトルを入力してください。");
      return;
    }
    onSubmit({ title: trimmed, memo });
  };

  return (
    <Modal title="ToDoを保存" onClose={onCancel}>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm text-slate-300">タイトル</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-base text-white placeholder:text-slate-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-slate-300">メモ（任意）</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={4}
            placeholder="必要なら詳細を書く"
            className="w-full resize-none rounded-xl bg-slate-900 px-4 py-3 text-base text-white placeholder:text-slate-500"
          />
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          className="w-full rounded-xl bg-sky-500 py-4 text-lg font-bold text-white hover:bg-sky-400"
        >
          保存
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-xl bg-slate-700 py-3 text-sm text-slate-200 hover:bg-slate-600"
        >
          キャンセル
        </button>
      </div>
    </Modal>
  );
}
