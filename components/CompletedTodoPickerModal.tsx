"use client";

import { useMemo, useState } from "react";
import Modal from "./Modal";
import type { TodoItem } from "@/lib/types";
import { formatClock } from "@/lib/time";
import { CATEGORY_COLOR } from "@/lib/category";

interface Props {
  todos: TodoItem[];
  excludeIds: string[];
  onClose: () => void;
  onPick: (todo: TodoItem) => void;
}

export default function CompletedTodoPickerModal({
  todos,
  excludeIds,
  onClose,
  onPick,
}: Props) {
  const [query, setQuery] = useState<string>("");
  const candidates = useMemo(() => {
    const exclude = new Set(excludeIds);
    return todos
      .filter((t) => t.status === "done" && !exclude.has(t.id))
      .sort((a, b) => {
        const at = a.doneAt ? new Date(a.doneAt).getTime() : 0;
        const bt = b.doneAt ? new Date(b.doneAt).getTime() : 0;
        return bt - at;
      });
  }, [todos, excludeIds]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return candidates;
    return candidates.filter(
      (t) =>
        t.title.includes(q) ||
        t.memo.includes(q) ||
        t.category.includes(q) ||
        (t.subcategory ?? "").includes(q)
    );
  }, [candidates, query]);

  return (
    <Modal title="完了済みToDoを紐づける" onClose={onClose}>
      <div className="space-y-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="検索（タイトル・メモ・カテゴリ）"
          className="w-full rounded-xl bg-slate-900 px-4 py-2 text-base text-white placeholder:text-slate-500"
        />
        <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">
              対象の完了済みToDoがありません。
            </p>
          ) : (
            filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onPick(t)}
                className="flex w-full flex-col gap-1 rounded-xl bg-slate-900 p-3 text-left hover:bg-slate-800"
              >
                <span className="break-words text-base font-semibold text-slate-100">
                  {t.title}
                </span>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`rounded px-2 py-0.5 ${CATEGORY_COLOR[t.category]}`}
                  >
                    {t.category}
                  </span>
                  {t.subcategory && (
                    <span className="rounded bg-slate-700 px-2 py-0.5 text-slate-200">
                      {t.subcategory}
                    </span>
                  )}
                  {t.doneAt && (
                    <span className="text-slate-400">
                      完了 {formatClock(t.doneAt)}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
