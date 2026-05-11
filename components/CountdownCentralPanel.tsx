"use client";

import type { CountdownTimer } from "@/lib/types";
import { formatHM, formatRemaining } from "@/lib/time";

interface Props {
  timers: CountdownTimer[];
  now: number;
  onMinimize: (id: string) => void;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
}

export default function CountdownCentralPanel({
  timers,
  now,
  onMinimize,
  onComplete,
  onCancel,
}: Props) {
  const visible = timers.filter(
    (t) => t.status === "active" && !t.isMinimized
  );
  if (visible.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center p-4">
      <div className="pointer-events-auto w-full max-w-md space-y-3 overflow-y-auto rounded-2xl bg-slate-900/95 p-3 shadow-2xl ring-1 ring-slate-700 max-h-[85vh]">
        {visible.map((t) => {
          const remaining = new Date(t.dueAt).getTime() - now;
          const overdue = remaining <= 0;
          return (
            <div key={t.id} className="rounded-xl bg-slate-800 p-4">
              <h3 className="break-words text-xl font-bold">{t.title}</h3>
              {t.memo && (
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-300">
                  {t.memo}
                </p>
              )}
              <div className="mt-3 space-y-1">
                <div
                  className={`text-center text-5xl font-bold tabular-nums ${
                    overdue ? "text-rose-400" : "text-white"
                  }`}
                >
                  {overdue ? "00:00" : formatRemaining(remaining)}
                </div>
                <p
                  className={`text-center text-xs ${
                    overdue ? "text-rose-300" : "text-slate-400"
                  }`}
                >
                  {overdue ? "時間です" : `終了予定 ${formatHM(t.dueAt)}`}
                </p>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onMinimize(t.id)}
                  className="rounded-xl bg-slate-700 py-2 text-sm font-semibold text-white hover:bg-slate-600"
                >
                  最小化
                </button>
                <button
                  type="button"
                  onClick={() => onCancel(t.id)}
                  className="rounded-xl bg-rose-600 py-2 text-sm font-semibold text-white hover:bg-rose-500"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={() => onComplete(t.id)}
                  className="rounded-xl bg-emerald-500 py-2 text-sm font-bold text-white hover:bg-emerald-400"
                >
                  完了
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
