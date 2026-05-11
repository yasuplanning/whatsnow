"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EventEntry, LogEntry } from "@/lib/types";
import {
  clearAllEvents,
  clearAllLogs,
  findActiveLog,
  generateId,
  loadEvents,
  loadLogs,
  removeEvent,
  saveEvents,
  saveLogs,
  upsertEvent,
  upsertLog,
} from "@/lib/storage";
import { downloadCsv, logsForDate } from "@/lib/csv";
import {
  ensureNotificationPermission,
  showNotification,
} from "@/lib/notification";
import { formatClock, formatDuration } from "@/lib/time";
import StartModal from "@/components/StartModal";
import PlannedEndModal from "@/components/PlannedEndModal";
import EndModal from "@/components/EndModal";
import MenuModal from "@/components/MenuModal";
import ExportModal from "@/components/ExportModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import PastLogModal from "@/components/PastLogModal";
import EventModal from "@/components/EventModal";
import EventListModal from "@/components/EventListModal";

type Phase =
  | { kind: "initial" }
  | { kind: "askStart"; task: string }
  | { kind: "askPlannedEnd"; task: string; startAt: Date }
  | { kind: "active" }
  | { kind: "askEnd" };

export default function Page() {
  const [mounted, setMounted] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [task, setTask] = useState<string>("");
  const [phase, setPhase] = useState<Phase>({ kind: "initial" });
  const [menuOpen, setMenuOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [eventListOpen, setEventListOpen] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());
  const notifiedRef = useRef<Set<string>>(new Set());

  const activeLog = useMemo(() => findActiveLog(logs), [logs]);

  useEffect(() => {
    setMounted(true);
    const loaded = loadLogs();
    setLogs(loaded);
    setEvents(loadEvents());
    if (findActiveLog(loaded)) {
      setPhase({ kind: "active" });
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [mounted]);

  useEffect(() => {
    if (!activeLog || !activeLog.plannedEndAt) return;
    const planned = new Date(activeLog.plannedEndAt).getTime();
    if (Number.isNaN(planned)) return;
    if (notifiedRef.current.has(activeLog.id)) return;
    if (now >= planned) {
      notifiedRef.current.add(activeLog.id);
      showNotification(
        "終了予定時刻です",
        `「${activeLog.task}」の予定終了時刻になりました。`
      );
    }
  }, [now, activeLog]);

  const persist = useCallback((next: LogEntry[]) => {
    setLogs(next);
    saveLogs(next);
  }, []);

  const persistEvents = useCallback((next: EventEntry[]) => {
    setEvents(next);
    saveEvents(next);
  }, []);

  const handleRegisterClick = () => {
    const trimmed = task.trim();
    if (!trimmed) return;
    void ensureNotificationPermission();
    setPhase({ kind: "askStart", task: trimmed });
  };

  const handleStartConfirm = (startAt: Date) => {
    if (phase.kind !== "askStart") return;
    setPhase({ kind: "askPlannedEnd", task: phase.task, startAt });
  };

  const handlePlannedEndConfirm = (plannedEndAt: Date | null) => {
    if (phase.kind !== "askPlannedEnd") return;
    const nowIso = new Date().toISOString();
    const entry: LogEntry = {
      id: generateId(),
      task: phase.task,
      startAt: phase.startAt.toISOString(),
      plannedEndAt: plannedEndAt ? plannedEndAt.toISOString() : null,
      endAt: null,
      memo: "",
      status: "active",
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    persist(upsertLog(logs, entry));
    setTask("");
    setPhase({ kind: "active" });
  };

  const handleEndConfirm = (endAt: Date, memo: string) => {
    if (!activeLog) {
      setPhase({ kind: "initial" });
      return;
    }
    const nowIso = new Date().toISOString();
    const updated: LogEntry = {
      ...activeLog,
      endAt: endAt.toISOString(),
      memo,
      status: "completed",
      updatedAt: nowIso,
    };
    persist(upsertLog(logs, updated));
    notifiedRef.current.delete(activeLog.id);
    setPhase({ kind: "initial" });
  };

  const handleExport = (dateKey: string) => {
    const targets = logsForDate(logs, dateKey);
    downloadCsv(dateKey, targets);
    setExportOpen(false);
    setMenuOpen(false);
  };

  const handleDeleteAll = () => {
    clearAllLogs();
    clearAllEvents();
    setLogs([]);
    setEvents([]);
    notifiedRef.current.clear();
    setDeleteOpen(false);
    setMenuOpen(false);
    setPhase({ kind: "initial" });
  };

  const handleAddPast = (input: {
    task: string;
    startAt: Date;
    endAt: Date;
    memo: string;
  }) => {
    const nowIso = new Date().toISOString();
    const entry: LogEntry = {
      id: generateId(),
      task: input.task,
      startAt: input.startAt.toISOString(),
      plannedEndAt: null,
      endAt: input.endAt.toISOString(),
      memo: input.memo,
      status: "completed",
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    persist(upsertLog(logs, entry));
    setPastOpen(false);
    setMenuOpen(false);
  };

  const handleAddEvent = (input: {
    content: string;
    photo: string | null;
    memo: string;
    timestamp: Date;
  }) => {
    const nowIso = new Date().toISOString();
    const entry: EventEntry = {
      id: generateId(),
      content: input.content,
      photo: input.photo,
      memo: input.memo,
      timestamp: input.timestamp.toISOString(),
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    persistEvents(upsertEvent(events, entry));
    setEventOpen(false);
    setMenuOpen(false);
  };

  const handleDeleteEvent = (id: string) => {
    persistEvents(removeEvent(events, id));
  };

  const elapsedMs = activeLog
    ? now - new Date(activeLog.startAt).getTime()
    : 0;
  const remainingMs =
    activeLog && activeLog.plannedEndAt
      ? new Date(activeLog.plannedEndAt).getTime() - now
      : null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex items-center justify-end px-4 py-3">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-700"
        >
          メニュー
        </button>
      </header>

      <section className="mx-auto w-full max-w-md px-4 pb-24 pt-2">
        {(!mounted || phase.kind === "initial" || phase.kind === "askStart" || phase.kind === "askPlannedEnd") && !activeLog && (
          <div className="space-y-6">
            <h1 className="text-center text-3xl font-extrabold leading-tight sm:text-4xl">
              what are you doing now?
            </h1>
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="例: 資料作成、休憩、移動など"
              rows={6}
              className="w-full resize-none rounded-2xl bg-slate-800 px-4 py-4 text-lg text-white placeholder:text-slate-500"
            />
            <button
              type="button"
              onClick={handleRegisterClick}
              disabled={!task.trim()}
              className="w-full rounded-2xl bg-sky-500 py-5 text-xl font-bold text-white transition disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              登録
            </button>
          </div>
        )}

        {mounted && activeLog && (
          <div className="space-y-6">
            <h1 className="text-center text-3xl font-extrabold leading-tight sm:text-4xl">
              What I am doing is...
            </h1>
            <div className="rounded-2xl bg-slate-800 p-5">
              <p className="whitespace-pre-wrap break-words text-2xl font-semibold leading-relaxed">
                {activeLog.task}
              </p>
            </div>

            <dl className="space-y-3 rounded-2xl bg-slate-800 p-5 text-base">
              <Row label="開始時刻" value={formatClock(activeLog.startAt)} />
              <Row
                label="終了予定時刻"
                value={
                  activeLog.plannedEndAt
                    ? formatClock(activeLog.plannedEndAt)
                    : "未定"
                }
              />
              <Row label="経過時間" value={formatDuration(elapsedMs)} mono />
              <Row
                label="残り時間"
                value={
                  remainingMs === null ? "未定" : formatDuration(remainingMs)
                }
                mono
              />
            </dl>

            <button
              type="button"
              onClick={() => setPhase({ kind: "askEnd" })}
              className="w-full rounded-2xl bg-emerald-500 py-5 text-xl font-bold text-white hover:bg-emerald-400"
            >
              終了する
            </button>
          </div>
        )}
      </section>

      {phase.kind === "askStart" && (
        <StartModal
          onClose={() => setPhase({ kind: "initial" })}
          onConfirm={handleStartConfirm}
        />
      )}
      {phase.kind === "askPlannedEnd" && (
        <PlannedEndModal
          startAt={phase.startAt}
          onClose={() => setPhase({ kind: "askStart", task: phase.task })}
          onConfirm={handlePlannedEndConfirm}
        />
      )}
      {phase.kind === "askEnd" && (
        <EndModal
          onClose={() => setPhase({ kind: "active" })}
          onConfirm={handleEndConfirm}
        />
      )}
      {menuOpen &&
        !exportOpen &&
        !deleteOpen &&
        !pastOpen &&
        !eventOpen &&
        !eventListOpen && (
          <MenuModal
            onClose={() => setMenuOpen(false)}
            onExport={() => setExportOpen(true)}
            onAddPast={() => setPastOpen(true)}
            onAddEvent={() => setEventOpen(true)}
            onListEvents={() => setEventListOpen(true)}
            onDelete={() => setDeleteOpen(true)}
          />
        )}
      {exportOpen && (
        <ExportModal
          onClose={() => setExportOpen(false)}
          onExport={handleExport}
        />
      )}
      {pastOpen && (
        <PastLogModal
          onClose={() => setPastOpen(false)}
          onConfirm={handleAddPast}
        />
      )}
      {eventOpen && (
        <EventModal
          onClose={() => setEventOpen(false)}
          onConfirm={handleAddEvent}
        />
      )}
      {eventListOpen && (
        <EventListModal
          events={events}
          onClose={() => setEventListOpen(false)}
          onDelete={handleDeleteEvent}
        />
      )}
      {deleteOpen && (
        <DeleteConfirmModal
          onClose={() => setDeleteOpen(false)}
          onConfirm={handleDeleteAll}
        />
      )}
    </main>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-sm text-slate-400">{label}</dt>
      <dd
        className={`text-right text-lg font-semibold ${
          mono ? "tabular-nums" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
