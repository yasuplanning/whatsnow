"use client";

import { useMemo } from "react";
import Modal from "./Modal";
import type { TodoItem } from "@/lib/types";

interface Props {
  todos: TodoItem[];
  onClose: () => void;
  onPick: (todo: TodoItem) => void;
}

export default function TodoQuickPickModal({ todos, onClose, onPick }: Props) {
  const open = useMemo(
    () =>
      todos
        .filter((t) => t.status === "open")
        .sort((a, b) => {
          if (b.progress !== a.progress) return b.progress - a.progress;
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        }),
    [todos]
  );

  return (
    <Modal title="今からやる候補" onClose={onClose}>
      {open.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          未完了のやるべきことはありません。
        </p>
      ) : (
        <ul className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {open.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onPick(t)}
                className="block w-full rounded-xl bg-slate-900 p-3 text-left hover:bg-slate-800"
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
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
