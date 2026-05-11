"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CheckinEntry, EventEntry, LogEntry } from "@/lib/types";
import {
  clearAllCheckins,
  clearAllEvents,
  clearAllLogs,
  clearLastActivityAt,
  findActiveLog,
  generateId,
  loadCheckins,
  loadEvents,
  loadLastActivityAt,
  loadLogs,
  removeEvent,
  saveCheckins,
  saveEvents,
  saveLastActivityAt,
  saveLogs,
  upsertCheckin,
  upsertEvent,
  upsertLog,
} from "@/lib/storage";
import { downloadCsv, entriesForDate } from "@/lib/csv";
import {
  ensureNotificationPermission,
  showNotification,
} from "@/lib/notification";
import { formatClock, formatDuration } from "@/lib/time";
import PlannedEndModal from "@/components/PlannedEndModal";
import EndModal from "@/components/EndModal";
import MenuModal from "@/components/MenuModal";
import ExportModal from "@/components/ExportModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import PastLogModal from "@/components/PastLogModal";
import EventModal from "@/components/EventModal";
import EventListModal from "@/components/EventListModal";
import CheckinModal from "@/components/CheckinModal";
import EditActiveTaskModal from "@/components/EditActiveTaskModal";

const INACTIVITY_THRESHOLD_MS = 30 * 60 * 1000;

type Phase =
  | { kind: "initial" }
  | { kind: "askPlannedEnd"; task: string; startAt: Date }
  | { kind: "active" }
  | { kind: "askEnd" };

