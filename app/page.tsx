"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CheckinEntry,
  CountdownTimer,
  EventEntry,
  LogEntry,
  RecurringTodo,
  TodoItem,
} from "@/lib/types";
import {
  addCountdownTimer,
  addRecurringTodo,
  addTodo,
  cancelCountdownTimer,
  clearAllCheckins,
  clearAllCountdownTimers,
  clearAllEvents,
  clearAllLogs,
  clearAllRecurringTodos,
  clearAllTodos,
  clearLastActivityAt,
  completeCountdownTimer,
  completeTodo,
  deleteRecurringTodo,
  deleteTodo,
  findActiveLog,
  generateId,
  getCountdownTimers,
  getRecurringTodos,
  getTodoById,
  getTodos,
  loadCheckins,
  loadEvents,
  loadLastActivityAt,
  loadLogs,
  moveTodoDown,
  moveTodoUp,
  removeEvent,
  saveCheckins,
  saveCountdownTimers,
  saveEvents,
  saveLastActivityAt,
  saveLogs,
  saveRecurringTodos,
  saveTodos,
  updateRecurringTodo,
  updateTodo,
  upsertCheckin,
  upsertEvent,
  upsertLog,
} from "@/lib/storage";
import { generateRecurringTodosForNow } from "@/lib/recurring";
import { downloadCsv, entriesForDate } from "@/lib/csv";
import {
  ensureNotificationPermission,
  showNotification,
} from "@/lib/notification";
import { formatClock, formatDuration } from "@/lib/time";
import EndModal from "@/components/EndModal";
import MenuModal from "@/components/MenuModal";
import ExportModal from "@/components/ExportModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import PastLogModal from "@/components/PastLogModal";
import EventModal from "@/components/EventModal";
import EventListModal from "@/components/EventListModal";
import CheckinModal from "@/components/CheckinModal";
import EditActiveTaskModal from "@/components/EditActiveTaskModal";
import TodoManageModal from "@/components/TodoManageModal";
import TodoQuickPickModal from "@/components/TodoQuickPickModal";
import TodoFormModal from "@/components/TodoFormModal";
import TodoFollowupModal from "@/components/TodoFollowupModal";
import RecurringTodoManageModal from "@/components/RecurringTodoManageModal";
import RecurringTodoFormModal from "@/components/RecurringTodoFormModal";
import CountdownFormModal from "@/components/CountdownFormModal";
import CountdownCentralPanel from "@/components/CountdownCentralPanel";
import CountdownMiniDock from "@/components/CountdownMiniDock";

const INACTIVITY_THRESHOLD_MS = 30 * 60 * 1000;

type Phase =
  | { kind: "initial" }
  | { kind: "active" }
  | { kind: "askEnd" };

type TodoFormState =
  | { mode: "add" }
  | { mode: "edit"; todo: TodoItem };

type RecurringFormState =
  | { mode: "add" }
  | { mode: "edit"; item: RecurringTodo };

