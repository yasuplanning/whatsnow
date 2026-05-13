"use client";

import { useState } from "react";
import Modal from "./Modal";
import type { CategoryDefinition } from "@/lib/category";
import { CATEGORY_COLOR_OPTIONS } from "@/lib/category";

interface Props {
  initial: CategoryDefinition | null;
  existingNames: string[];
  onClose: () => void;
  onSubmit: (input: {
    name: string;
    color: string;
    subcategories: string[];
  }) => void;
  onDelete?: () => void;
}

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

interface SubRow {
  key: string;
  value: string;
}

export default function CategoryFormModal({
  initial,
  existingNames,
  onClose,
  onSubmit,
  onDelete,
}: Props) {
  const isEdit = initial !== null;
  const isOther = initial?.name === "その他";
  const canEditName = !isOther;
  const canDelete = !isOther && isEdit && !!onDelete;
  const [name, setName] = useState<string>(initial?.name ?? "");
  const [color, setColor] = useState<string>(
    initial?.color ?? CATEGORY_COLOR_OPTIONS[0]
  );
  const [subs, setSubs] = useState<SubRow[]>(
    (initial?.subcategories ?? []).map((s) => ({ key: generateId(), value: s }))
  );
  const [error, setError] = useState<string>("");

  const handleAddSub = () => {
    setSubs((prev) => [...prev, { key: generateId(), value: "" }]);
  };

  const handleSubChange = (key: string, value: string) => {
    setSubs((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)));
  };

  const handleRemoveSub = (key: string) => {
    setSubs((prev) => prev.filter((s) => s.key !== key));
  };

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (canEditName) {
      if (!trimmed) {
        setError("カテゴリ名を入力してください。");
        return;
      }
      const dup = existingNames.find(
        (n) => n === trimmed && (!initial || initial.name !== trimmed)
      );
      if (dup) {
        setError("同じ名前のカテゴリが既にあります。");
        return;
      }
    }
    const finalName = canEditName ? trimmed : initial!.name;
    const cleanedSubs: string[] = [];
    const seen = new Set<string>();
    for (const s of subs) {
      const v = s.value.trim();
      if (!v) continue;
      if (seen.has(v)) continue;
      seen.add(v);
      cleanedSubs.push(v);
    }
    onSubmit({ name: finalName, color, subcategories: cleanedSubs });
  };

  const handleDelete = () => {
    if (!onDelete) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "このカテゴリを削除しますか？使用中のデータは「その他」に変更されます。"
      )
    ) {
      return;
    }
    onDelete();
  };

  return (
    <Modal
      title={isEdit ? "カテゴリ編集" : "カテゴリ追加"}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm text-slate-300">カテゴリ名</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEditName}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-base text-white disabled:opacity-60"
          />
          {!canEditName && (
            <p className="text-xs text-slate-400">
              「その他」は削除/名前変更できません。
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-slate-300">色</label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORY_COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${c} ${
                  color === c ? "ring-2 ring-sky-400" : ""
                }`}
              >
                サンプル
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 rounded-xl bg-slate-900/60 p-3">
          <p className="text-sm font-semibold text-slate-200">サブカテゴリ</p>
          <p className="text-xs text-slate-400">
            空のサブカテゴリは保存時に自動で除外されます。
          </p>
          {subs.map((s) => (
            <div key={s.key} className="flex items-center gap-2">
              <input
                type="text"
                value={s.value}
                onChange={(e) => handleSubChange(s.key, e.target.value)}
                placeholder="例: 会議"
                className="flex-1 rounded-md bg-slate-900 px-2 py-2 text-base text-white"
              />
              <button
                type="button"
                onClick={() => handleRemoveSub(s.key)}
                className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-rose-600 hover:text-white"
              >
                削除
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddSub}
            className="w-full rounded-md bg-slate-800 py-2 text-xs text-slate-200 hover:bg-slate-700"
          >
            ＋ サブカテゴリを追加
          </button>
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          className="w-full rounded-xl bg-sky-500 py-4 text-lg font-bold text-white hover:bg-sky-400"
        >
          保存
        </button>

        {canDelete && (
          <button
            type="button"
            onClick={handleDelete}
            className="w-full rounded-xl bg-rose-600 py-3 text-base font-semibold text-white hover:bg-rose-500"
          >
            削除
          </button>
        )}
      </div>
    </Modal>
  );
}
