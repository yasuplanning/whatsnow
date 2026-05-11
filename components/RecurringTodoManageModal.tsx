"use client";

import { useMemo } from "react";
import Modal from "./Modal";
import type { RecurringTodo } from "@/lib/types";
import { describeRecurring } from "@/lib/recurring";

interface Props {
  items: RecurringTodo[];
  onClose: () => void;
  onAdd: () => void;
  onEdit: (item: RecurringTodo) => void;
}

export default function RecurringTodoManageModal({
  items,
  onClose,
  onAdd,
  onEdit,
}: Props) {
  const sorted = useMemo(
    () =>
      items
        .slice()
        .sort((a, b) => a.title.localeCompare(b.title, "ja")),
    [items]
  );

  return (
    <Modal title="毎月・毎年やるべきこと" onClose={onClose}>
      <div className="space-y-4">
        <button
          type="button"
          onClick={onAdd}
          className="w-full rounded-xl bg-sky-500 py-3 text-base font-bold text-white hover:bg-sky-400"
        >
          ＋ 新規追加
        </button>

        {sorted.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">
            まだ登録されていません。
          </p>
        ) : (
          <ul className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
            {sorted.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onEdit(t)}
                  className="block w-full rounded-xl bg-slate-900 p-3 text-left hover:bg-slate-800"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="break-words text-base font-semibold">
                      {t.title}
                    </span>
                    {!t.enabled && (
                      <span className="shrink-0 rounded bg-slate-700 px-2 py-0.5 text-[10px] text-slate-300">
                        無効
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-amber-300">
                    {describeRecurring(t)}
                  </p>
                  {t.memo && (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                      {t.memo}
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
