"use client";

import { useState } from "react";
import Modal from "./Modal";

interface Props {
  categoryName: string;
  existingSubcategories: string[];
  onClose: () => void;
  onAdd: (value: string) => void;
}

export default function SubcategoryAddModal({
  categoryName,
  existingSubcategories,
  onClose,
  onAdd,
}: Props) {
  const [value, setValue] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("サブカテゴリ名を入力してください。");
      return;
    }
    if (existingSubcategories.includes(trimmed)) {
      setError("同じ名前のサブカテゴリが既にあります。");
      return;
    }
    onAdd(trimmed);
  };

  return (
    <Modal title={`「${categoryName}」にサブカテゴリを追加`} onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm text-slate-300">
            サブカテゴリ名
          </label>
          <input
            type="text"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="例: 会議"
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-base text-white placeholder:text-slate-500"
          />
        </div>
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full rounded-xl bg-sky-500 py-3 text-base font-bold text-white hover:bg-sky-400"
        >
          追加
        </button>
      </div>
    </Modal>
  );
}
