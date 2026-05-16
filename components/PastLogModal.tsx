"use client";

import { useState } from "react";
import Modal from "./Modal";
import CategorySelect from "./CategorySelect";
import { fromDatetimeLocal, toDatetimeLocal } from "@/lib/time";
import type { Category, CategoryDefinition } from "@/lib/category";

interface Props {
  categories: CategoryDefinition[];
  onClose: () => void;
  onConfirm: (input: {
    startAt: Date;
    endAt: Date;
    memo: string;
    category: Category;
  }) => void;
}

export default function PastLogModal({
  categories,
  onClose,
  onConfirm,
}: Props) {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const [start, setStart] = useState<string>(toDatetimeLocal(oneHourAgo));
  const [end, setEnd] = useState<string>(toDatetimeLocal(now));
  const [memo, setMemo] = useState<string>("");
  const [category, setCategory] = useState<Category>(
    categories[0]?.name ?? "その他"
  );
  const [error, setError] = useState<string>("");

  const handleSubmit = () => {
    const startDate = fromDatetimeLocal(start);
    const endDate = fromDatetimeLocal(end);
    if (!startDate || !endDate) {
      setError("開始時刻と終了時刻を入力してください。");
      return;
    }
    if (endDate.getTime() < startDate.getTime()) {
      setError("終了時刻は開始時刻より後にしてください。");
      return;
    }
    onConfirm({
      startAt: startDate,
      endAt: endDate,
      memo,
      category,
    });
  };

  return (
    <Modal title="過去のログを追加" onClose={onClose}>
      <div className="space-y-4">
        <CategorySelect
          categories={categories}
          value={category}
          onChange={(c) => setCategory(c)}
        />

        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-2">
            <label className="block text-sm text-slate-300">開始時刻</label>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-lg text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-slate-300">終了時刻</label>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-lg text-white"
            />
          </div>
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

        <button
          type="button"
          onClick={handleSubmit}
          className="w-full rounded-xl bg-sky-500 py-4 text-lg font-bold text-white hover:bg-sky-400"
        >
          保存
        </button>
      </div>
    </Modal>
  );
}
