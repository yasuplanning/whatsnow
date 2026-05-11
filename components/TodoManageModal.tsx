"use client";

import { useMemo, useState } from "react";
import Modal from "./Modal";
import type { TodoItem } from "@/lib/types";
import { formatClock } from "@/lib/time";

interface Props {
  todos: TodoItem[];
  onClose: () => void;
  onAdd: () => void;
  onEdit: (todo: TodoItem) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDeleteDone: (id: string) => void;
}

export default function TodoManageModal({
  todos,
  onClose,
  onAdd,
  onEdit,
  onMoveUp,
  onMoveDown,
  onDeleteDone,
}: Props) {
  const [showCompleted, setShowCompleted] = useState(false);
  const nowMs = Date.now();

  const { open, done } = useMemo(() => {
    const sortedOpen = todos.filter((t) => t.status === "open");
    const sortedDone = todos
      .filter((t) => t.status === "done")
      .sort((a, b) => {
        const at = a.doneAt ? new Date(a.doneAt).getTime() : 0;
        const bt = b.doneAt ? new Date(b.doneAt).getTime() : 0;
        return bt - at;
      });
    return { open: sortedOpen, done: sortedDone };
  }, [todos]);

  return (
    <Modal title="やるべきこと" onClose={onClose}>
      <div className="space-y-4">
        <button
          type="button"
          onClick={onAdd}
          className="w-full rounded-xl bg-sky-500 py-3 text-base font-bold text-white hover:bg-sky-400"
        >
          ＋ 新規追加
        </button>

        <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
          {open.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">
              未完了のやるべきことはありません。
            </p>
          ) : (
            open.map((t, idx) => {
              const isPastDeadline = t.deadline
                ? new Date(t.deadline).getTime() < nowMs
                : false;
              return (
                <div key={t.id} className="rounded-xl bg-slate-900 p-3">
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(t)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="break-words text-base font-semibold">
                          {t.title}
                        </span>
                        <span className="shrink-0 text-sm text-sky-300">
                          {t.progress}%
                        </span>
                      </div>
                      {t.memo && (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                          {t.memo}
                        </p>
                      )}
                      {t.deadline && (
                        <p
                          className={`mt-1 text-xs ${
                            isPastDeadline
                              ? "text-rose-300"
                              : "text-amber-300"
                          }`}
                        >
                          期限: {formatClock(t.deadline)}
                        </p>
                      )}
                    </button>
                    <div className="flex shrink-0 flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => onMoveUp(t.id)}
                        disabled={idx === 0}
                        aria-label="上へ移動"
                        className="rounded-md bg-slate-800 px-2 py-1 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveDown(t.id)}
                        disabled={idx === open.length - 1}
                        aria-label="下へ移動"
                        className="rounded-md bg-slate-800 px-2 py-1 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          <button
            type="button"
            onClick={() => setShowCompleted((v) => !v)}
            className="w-full rounded-xl border border-slate-700 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            {showCompleted ? "完了済みを隠す" : "完了済みを表示"}
          </button>

          {showCompleted && (
            <div className="space-y-2">
              {done.length === 0 ? (
                <p className="py-2 text-center text-xs text-slate-400">
                  完了済みはありません。
                </p>
              ) : (
                done.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-xl bg-slate-900/60 p-3 text-sm"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="break-words font-semibold text-slate-200 line-through">
                        {t.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            typeof window !== "undefined" &&
                            !window.confirm("削除しますか？")
                          ) {
                            return;
                          }
                          onDeleteDone(t.id);
                        }}
                        className="shrink-0 rounded-lg bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-rose-600 hover:text-white"
                      >
                        削除
                      </button>
                    </div>
                    {t.doneAt && (
                      <p className="mt-1 text-xs text-slate-500">
                        完了 {formatClock(t.doneAt)}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
