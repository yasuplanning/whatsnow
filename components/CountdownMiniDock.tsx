"use client";

import type { CountdownTimer } from "@/lib/types";
import { formatRemaining } from "@/lib/time";

interface Props {
  timers: CountdownTimer[];
  now: number;
  onExpand: (id: string) => void;
}

export default function CountdownMiniDock({ timers, now, onExpand }: Props) {
  const visible = timers.filter(
    (t) => t.status === "active" && t.isMinimized
  );
  if (visible.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-20 flex justify-end px-3">
      <div className="pointer-events-auto flex flex-col gap-2">
        {visible.map((t) => {
          const remaining = new Date(t.dueAt).getTime() - now;
          const overdue = remaining <= 0;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onExpand(t.id)}
              className="min-w-[8rem] rounded-xl bg-slate-800/95 px-3 py-2 text-left shadow-lg ring-1 ring-slate-700 backdrop-blur hover:bg-slate-700"
            >
              <p className="line-clamp-1 text-xs text-slate-300">{t.title}</p>
              <p
                className={`mt-0.5 text-lg font-bold tabular-nums ${
                  overdue ? "text-rose-400" : "text-white"
                }`}
              >
                {overdue ? "00:00" : formatRemaining(remaining)}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