export default function Page() {
  const [mounted, setMounted] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [checkins, setCheckins] = useState<CheckinEntry[]>([]);
  const [lastActivityAt, setLastActivityAt] = useState<string | null>(null);
  const [task, setTask] = useState<string>("");
  const [phase, setPhase] = useState<Phase>({ kind: "initial" });
  const [menuOpen, setMenuOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [eventListOpen, setEventListOpen] = useState(false);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());
  const plannedEndNotifiedRef = useRef<Set<string>>(new Set());
  const inactivityNotifiedRef = useRef<string | null>(null);

  const activeLog = useMemo(() => findActiveLog(logs), [logs]);

  useEffect(() => {
    setMounted(true);
    const loaded = loadLogs();
    setLogs(loaded);
    setEvents(loadEvents());
    setCheckins(loadCheckins());
    setLastActivityAt(loadLastActivityAt());
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
    if (plannedEndNotifiedRef.current.has(activeLog.id)) return;
    if (now >= planned) {
      plannedEndNotifiedRef.current.add(activeLog.id);
      showNotification(
        "終了予定時刻です",
        `「${activeLog.task}」の予定終了時刻になりました。`,
        () => setPhase({ kind: "askEnd" })
      );
    }
  }, [now, activeLog]);

  useEffect(() => {
    if (!lastActivityAt) return;
    const last = new Date(lastActivityAt).getTime();
    if (Number.isNaN(last)) return;
    if (inactivityNotifiedRef.current === lastActivityAt) return;
    if (now - last >= INACTIVITY_THRESHOLD_MS) {
      inactivityNotifiedRef.current = lastActivityAt;
      showNotification(
        "今何をしていますか？",
        "しばらく記録がありません。今やっていることを軽くメモしてください。",
        () => setCheckinOpen(true)
      );
    }
  }, [now, lastActivityAt]);

  const persist = useCallback((next: LogEntry[]) => {
    setLogs(next);
    saveLogs(next);
  }, []);

  const persistEvents = useCallback((next: EventEntry[]) => {
    setEvents(next);
    saveEvents(next);
  }, []);

  const persistCheckins = useCallback((next: CheckinEntry[]) => {
    setCheckins(next);
    saveCheckins(next);
  }, []);

  const markActivity = useCallback(() => {
    const iso = new Date().toISOString();
    setLastActivityAt(iso);
    saveLastActivityAt(iso);
  }, []);

  const handleRegisterClick = () => {
    const trimmed = task.trim();
    if (!trimmed) return;
    void ensureNotificationPermission();
    setPhase({ kind: "askPlannedEnd", task: trimmed, startAt: new Date() });
  };

  const handlePlannedEndConfirm = (plannedEndAt: Date | null) => {
    if (phase.kind !== "askPlannedEnd") return;
    const nowIso = new Date().toISOString();
    const entry: LogEntry = {
      id: generateId(),
      type: "task",
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
    markActivity();
  };

  const handleEditActive = (input: {
    task: string;
    startAt: Date;
    plannedEndAt: Date | null;
    memo: string;
  }) => {
    if (!activeLog) return;
    const nowIso = new Date().toISOString();
    const updated: LogEntry = {
      ...activeLog,
      task: input.task,
      startAt: input.startAt.toISOString(),
      plannedEndAt: input.plannedEndAt ? input.plannedEndAt.toISOString() : null,
      memo: input.memo,
      updatedAt: nowIso,
    };
    persist(upsertLog(logs, updated));
    plannedEndNotifiedRef.current.delete(activeLog.id);
    setEditOpen(false);
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
    plannedEndNotifiedRef.current.delete(activeLog.id);
    setPhase({ kind: "initial" });
    markActivity();
  };

  const handleExport = (dateKey: string) => {
    const { tasks, events: dayEvents, checkins: dayCheckins } = entriesForDate(
      logs,
      events,
      checkins,
      dateKey
    );
    downloadCsv(dateKey, tasks, dayEvents, dayCheckins);
    setExportOpen(false);
    setMenuOpen(false);
  };

  const handleDeleteAll = () => {
    clearAllLogs();
    clearAllEvents();
    clearAllCheckins();
    clearLastActivityAt();
    setLogs([]);
    setEvents([]);
    setCheckins([]);
    setLastActivityAt(null);
    plannedEndNotifiedRef.current.clear();
    inactivityNotifiedRef.current = null;
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
      type: "task",
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
    markActivity();
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
      type: "event",
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
    markActivity();
  };

  const handleDeleteEvent = (id: string) => {
    persistEvents(removeEvent(events, id));
  };

  const handleAddCheckin = (text: string) => {
    const nowIso = new Date().toISOString();
    const entry: CheckinEntry = {
      id: generateId(),
      type: "checkin",
      text,
      checkedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    persistCheckins(upsertCheckin(checkins, entry));
    setCheckinOpen(false);
    markActivity();
  };

  const openCheckin = () => {
    void ensureNotificationPermission();
    setCheckinOpen(true);
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
        {(!mounted ||
          phase.kind === "initial" ||
          phase.kind === "askPlannedEnd") &&
          !activeLog && (
            <div className="space-y-6">
              <h1 className="text-center text-3xl font-extrabold leading-tight sm:text-4xl">
                what are you doing now?
              </h1>
              <textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="例: 資料作成、皿洗い、移動など"
                rows={6}
                className="w-full resize-none rounded-2xl bg-slate-800 px-4 py-4 text-lg text-white placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={handleRegisterClick}
                disabled={!task.trim()}
                className="w-full rounded-2xl bg-sky-500 py-5 text-xl font-bold text-white transition disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                タスクを追加
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
              onClick={() => setEditOpen(true)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 py-4 text-base font-semibold text-slate-100 hover:bg-slate-800"
            >
              編集
            </button>
            <button
              type="button"
              onClick={() => setPhase({ kind: "askEnd" })}
              className="w-full rounded-2xl bg-emerald-500 py-5 text-xl font-bold text-white hover:bg-emerald-400"
            >
              終了する
            </button>
          </div>
        )}

        {mounted && (
          <div className="pt-6">
            <button
              type="button"
              onClick={openCheckin}
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 py-4 text-base font-semibold text-slate-100 hover:bg-slate-800"
            >
              今何をしているかメモ
            </button>
          </div>
        )}
      </section>

      {phase.kind === "askPlannedEnd" && (
        <PlannedEndModal
          startAt={phase.startAt}
          onClose={() => setPhase({ kind: "initial" })}
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
        !eventListOpen &&
        !editOpen && (
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
      {checkinOpen && (
        <CheckinModal
          onClose={() => setCheckinOpen(false)}
          onConfirm={handleAddCheckin}
        />
      )}
      {editOpen && activeLog && (
        <EditActiveTaskModal
          log={activeLog}
          onClose={() => setEditOpen(false)}
          onConfirm={handleEditActive}
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