export default function Page() {
  const [mounted, setMounted] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [checkins, setCheckins] = useState<CheckinEntry[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [lastActivityAt, setLastActivityAt] = useState<string | null>(null);
  const [task, setTask] = useState<string>("");
  const [pendingTodoId, setPendingTodoId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "initial" });
  const [menuOpen, setMenuOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [eventListOpen, setEventListOpen] = useState(false);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [todoManageOpen, setTodoManageOpen] = useState(false);
  const [todoQuickPickOpen, setTodoQuickPickOpen] = useState(false);
  const [todoForm, setTodoForm] = useState<TodoFormState | null>(null);
  const [todoFollowup, setTodoFollowup] = useState<TodoItem | null>(null);
  const [recurringTodos, setRecurringTodos] = useState<RecurringTodo[]>([]);
  const [recurringManageOpen, setRecurringManageOpen] = useState(false);
  const [recurringForm, setRecurringForm] = useState<RecurringFormState | null>(
    null
  );
  const [timers, setTimers] = useState<CountdownTimer[]>([]);
  const [countdownFormOpen, setCountdownFormOpen] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());
  const plannedEndNotifiedRef = useRef<Set<string>>(new Set());
  const inactivityNotifiedRef = useRef<string | null>(null);

  const activeLog = useMemo(() => findActiveLog(logs), [logs]);
  const pendingTodo = useMemo(
    () => (pendingTodoId ? getTodoById(todos, pendingTodoId) : null),
    [pendingTodoId, todos]
  );

  useEffect(() => {
    setMounted(true);
    const loaded = loadLogs();
    setLogs(loaded);
    setEvents(loadEvents());
    setCheckins(loadCheckins());
    const loadedTodos = getTodos();
    const loadedRecurring = getRecurringTodos();
    const additions = generateRecurringTodosForNow(
      loadedRecurring,
      loadedTodos,
      new Date()
    );
    const finalTodos =
      additions.length > 0 ? [...loadedTodos, ...additions] : loadedTodos;
    if (additions.length > 0) {
      saveTodos(finalTodos);
    }
    setTodos(finalTodos);
    setRecurringTodos(loadedRecurring);
    setTimers(getCountdownTimers());
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

  useEffect(() => {
    const toNotify = timers.filter(
      (t) =>
        t.status === "active" &&
        !t.notified &&
        now >= new Date(t.dueAt).getTime()
    );
    if (toNotify.length === 0) return;
    const nowIso = new Date().toISOString();
    const updated = timers.map((t) =>
      toNotify.some((n) => n.id === t.id)
        ? { ...t, notified: true, updatedAt: nowIso }
        : t
    );
    setTimers(updated);
    saveCountdownTimers(updated);
    for (const t of toNotify) {
      const targetId = t.id;
      const targetTitle = t.title;
      showNotification(
        "時間です",
        `「${targetTitle}」の時間になりました。`,
        () => {
          setTimers((prev) => {
            const next = prev.map((x) =>
              x.id === targetId ? { ...x, isMinimized: false } : x
            );
            saveCountdownTimers(next);
            return next;
          });
        }
      );
    }
  }, [now, timers]);

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

  const persistTodos = useCallback((next: TodoItem[]) => {
    setTodos(next);
    saveTodos(next);
  }, []);

  const persistRecurring = useCallback((next: RecurringTodo[]) => {
    setRecurringTodos(next);
    saveRecurringTodos(next);
  }, []);

  const persistTimers = useCallback((next: CountdownTimer[]) => {
    setTimers(next);
    saveCountdownTimers(next);
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
    const startAt = new Date();
    const nowIso = startAt.toISOString();
    const entry: LogEntry = {
      id: generateId(),
      type: "task",
      task: trimmed,
      startAt: nowIso,
      plannedEndAt: null,
      endAt: null,
      memo: "",
      status: "active",
      createdAt: nowIso,
      updatedAt: nowIso,
      todoId: pendingTodoId,
    };
    persist(upsertLog(logs, entry));
    setTask("");
    setPendingTodoId(null);
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

    const todoId = updated.todoId ?? null;
    if (todoId) {
      const linked = getTodoById(todos, todoId);
      if (linked && linked.status === "open") {
        setTodoFollowup(linked);
      }
    }
  };

  const handleExport = (dateKey: string) => {
    const {
      tasks,
      events: dayEvents,
      checkins: dayCheckins,
      countdowns: dayCountdowns,
    } = entriesForDate(logs, events, checkins, timers, dateKey);
    downloadCsv(dateKey, tasks, dayEvents, dayCheckins, dayCountdowns, todos);
    setExportOpen(false);
    setMenuOpen(false);
  };

  const handleDeleteAll = () => {
    clearAllLogs();
    clearAllEvents();
    clearAllCheckins();
    clearAllTodos();
    clearAllRecurringTodos();
    clearAllCountdownTimers();
    clearLastActivityAt();
    setLogs([]);
    setEvents([]);
    setCheckins([]);
    setTodos([]);
    setRecurringTodos([]);
    setTimers([]);
    setLastActivityAt(null);
    setPendingTodoId(null);
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
      todoId: null,
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
      todoId: null,
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

  const handleQuickPickTodo = (todo: TodoItem) => {
    setTask(todo.title);
    setPendingTodoId(todo.id);
    setTodoQuickPickOpen(false);
  };

  const handleTodoSubmit = (input: {
    title: string;
    memo: string;
    progress: number;
    deadline: Date | null;
  }) => {
    const nowIso = new Date().toISOString();
    if (!todoForm) return;
    if (todoForm.mode === "add") {
      const entry: TodoItem = {
        id: generateId(),
        title: input.title,
        memo: input.memo,
        progress: input.progress,
        status: "open",
        deadline: input.deadline ? input.deadline.toISOString() : null,
        createdAt: nowIso,
        updatedAt: nowIso,
        doneAt: null,
      };
      persistTodos(addTodo(todos, entry));
    } else {
      const updated: TodoItem = {
        ...todoForm.todo,
        title: input.title,
        memo: input.memo,
        progress: input.progress,
        deadline: input.deadline ? input.deadline.toISOString() : null,
        updatedAt: nowIso,
      };
      persistTodos(updateTodo(todos, updated));
    }
    setTodoForm(null);
  };

  const handleMoveTodoUp = (id: string) => {
    persistTodos(moveTodoUp(todos, id));
  };

  const handleMoveTodoDown = (id: string) => {
    persistTodos(moveTodoDown(todos, id));
  };

  const handleTodoComplete = () => {
    if (!todoForm || todoForm.mode !== "edit") return;
    persistTodos(completeTodo(todos, todoForm.todo.id));
    setTodoForm(null);
  };

  const handleTodoDelete = () => {
    if (!todoForm || todoForm.mode !== "edit") return;
    if (pendingTodoId === todoForm.todo.id) {
      setPendingTodoId(null);
    }
    persistTodos(deleteTodo(todos, todoForm.todo.id));
    setTodoForm(null);
  };

  const handleDeleteDoneTodo = (id: string) => {
    persistTodos(deleteTodo(todos, id));
  };

  const handleFollowupComplete = () => {
    if (!todoFollowup) return;
    persistTodos(completeTodo(todos, todoFollowup.id));
    setTodoFollowup(null);
  };

  const applyRecurringGeneration = useCallback(
    (templatesNext: RecurringTodo[], todosNext: TodoItem[]) => {
      const additions = generateRecurringTodosForNow(
        templatesNext,
        todosNext,
        new Date()
      );
      if (additions.length === 0) {
        setTodos(todosNext);
        return;
      }
      const merged = [...todosNext, ...additions];
      setTodos(merged);
      saveTodos(merged);
    },
    []
  );

  const handleRecurringSubmit = (input: {
    title: string;
    memo: string;
    frequency: RecurringTodo["frequency"];
    dayOfMonth: number;
    monthOfYear: number | null;
    deadlineDays: number;
    enabled: boolean;
  }) => {
    if (!recurringForm) return;
    const nowIso = new Date().toISOString();
    let nextTemplates: RecurringTodo[];
    if (recurringForm.mode === "add") {
      const entry: RecurringTodo = {
        id: generateId(),
        title: input.title,
        memo: input.memo,
        frequency: input.frequency,
        dayOfMonth: input.dayOfMonth,
        monthOfYear: input.monthOfYear,
        deadlineDays: input.deadlineDays,
        enabled: input.enabled,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      nextTemplates = addRecurringTodo(recurringTodos, entry);
    } else {
      const updated: RecurringTodo = {
        ...recurringForm.item,
        title: input.title,
        memo: input.memo,
        frequency: input.frequency,
        dayOfMonth: input.dayOfMonth,
        monthOfYear: input.monthOfYear,
        deadlineDays: input.deadlineDays,
        enabled: input.enabled,
        updatedAt: nowIso,
      };
      nextTemplates = updateRecurringTodo(recurringTodos, updated);
    }
    persistRecurring(nextTemplates);
    setRecurringForm(null);
    applyRecurringGeneration(nextTemplates, todos);
  };

  const handleRecurringDelete = () => {
    if (!recurringForm || recurringForm.mode !== "edit") return;
    const nextTemplates = deleteRecurringTodo(
      recurringTodos,
      recurringForm.item.id
    );
    persistRecurring(nextTemplates);
    setRecurringForm(null);
  };

  const handleCountdownSubmit = (input: {
    durationMinutes: number;
    title: string;
    memo: string;
  }) => {
    const activeCount = timers.filter((t) => t.status === "active").length;
    if (activeCount >= 3) return;
    void ensureNotificationPermission();
    const startedAt = new Date();
    const dueAt = new Date(
      startedAt.getTime() + input.durationMinutes * 60 * 1000
    );
    const nowIso = startedAt.toISOString();
    const entry: CountdownTimer = {
      id: generateId(),
      title: input.title,
      memo: input.memo,
      durationMinutes: input.durationMinutes,
      startedAt: nowIso,
      dueAt: dueAt.toISOString(),
      completedAt: null,
      status: "active",
      isMinimized: false,
      notified: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    persistTimers(addCountdownTimer(timers, entry));
    setCountdownFormOpen(false);
    setMenuOpen(false);
  };

  const handleTimerMinimize = (id: string) => {
    const nowIso = new Date().toISOString();
    persistTimers(
      timers.map((t) =>
        t.id === id ? { ...t, isMinimized: true, updatedAt: nowIso } : t
      )
    );
  };

  const handleTimerExpand = (id: string) => {
    const nowIso = new Date().toISOString();
    persistTimers(
      timers.map((t) =>
        t.id === id ? { ...t, isMinimized: false, updatedAt: nowIso } : t
      )
    );
  };

  const handleTimerComplete = (id: string) => {
    persistTimers(completeCountdownTimer(timers, id));
  };

  const handleTimerCancel = (id: string) => {
    persistTimers(cancelCountdownTimer(timers, id));
  };

  const handleFollowupContinue = (input: { progress: number; memo: string }) => {
    if (!todoFollowup) return;
    const current = getTodoById(todos, todoFollowup.id);
    if (!current) {
      setTodoFollowup(null);
      return;
    }
    const nowIso = new Date().toISOString();
    const updated: TodoItem = {
      ...current,
      progress: input.progress,
      memo: input.memo,
      updatedAt: nowIso,
    };
    persistTodos(updateTodo(todos, updated));
    setTodoFollowup(null);
  };

  const elapsedMs = activeLog
    ? now - new Date(activeLog.startAt).getTime()
    : 0;
  const remainingMs =
    activeLog && activeLog.plannedEndAt
      ? new Date(activeLog.plannedEndAt).getTime() - now
      : null;

  const linkedTodoTitle = activeLog?.todoId
    ? getTodoById(todos, activeLog.todoId)?.title ?? null
    : null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex items-center justify-end gap-2 px-4 py-3">
        {mounted && !activeLog && (
          <button
            type="button"
            onClick={() => setTodoQuickPickOpen(true)}
            aria-label="やるべきこと"
            className="rounded-xl bg-slate-800 p-2 text-slate-100 hover:bg-slate-700"
          >
            <TodoIcon className="h-5 w-5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-700"
        >
          メニュー
        </button>
      </header>

      <section className="mx-auto w-full max-w-md px-4 pb-24 pt-2">
        {(!mounted || phase.kind === "initial") && !activeLog && (
            <div className="space-y-6">
              <h1 className="text-center text-3xl font-extrabold leading-tight sm:text-4xl">
                what are you doing now?
              </h1>
              {pendingTodo && (
                <div className="flex items-center justify-between gap-2 rounded-xl bg-sky-900/40 px-3 py-2 text-sm">
                  <span className="break-words">
                    <span className="text-sky-300">やるべきこと:</span>{" "}
                    {pendingTodo.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPendingTodoId(null)}
                    className="shrink-0 rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700"
                  >
                    解除
                  </button>
                </div>
              )}
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
              {linkedTodoTitle && (
                <p className="mt-2 text-xs text-sky-300">
                  やるべきこと: {linkedTodoTitle}
                </p>
              )}
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
        !editOpen &&
        !todoManageOpen &&
        !recurringManageOpen &&
        !countdownFormOpen && (
          <MenuModal
            onClose={() => setMenuOpen(false)}
            onExport={() => setExportOpen(true)}
            onAddPast={() => setPastOpen(true)}
            onAddEvent={() => setEventOpen(true)}
            onListEvents={() => setEventListOpen(true)}
            onManageTodos={() => {
              setTodoManageOpen(true);
              setMenuOpen(false);
            }}
            onManageRecurring={() => {
              setRecurringManageOpen(true);
              setMenuOpen(false);
            }}
            onOpenCountdown={() => {
              setCountdownFormOpen(true);
              setMenuOpen(false);
            }}
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
      {todoManageOpen && !todoForm && (
        <TodoManageModal
          todos={todos}
          onClose={() => setTodoManageOpen(false)}
          onAdd={() => setTodoForm({ mode: "add" })}
          onEdit={(todo) => setTodoForm({ mode: "edit", todo })}
          onMoveUp={handleMoveTodoUp}
          onMoveDown={handleMoveTodoDown}
          onDeleteDone={handleDeleteDoneTodo}
        />
      )}
      {todoQuickPickOpen && (
        <TodoQuickPickModal
          todos={todos}
          onClose={() => setTodoQuickPickOpen(false)}
          onPick={handleQuickPickTodo}
        />
      )}
      {todoForm && (
        <TodoFormModal
          initial={todoForm.mode === "edit" ? todoForm.todo : null}
          onClose={() => setTodoForm(null)}
          onSubmit={handleTodoSubmit}
          onComplete={
            todoForm.mode === "edit" ? handleTodoComplete : undefined
          }
          onDelete={todoForm.mode === "edit" ? handleTodoDelete : undefined}
        />
      )}
      {todoFollowup && (
        <TodoFollowupModal
          todo={todoFollowup}
          onClose={() => setTodoFollowup(null)}
          onComplete={handleFollowupComplete}
          onContinue={handleFollowupContinue}
        />
      )}
      {recurringManageOpen && !recurringForm && (
        <RecurringTodoManageModal
          items={recurringTodos}
          onClose={() => setRecurringManageOpen(false)}
          onAdd={() => setRecurringForm({ mode: "add" })}
          onEdit={(item) => setRecurringForm({ mode: "edit", item })}
        />
      )}
      {recurringForm && (
        <RecurringTodoFormModal
          initial={recurringForm.mode === "edit" ? recurringForm.item : null}
          onClose={() => setRecurringForm(null)}
          onSubmit={handleRecurringSubmit}
          onDelete={
            recurringForm.mode === "edit" ? handleRecurringDelete : undefined
          }
        />
      )}
      {deleteOpen && (
        <DeleteConfirmModal
          onClose={() => setDeleteOpen(false)}
          onConfirm={handleDeleteAll}
        />
      )}
      {mounted && (
        <CountdownCentralPanel
          timers={timers}
          now={now}
          onMinimize={handleTimerMinimize}
          onComplete={handleTimerComplete}
          onCancel={handleTimerCancel}
        />
      )}
      {mounted && (
        <CountdownMiniDock
          timers={timers}
          now={now}
          onExpand={handleTimerExpand}
        />
      )}
      {countdownFormOpen && (
        <CountdownFormModal
          activeCount={timers.filter((t) => t.status === "active").length}
          onClose={() => setCountdownFormOpen(false)}
          onSubmit={handleCountdownSubmit}
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

function TodoIcon({ className }: { className?: string }) {
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
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="m8 11 2 2 4-4" />
      <path d="M8 17h8" />
    </svg>
  );
}
