"use client";

import Modal from "./Modal";
import type { CategoryDefinition } from "@/lib/category";

interface Props {
  categories: CategoryDefinition[];
  kind?: "todo" | "log";
  onClose: () => void;
  onAdd: () => void;
  onEdit: (cat: CategoryDefinition) => void;
}

export default function CategoryManageModal({
  categories,
  kind = "todo",
  onClose,
  onAdd,
  onEdit,
}: Props) {
  const title = kind === "log" ? "ログカテゴリ管理" : "ToDoカテゴリ管理";
  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-4">
        <button
          type="button"
          onClick={onAdd}
          className="w-full rounded-xl bg-sky-500 py-3 text-base font-bold text-white hover:bg-sky-400"
        >
          ＋ 新規追加
        </button>

        <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onEdit(c)}
              className="flex w-full items-center justify-between gap-2 rounded-xl bg-slate-900 p-3 text-left hover:bg-slate-800"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block rounded px-2 py-0.5 text-xs ${c.color}`}
                >
                  {c.name}
                </span>
                {c.subcategories.length > 0 && (
                  <span className="text-xs text-slate-400">
                    サブ{c.subcategories.length}件
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500">
                {c.builtin ? "初期" : "追加"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
