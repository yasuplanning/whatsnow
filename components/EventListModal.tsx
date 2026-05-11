"use client";

import { useMemo } from "react";
import Modal from "./Modal";
import type { EventEntry } from "@/lib/types";
import { formatClock } from "@/lib/time";

interface Props {
  events: EventEntry[];
  onClose: () => void;
  onDelete: (id: string) => void;
}

export default function EventListModal({ events, onClose, onDelete }: Props) {
  const sorted = useMemo(
    () =>
      events
        .slice()
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ),
    [events]
  );

  return (
    <Modal title="イベント一覧" onClose={onClose}>
      {sorted.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          まだイベントが記録されていません。
        </p>
      ) : (
        <ul className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          {sorted.map((ev) => (
            <li key={ev.id} className="rounded-xl bg-slate-900 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <p className="text-xs text-slate-400">
                    {formatClock(ev.timestamp)}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-base font-semibold">
                    {ev.content}
                  </p>
                  {ev.memo && (
                    <p className="whitespace-pre-wrap break-words text-sm text-slate-300">
                      {ev.memo}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("このイベントを削除しますか？")) {
                      onDelete(ev.id);
                    }
                  }}
                  className="rounded-lg bg-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-rose-600 hover:text-white"
                >
                  削除
                </button>
              </div>
              {ev.photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ev.photo}
                  alt=""
                  className="mt-2 max-h-56 w-full rounded-lg object-contain"
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
