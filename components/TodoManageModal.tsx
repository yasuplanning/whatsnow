"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Modal from "./Modal";
import type { TodoItem } from "@/lib/types";
import { formatClock } from "@/lib/time";
import { CATEGORY_COLOR } from "@/lib/category";

interface Props {
  todos: TodoItem[];
  onClose: () => void;
  onAdd: () => void;
  onEdit: (todo: TodoItem) => void;
  onReorder: (orderedOpenIds: string[]) => void;
  onPick: (todo: TodoItem) => void;
  onDeleteDone: (id: string) => void;
}

export default function TodoManageModal({
  todos,
  onClose,
  onAdd,
  onEdit,
  onReorder,
  onPick,
  onDeleteDone,
}: Props) {
  const [showCompleted, setShowCompleted] = useState(false);
  const nowMs = Date.now();

  const { open: openFromProps, done } = useMemo(() => {
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

  const [draftOpen, setDraftOpen] = useState<TodoItem[]>(openFromProps);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const rowRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const pointerStateRef = useRef<{
    pointerId: number;
    targetEl: HTMLElement;
  } | null>(null);

  useEffect(() => {
    if (!draggingId) {
      setDraftOpen(openFromProps);
    }
  }, [openFromProps, draggingId]);

  const setRowRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) {
      rowRefs.current.set(id, el);
    } else {
      rowRefs.current.delete(id);
    }
  };

  const handlePointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    id: string
  ) => {
    e.preventDefault();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    pointerStateRef.current = { pointerId: e.pointerId, targetEl: target };
    setDraggingId(id);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggingId) return;
    const y = e.clientY;
    let overId: string | null = null;
    for (const [id, el] of rowRefs.current.entries()) {
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) {
        overId = id;
        break;
      }
    }
    if (!overId || overId === draggingId) return;
    setDraftOpen((prev) => {
      const fromIdx = prev.findIndex((t) => t.id === draggingId);
      const toIdx = prev.findIndex((t) => t.id === overId);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev;
      const next = prev.slice();
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const finishDrag = () => {
    if (!draggingId) return;
    const state = pointerStateRef.current;
    if (state) {
      try {
        state.targetEl.releasePointerCapture(state.pointerId);
      } catch {
        // ignore
      }
    }
    pointerStateRef.current = null;
    const originalIds = openFromProps.map((t) => t.id).join("|");
    const newIds = draftOpen.map((t) => t.id);
    if (newIds.join("|") !== originalIds) {
      onReorder(newIds);
    }
    setDraggingId(null);
  };

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
          {draftOpen.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">
              未完了のやるべきことはありません。
            </p>
          ) : (
            draftOpen.map((t) => {
              const isPastDeadline = t.deadline
                ? new Date(t.deadline).getTime() < nowMs
                : false;
              const isDragging = draggingId === t.id;
              return (
                <div
                  key={t.id}
                  ref={setRowRef(t.id)}
                  className={`rounded-xl bg-slate-900 p-3 transition-opacity ${
                    isDragging ? "opacity-60 ring-2 ring-sky-400" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      aria-label="ドラッグして並べ替え"
                      onPointerDown={(e) => handlePointerDown(e, t.id)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={finishDrag}
                      onPointerCancel={finishDrag}
                      className="shrink-0 cursor-grab touch-none select-none rounded-md bg-slate-800 px-2 py-1 text-slate-300 hover:bg-slate-700 active:cursor-grabbing"
                    >
                      <DragHandleIcon className="h-5 w-5" />
                    </button>
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
                      <p
                        className={`mt-1 inline-block rounded px-2 py-0.5 text-xs ${CATEGORY_COLOR[t.category]}`}
                      >
                        {t.category}
                      </p>
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
                    <button
                      type="button"
                      aria-label="今からやる"
                      onClick={() => onPick(t)}
                      className="shrink-0 rounded-md bg-slate-800 px-2 py-1 text-slate-100 hover:bg-sky-600"
                    >
                      <HandIcon className="h-5 w-5" />
                    </button>
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

function DragHandleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

function HandIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 11V6a2 2 0 0 0-4 0v5" />
      <path d="M14 10V4a2 2 0 0 0-4 0v6" />
      <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
    </svg>
  );
}
