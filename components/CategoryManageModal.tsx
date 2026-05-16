"use client";

import Modal from "./Modal";
import type { CategoryDefinition } from "@/lib/category";

interface Props {
  categories: CategoryDefinition[];
  kind?: "todo" | "log";
  /**
   * Set of category names that are managed elsewhere (e.g. ToDo-mirrored
   * entries in the log category list). They are shown but cannot be edited
   * or deleted from this modal.
   */
  readOnlyNames?: Set<string>;
  onClose: () => void;
  onAdd: () => void;
  onEdit: (cat: CategoryDefinition) => void;
}

export default function CategoryManageModal({
  categories,
  kind = "todo",
  readOnlyNames,
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

        {kind === "log" && readOnlyNames && readOnlyNames.size > 0 && (
          <p className="text-xs text-slate-400">
            「ToDo同期」と表示されるカテゴリはToDoカテゴリから自動で取り込まれ、ここでは編集・削除できません。
          </p>
        )}

        <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {categories.map((c) => {
            const readOnly = readOnlyNames?.has(c.name) ?? false;
            const content = (
              <div className="flex w-full items-center justify-between gap-2 rounded-xl bg-slate-900 p-3 text-left">
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
                  {readOnly ? "ToDo同期" : c.builtin ? "初期" : "追加"}
                </span>
              </div>
            );
            if (readOnly) {
              return (
                <div key={c.id} className="opacity-60">
                  {content}
                </div>
              );
            }
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onEdit(c)}
                className="block w-full hover:opacity-90"
              >
                {content}
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
