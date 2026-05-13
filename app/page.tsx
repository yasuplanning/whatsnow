"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CheckinEntry,
  CountdownTimer,
  EventEntry,
  LogEntry,
  RecurringTodo,
  Subscription,
  TodoAlert,
  TodoAllocation,
  TodoItem,
} from "@/lib/types";
import {
  addCountdownTimer,
  addRecurringTodo,
  addSubscription,
  addTodo,
  cancelCountdownTimer,
  clearAllCheckins,
  clearAllCountdownTimers,
  clearAllEvents,
  clearAllLogs,
  clearAllRecurringTodos,
  clearAllSubscriptions,
  clearAllTodos,
  clearLastActivityAt,
  completeCountdownTimer,
  completeTodo,
  deleteRecurringTodo,
  deleteSubscription,
  deleteTodo,
  findActiveLog,
  generateId,
  getCountdownTimers,
  getRecurringTodos,
  getSubscriptions,
  getTodoById,
  getTodos,
  loadCheckins,
  loadEvents,
  loadLastActivityAt,
  loadLogs,
  removeEvent,
  reorderOpenTodos,
  savePhoto,
  saveCheckins,
  saveCountdownTimers,
  saveEvents,
  saveLastActivityAt,
  saveLogs,
  saveRecurringTodos,
  saveSubscriptions,
  saveTodos,
  updateRecurringTodo,
  updateSubscription,
  updateTodo,
  upsertCheckin,
  upsertEvent,
  upsertLog,
} from "@/lib/storage";
import { generateRecurringTodosForNow } from "@/lib/recurring";
import {
  createReviewTodoManually,
  generateSubscriptionReviewTodosForNow,
} from "@/lib/subscriptionReview";
import {
  ensureNotificationPermission,
  showNotification,
} from "@/lib/notification";
import {
  diffMinutes,
  formatClock,
  formatDuration,
  nowJstIso,
  toJstIso,
} from "@/lib/time";
import { normalizeAllocations } from "@/lib/allocation";
import {
  CATEGORY_COLOR,
  inferCategoryFromTitleAndMemo,
  type Category,
} from "@/lib/category";
import CategorySelect from "@/components/CategorySelect";
import EventTimelineModal from "@/components/EventTimelineModal";
import EndModal from "@/components/EndModal";
import MenuModal from "@/components/MenuModal";
import BackupModal from "@/components/BackupModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import PastLogModal from "@/components/PastLogModal";
import EventModal from "@/components/EventModal";
import EventListModal from "@/components/EventListModal";
import CheckinModal from "@/components/CheckinModal";
import EditActiveTaskModal from "@/components/EditActiveTaskModal";
import TodoManageModal from "@/components/TodoManageModal";
import TodoFormModal from "@/components/TodoFormModal";
import TodoFollowupModal from "@/components/TodoFollowupModal";
import EditPastTaskModal from "@/components/EditPastTaskModal";
import RecurringTodoManageModal from "@/components/RecurringTodoManageModal";
import RecurringTodoFormModal from "@/components/RecurringTodoFormModal";
import CountdownFormModal from "@/components/CountdownFormModal";
import CountdownCentralPanel from "@/components/CountdownCentralPanel";
import CountdownMiniDock from "@/components/CountdownMiniDock";
import SubscriptionManageModal from "@/components/SubscriptionManageModal";
import SubscriptionFormModal, {
  type SubmitInput as SubscriptionSubmitInput,
} from "@/components/SubscriptionFormModal";

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

type SubscriptionFormState =
  | { mode: "add" }
  | { mode: "edit"; item: Subscription };

export default function Page() {
  const [mounted, setMounted] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [checkins, setCheckins] = useState<CheckinEntry[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [lastActivityAt, setLastActivityAt] = useState<string | null>(null);
  const [task, setTask] = useState<string>("");
  const [taskCategory, setTaskCategory] = useState<Category>("その他");
  const [taskCategoryDirty, setTaskCategoryDirty] = useState(false);
  const [pendingTodoIds, setPendingTodoIds] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>({ kind: "initial" });
  const [menuOpen, setMenuOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [eventListOpen, setEventListOpen] = useState(false);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [todoManageOpen, setTodoManageOpen] = useState(false);
  const [todoForm, setTodoForm] = useState<TodoFormState | null>(null);
  const [todoFollowupQueue, setTodoFollowupQueue] = useState<string[]>([]);
  const todoFollowup = useMemo<TodoItem | null>(() => {
    const id = todoFollowupQueue[0];
    if (!id) return null;
    return getTodoById(todos, id);
  }, [todoFollowupQueue, todos]);
  const [recurringTodos, setRecurringTodos] = useState<RecurringTodo[]>([]);
  const [recurringManageOpen, setRecurringManageOpen] = useState(false);
  const [recurringForm, setRecurringForm] = useState<RecurringFormState | null>(
    null
  );
  const [timers, setTimers] = useState<CountdownTimer[]>([]);
  const [countdownFormOpen, setCountdownFormOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [editPastLogId, setEditPastLogId] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subscriptionManageOpen, setSubscriptionManageOpen] = useState(false);
  const [subscriptionForm, setSubscriptionForm] =
    useState<SubscriptionFormState | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const plannedEndNotifiedRef = useRef<Set<string>>(new Set());
  const inactivityNotifiedRef = useRef<string | null>(null);

  const activeLog = useMemo(() => findActiveLog(logs), [logs]);
  const pendingTodos = useMemo(
    () =>
      pendingTodoIds
        .map((id) => getTodoById(todos, id))
        .filter((t): t is TodoItem => t !== null),
    [pendingTodoIds, todos]
  );

  const reloadAllFromStorage = useCallback(() => {
    const loaded = loadLogs();
    setLogs(loaded);
    setEvents(loadEvents());
    setCheckins(loadCheckins());
    const loadedTodos = getTodos();
    const loadedRecurring = getRecurringTodos();
    const loadedSubscriptions = getSubscriptions();
    const now = new Date();
    const recurringAdditions = generateRecurringTodosForNow(
      loadedRecurring,
      loadedTodos,
      now
    );
    const afterRecurring =
      recurringAdditions.length > 0
        ? [...loadedTodos, ...recurringAdditions]
        : loadedTodos;
    const subscriptionAdditions = generateSubscriptionReviewTodosForNow(
      loadedSubscriptions,
      afterRecurring,
      now
    );
    const finalTodos =
      subscriptionAdditions.length > 0
        ? [...afterRecurring, ...subscriptionAdditions]
        : afterRecurring;
    if (recurringAdditions.length > 0 || subscriptionAdditions.length > 0) {
      saveTodos(finalTodos);
    }
    setTodos(finalTodos);
    setRecurringTodos(loadedRecurring);
    setSubscriptions(loadedSubscriptions);
    setTimers(getCountdownTimers());
    setLastActivityAt(loadLastActivityAt());
    setPendingTodoIds([]);
    plannedEndNotifiedRef.current.clear();
    inactivityNotifiedRef.current = null;
    setPhase(findActiveLog(loaded) ? { kind: "active" } : { kind: "initial" });
  }, []);

  useEffect(() => {
    setMounted(true);
    reloadAllFromStorage();
  }, [reloadAllFromStorage]);

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
    const nowIso = nowJstIso();
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

  useEffect(() => {
    type Hit = { todoId: string; alertId: string; title: string };
    const hits: Hit[] = [];
    for (const t of todos) {
      if (!t.important || t.status !== "open" || !t.deadline) continue;
      const deadlineMs = new Date(t.deadline).getTime();
      if (Number.isNaN(deadlineMs)) continue;
      for (const a of t.alerts) {
        if (a.notified) continue;
        const fireAt = deadlineMs - a.minutesBefore * 60 * 1000;
        if (now >= fireAt) {
          hits.push({ todoId: t.id, alertId: a.id, title: t.title });
        }
      }
    }
    if (hits.length === 0) return;
    const nowIso = nowJstIso();
    const next = todos.map((t) => {
      const todoHits = hits.filter((h) => h.todoId === t.id);
      if (todoHits.length === 0) return t;
      return {
        ...t,
        alerts: t.alerts.map((a) =>
          todoHits.some((h) => h.alertId === a.id)
            ? { ...a, notified: true }
            : a
        ),
        updatedAt: nowIso,
      };
    });
    setTodos(next);
    saveTodos(next);
    for (const h of hits) {
      showNotification("重要なToDo", `「${h.title}」の期限が近づいています。`);
    }
  }, [now, todos]);

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
    const iso = nowJstIso();
    setLastActivityAt(iso);
    saveLastActivityAt(iso);
  }, []);

  const handleTaskChange = (next: string) => {
    setTask(next);
    if (!taskCategoryDirty) {
      setTaskCategory(inferCategoryFromTitleAndMemo(next, ""));
    }
  };

  const handleRegisterClick = () => {
    const trimmed = task.trim();
    if (!trimmed) return;
    void ensureNotificationPermission();
    const startAt = new Date();
    const nowIso = nowJstIso();
    const entry: LogEntry = {
      id: generateId(),
      type: "task",
      task: trimmed,
      category: taskCategory,
      durationMinutes: null,
      startAt: nowIso,
      plannedEndAt: null,
      endAt: null,
      memo: "",
      status: "active",
      createdAt: nowIso,
      updatedAt: nowIso,
      todoId: pendingTodoIds[0] ?? null,
      todoIds: [...pendingTodoIds],
      deductionMinutes: 0,
      todoAllocations: normalizeAllocations(pendingTodoIds, []),
    };
    persist(upsertLog(logs, entry));
    setTask("");
    setTaskCategory("その他");
    setTaskCategoryDirty(false);
    setPendingTodoIds([]);
    setPhase({ kind: "active" });
    markActivity();
  };

  const handleEditPastTaskConfirm = (input: {
    startAt: Date;
    endAt: Date;
    deductionMinutes: number;
    memo: string;
    todoAllocations: TodoAllocation[];
  }) => {
    if (!editPastLogId) return;
    const target = logs.find((l) => l.id === editPastLogId);
    if (!target) {
      setEditPastLogId(null);
      return;
    }
    const nowIso = nowJstIso();
    const startAtIso = toJstIso(input.startAt);
    const endAtIso = toJstIso(input.endAt);
    const normalized = normalizeAllocations(
      target.todoIds,
      input.todoAllocations
    );
    const updated: LogEntry = {
      ...target,
      startAt: startAtIso,
      endAt: endAtIso,
      memo: input.memo,
      deductionMinutes: input.deductionMinutes,
      todoAllocations: normalized,
      durationMinutes: diffMinutes(startAtIso, endAtIso),
      updatedAt: nowIso,
    };
    persist(upsertLog(logs, updated));
    setEditPastLogId(null);
  };

  const handleEditActive = (input: {
    task: string;
    startAt: Date;
    plannedEndAt: Date | null;
    memo: string;
    category: Category;
  }) => {
    if (!activeLog) return;
    const nowIso = nowJstIso();
    const startAtIso = toJstIso(input.startAt);
    const plannedEndAtIso = input.plannedEndAt
      ? toJstIso(input.plannedEndAt)
      : null;
    const updated: LogEntry = {
      ...activeLog,
      task: input.task,
      startAt: startAtIso,
      plannedEndAt: plannedEndAtIso,
      memo: input.memo,
      category: input.category,
      durationMinutes: diffMinutes(startAtIso, activeLog.endAt),
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
    const nowIso = nowJstIso();
    const endAtIso = toJstIso(endAt);
    const updated: LogEntry = {
      ...activeLog,
      endAt: endAtIso,
      memo,
      status: "completed",
      durationMinutes: diffMinutes(activeLog.startAt, endAtIso),
      updatedAt: nowIso,
    };
    persist(upsertLog(logs, updated));
    plannedEndNotifiedRef.current.delete(activeLog.id);
    setPhase({ kind: "initial" });
    markActivity();

    const openTodoIds = updated.todoIds.filter((id) => {
      const t = getTodoById(todos, id);
      return t !== null && t.status === "open";
    });
    if (openTodoIds.length > 0) {
      setTodoFollowupQueue(openTodoIds);
    }
  };

  const handleDeleteAll = () => {
    clearAllLogs();
    clearAllEvents();
    clearAllCheckins();
    clearAllTodos();
    clearAllRecurringTodos();
    clearAllCountdownTimers();
    clearAllSubscriptions();
    clearLastActivityAt();
    setLogs([]);
    setEvents([]);
    setCheckins([]);
    setTodos([]);
    setRecurringTodos([]);
    setSubscriptions([]);
    setTimers([]);
    setLastActivityAt(null);
    setPendingTodoIds([]);
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
    category: Category;
  }) => {
    const nowIso = nowJstIso();
    const startAtIso = toJstIso(input.startAt);
    const endAtIso = toJstIso(input.endAt);
    const entry: LogEntry = {
      id: generateId(),
      type: "task",
      task: input.task,
      category: input.category,
      durationMinutes: diffMinutes(startAtIso, endAtIso),
      startAt: startAtIso,
      plannedEndAt: null,
      endAt: endAtIso,
      memo: input.memo,
      status: "completed",
      createdAt: nowIso,
      updatedAt: nowIso,
      todoId: null,
      todoIds: [],
      deductionMinutes: 0,
      todoAllocations: [],
    };
    persist(upsertLog(logs, entry));
    setPastOpen(false);
    setMenuOpen(false);
    markActivity();
  };

  const handleAddEvent = (input: {
    content: string;
    photoDataUrl: string | null;
    photoSummary: string | null;
    memo: string;
    timestamp: Date;
    category: Category;
  }) => {
    const nowIso = nowJstIso();
    let photoId: string | null = null;
    let photoPath: string | null = null;
    if (input.photoDataUrl) {
      const saved = savePhoto(input.photoDataUrl);
      photoId = saved.photoId;
      photoPath = saved.photoPath;
    }
    const entry: EventEntry = {
      id: generateId(),
      type: "event",
      content: input.content,
      category: input.category,
      photoId,
      photoPath,
      photoSummary: input.photoSummary,
      memo: input.memo,
      timestamp: toJstIso(input.timestamp),
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
    const nowIso = nowJstIso();
    const entry: CheckinEntry = {
      id: generateId(),
      type: "checkin",
      text,
      category: inferCategoryFromTitleAndMemo(text, ""),
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
    if (activeLog) {
      handleLinkTodoToActive(todo.id);
      setTodoManageOpen(false);
      return;
    }
    if (pendingTodoIds.length === 0) {
      setTask(todo.title);
      setTaskCategory(todo.category);
      setTaskCategoryDirty(true);
    }
    setPendingTodoIds((prev) =>
      prev.includes(todo.id) ? prev : [...prev, todo.id]
    );
    setTodoManageOpen(false);
  };

  const handleLinkTodoToActive = (todoId: string) => {
    if (!activeLog) return;
    if (activeLog.todoIds.includes(todoId)) return;
    const nowIso = nowJstIso();
    const nextIds = [...activeLog.todoIds, todoId];
    const updated: LogEntry = {
      ...activeLog,
      todoId: activeLog.todoId ?? todoId,
      todoIds: nextIds,
      todoAllocations: normalizeAllocations(nextIds, activeLog.todoAllocations),
      updatedAt: nowIso,
    };
    persist(upsertLog(logs, updated));
  };

  const handleUnlinkTodoFromActive = (todoId: string) => {
    if (!activeLog) return;
    if (!activeLog.todoIds.includes(todoId)) return;
    const nowIso = nowJstIso();
    const remaining = activeLog.todoIds.filter((id) => id !== todoId);
    const updated: LogEntry = {
      ...activeLog,
      todoId:
        activeLog.todoId === todoId ? remaining[0] ?? null : activeLog.todoId,
      todoIds: remaining,
      todoAllocations: normalizeAllocations(
        remaining,
        activeLog.todoAllocations
      ),
      updatedAt: nowIso,
    };
    persist(upsertLog(logs, updated));
  };

  const handleUnlinkPendingTodo = (todoId: string) => {
    setPendingTodoIds((prev) => prev.filter((id) => id !== todoId));
  };

  const handleTodoSubmit = (input: {
    title: string;
    memo: string;
    progress: number;
    deadline: Date | null;
    category: Category;
    important: boolean;
    alerts: TodoAlert[];
  }) => {
    const nowIso = nowJstIso();
    if (!todoForm) return;
    if (todoForm.mode === "add") {
      const entry: TodoItem = {
        id: generateId(),
        title: input.title,
        memo: input.memo,
        category: input.category,
        progress: input.progress,
        status: "open",
        deadline: input.deadline ? toJstIso(input.deadline) : null,
        createdAt: nowIso,
        updatedAt: nowIso,
        doneAt: null,
        important: input.important,
        alerts: input.alerts,
      };
      persistTodos(addTodo(todos, entry));
    } else {
      const prevAlertsById = new Map(
        todoForm.todo.alerts.map((a) => [a.id, a])
      );
      const mergedAlerts = input.alerts.map((a) => {
        const prev = prevAlertsById.get(a.id);
        if (!prev) return a;
        const sameMinutes = prev.minutesBefore === a.minutesBefore;
        return sameMinutes ? { ...a, notified: prev.notified } : a;
      });
      const updated: TodoItem = {
        ...todoForm.todo,
        title: input.title,
        memo: input.memo,
        category: input.category,
        progress: input.progress,
        deadline: input.deadline ? toJstIso(input.deadline) : null,
        updatedAt: nowIso,
        important: input.important,
        alerts: mergedAlerts,
      };
      persistTodos(updateTodo(todos, updated));
    }
    setTodoForm(null);
  };

  const handleReorderTodos = (orderedOpenIds: string[]) => {
    persistTodos(reorderOpenTodos(todos, orderedOpenIds));
  };

  const handleTodoComplete = () => {
    if (!todoForm || todoForm.mode !== "edit") return;
    persistTodos(completeTodo(todos, todoForm.todo.id));
    setTodoForm(null);
  };

  const handleTodoDelete = () => {
    if (!todoForm || todoForm.mode !== "edit") return;
    const deletedId = todoForm.todo.id;
    setPendingTodoIds((prev) => prev.filter((id) => id !== deletedId));
    const nowIso = nowJstIso();
    const nextLogs = logs.map((log) => {
      if (!log.todoIds.includes(deletedId)) return log;
      const remaining = log.todoIds.filter((id) => id !== deletedId);
      return {
        ...log,
        todoId:
          log.todoId === deletedId ? remaining[0] ?? null : log.todoId,
        todoIds: remaining,
        todoAllocations: normalizeAllocations(remaining, log.todoAllocations),
        updatedAt: nowIso,
      };
    });
    persist(nextLogs);
    persistTodos(deleteTodo(todos, deletedId));
    setTodoForm(null);
  };

  const handleDeleteDoneTodo = (id: string) => {
    const nowIso = nowJstIso();
    const nextLogs = logs.map((log) => {
      if (!log.todoIds.includes(id)) return log;
      const remaining = log.todoIds.filter((x) => x !== id);
      return {
        ...log,
        todoId: log.todoId === id ? remaining[0] ?? null : log.todoId,
        todoIds: remaining,
        todoAllocations: normalizeAllocations(remaining, log.todoAllocations),
        updatedAt: nowIso,
      };
    });
    persist(nextLogs);
    persistTodos(deleteTodo(todos, id));
  };

  const advanceFollowup = () => {
    setTodoFollowupQueue((prev) => prev.slice(1));
  };

  const handleFollowupComplete = () => {
    if (!todoFollowup) return;
    persistTodos(completeTodo(todos, todoFollowup.id));
    advanceFollowup();
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
    category: Category;
  }) => {
    if (!recurringForm) return;
    const nowIso = nowJstIso();
    let nextTemplates: RecurringTodo[];
    if (recurringForm.mode === "add") {
      const entry: RecurringTodo = {
        id: generateId(),
        title: input.title,
        memo: input.memo,
        category: input.category,
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
        category: input.category,
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

  const persistSubscriptions = useCallback((next: Subscription[]) => {
    setSubscriptions(next);
    saveSubscriptions(next);
  }, []);

  const applySubscriptionReview = useCallback(
    (subsNext: Subscription[], todosNext: TodoItem[]) => {
      const additions = generateSubscriptionReviewTodosForNow(
        subsNext,
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

  const handleSubscriptionSubmit = (input: SubscriptionSubmitInput) => {
    if (!subscriptionForm) return;
    const nowIso = nowJstIso();
    let nextSubs: Subscription[];
    if (subscriptionForm.mode === "add") {
      const entry: Subscription = {
        id: generateId(),
        serviceName: input.serviceName,
        amount: input.amount,
        paymentCycle: input.paymentCycle,
        customCycleMonths: input.customCycleMonths,
        nextRenewalAt: input.nextRenewalAt,
        contractStartedAt: input.contractStartedAt,
        paymentMethod: input.paymentMethod,
        cancelUrl: input.cancelUrl,
        memo: input.memo,
        category: input.category,
        status: input.status,
        reviewEnabled: input.reviewEnabled,
        reviewDaysBefore: input.reviewDaysBefore,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      nextSubs = addSubscription(subscriptions, entry);
    } else {
      const updated: Subscription = {
        ...subscriptionForm.item,
        serviceName: input.serviceName,
        amount: input.amount,
        paymentCycle: input.paymentCycle,
        customCycleMonths: input.customCycleMonths,
        nextRenewalAt: input.nextRenewalAt,
        contractStartedAt: input.contractStartedAt,
        paymentMethod: input.paymentMethod,
        cancelUrl: input.cancelUrl,
        memo: input.memo,
        category: input.category,
        status: input.status,
        reviewEnabled: input.reviewEnabled,
        reviewDaysBefore: input.reviewDaysBefore,
        updatedAt: nowIso,
      };
      nextSubs = updateSubscription(subscriptions, updated);
    }
    persistSubscriptions(nextSubs);
    setSubscriptionForm(null);
    applySubscriptionReview(nextSubs, todos);
  };

  const handleSubscriptionDelete = () => {
    if (!subscriptionForm || subscriptionForm.mode !== "edit") return;
    const nextSubs = deleteSubscription(
      subscriptions,
      subscriptionForm.item.id
    );
    persistSubscriptions(nextSubs);
    setSubscriptionForm(null);
  };

  const handleAdvanceSubscriptionRenewal = (id: string) => {
    const sub = subscriptions.find((s) => s.id === id);
    if (!sub) return;
    const renewal = new Date(sub.nextRenewalAt);
    if (Number.isNaN(renewal.getTime())) return;
    let monthsToAdd: number;
    if (sub.paymentCycle === "monthly") monthsToAdd = 1;
    else if (sub.paymentCycle === "yearly") monthsToAdd = 12;
    else if (sub.customCycleMonths && sub.customCycleMonths > 0)
      monthsToAdd = sub.customCycleMonths;
    else return;
    const advanced = new Date(renewal.getTime());
    advanced.setMonth(advanced.getMonth() + monthsToAdd);
    const updated: Subscription = {
      ...sub,
      nextRenewalAt: toJstIso(advanced),
      updatedAt: nowJstIso(),
    };
    const nextSubs = updateSubscription(subscriptions, updated);
    persistSubscriptions(nextSubs);
    applySubscriptionReview(nextSubs, todos);
  };

  const handleCreateSubscriptionReviewTodo = (sub: Subscription) => {
    const added = createReviewTodoManually(sub, todos);
    if (!added) {
      if (typeof window !== "undefined") {
        window.alert(
          "この更新サイクルの見直しタスクは既に存在するか、対象外です。"
        );
      }
      return;
    }
    persistTodos([...todos, added]);
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
    const nowIso = toJstIso(startedAt);
    const entry: CountdownTimer = {
      id: generateId(),
      title: input.title,
      category: inferCategoryFromTitleAndMemo(input.title, input.memo),
      memo: input.memo,
      durationMinutes: input.durationMinutes,
      startedAt: nowIso,
      dueAt: toJstIso(dueAt),
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
    const nowIso = nowJstIso();
    persistTimers(
      timers.map((t) =>
        t.id === id ? { ...t, isMinimized: true, updatedAt: nowIso } : t
      )
    );
  };

  const handleTimerExpand = (id: string) => {
    const nowIso = nowJstIso();
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
      advanceFollowup();
      return;
    }
    const nowIso = nowJstIso();
    const updated: TodoItem = {
      ...current,
      progress: input.progress,
      memo: input.memo,
      updatedAt: nowIso,
    };
    persistTodos(updateTodo(todos, updated));
    advanceFollowup();
  };

  const elapsedMs = activeLog
    ? now - new Date(activeLog.startAt).getTime()
    : 0;
  const remainingMs =
    activeLog && activeLog.plannedEndAt
      ? new Date(activeLog.plannedEndAt).getTime() - now
      : null;

  const linkedTodos = useMemo(() => {
    if (!activeLog) return [] as TodoItem[];
    return activeLog.todoIds
      .map((id) => getTodoById(todos, id))
      .filter((t): t is TodoItem => t !== null);
  }, [activeLog, todos]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex items-center justify-end gap-2 px-4 py-3">
        {mounted && (
          <button
            type="button"
            onClick={() => setCountdownFormOpen(true)}
            aria-label="カウントダウンタイマー"
            className="rounded-xl bg-slate-800 p-2 text-slate-100 hover:bg-slate-700"
          >
            <StopwatchIcon className="h-5 w-5" />
          </button>
        )}
        {mounted && (
          <button
            type="button"
            onClick={() => setTodoManageOpen(true)}
            aria-label="ToDo"
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
              {pendingTodos.length > 0 && (
                <div className="space-y-2 rounded-xl bg-sky-900/40 px-3 py-2 text-sm">
                  <p className="text-sky-300">
                    ToDo（{pendingTodos.length}件）
                  </p>
                  <ul className="space-y-1">
                    {pendingTodos.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="break-words">{t.title}</span>
                        <button
                          type="button"
                          onClick={() => handleUnlinkPendingTodo(t.id)}
                          className="shrink-0 rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700"
                        >
                          解除
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => setTodoManageOpen(true)}
                    className="w-full rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
                  >
                    ＋ さらに紐付ける
                  </button>
                </div>
              )}
              <textarea
                value={task}
                onChange={(e) => handleTaskChange(e.target.value)}
                placeholder="例: 資料作成、皿洗い、移動など"
                rows={6}
                className="w-full resize-none rounded-2xl bg-slate-800 px-4 py-4 text-lg text-white placeholder:text-slate-500"
              />
              <CategorySelect
                value={taskCategory}
                onChange={(c) => {
                  setTaskCategoryDirty(true);
                  setTaskCategory(c);
                }}
              />
              <button
                type="button"
                onClick={handleRegisterClick}
                disabled={!task.trim()}
                className="w-full rounded-2xl bg-sky-500 py-5 text-xl font-bold text-white transition disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                開始
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
              <p
                className={`mt-2 inline-block rounded px-2 py-0.5 text-xs ${CATEGORY_COLOR[activeLog.category]}`}
              >
                {activeLog.category}
              </p>
              {linkedTodos.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-sky-300">
                  {linkedTodos.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="break-words">
                        ToDo: {t.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUnlinkTodoFromActive(t.id)}
                        className="shrink-0 rounded-md bg-slate-700 px-2 py-0.5 text-[10px] text-slate-200 hover:bg-slate-600"
                      >
                        解除
                      </button>
                    </li>
                  ))}
                </ul>
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
        !backupOpen &&
        !deleteOpen &&
        !pastOpen &&
        !eventOpen &&
        !eventListOpen &&
        !editOpen &&
        !todoManageOpen &&
        !recurringManageOpen &&
        !subscriptionManageOpen &&
        !countdownFormOpen &&
        !timelineOpen && (
          <MenuModal
            onClose={() => setMenuOpen(false)}
            onExport={() => setBackupOpen(true)}
            onTimeline={() => {
              setTimelineOpen(true);
              setMenuOpen(false);
            }}
            onAddEvent={() => setEventOpen(true)}
            onListEvents={() => setEventListOpen(true)}
            onManageRecurring={() => {
              setRecurringManageOpen(true);
              setMenuOpen(false);
            }}
            onManageSubscriptions={() => {
              setSubscriptionManageOpen(true);
              setMenuOpen(false);
            }}
            onDelete={() => setDeleteOpen(true)}
          />
        )}
      {backupOpen && (
        <BackupModal
          onClose={() => setBackupOpen(false)}
          onImported={() => {
            reloadAllFromStorage();
          }}
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
          onReorder={handleReorderTodos}
          onPick={handleQuickPickTodo}
          onDeleteDone={handleDeleteDoneTodo}
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
          key={todoFollowup.id}
          todo={todoFollowup}
          onClose={advanceFollowup}
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
      {subscriptionManageOpen && !subscriptionForm && (
        <SubscriptionManageModal
          subscriptions={subscriptions}
          onClose={() => setSubscriptionManageOpen(false)}
          onAdd={() => setSubscriptionForm({ mode: "add" })}
          onEdit={(item) => setSubscriptionForm({ mode: "edit", item })}
          onAdvanceRenewal={handleAdvanceSubscriptionRenewal}
          onCreateReviewTodo={handleCreateSubscriptionReviewTodo}
        />
      )}
      {subscriptionForm && (
        <SubscriptionFormModal
          initial={
            subscriptionForm.mode === "edit" ? subscriptionForm.item : null
          }
          onClose={() => setSubscriptionForm(null)}
          onSubmit={handleSubscriptionSubmit}
          onDelete={
            subscriptionForm.mode === "edit"
              ? handleSubscriptionDelete
              : undefined
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
      {timelineOpen && (
        <EventTimelineModal
          tasks={logs}
          events={events}
          checkins={checkins}
          countdowns={timers}
          todos={todos}
          onClose={() => setTimelineOpen(false)}
          onEditTask={(log) => setEditPastLogId(log.id)}
          onAddPast={() => setPastOpen(true)}
        />
      )}
      {editPastLogId &&
        (() => {
          const target = logs.find((l) => l.id === editPastLogId);
          if (!target) return null;
          return (
            <EditPastTaskModal
              log={target}
              todos={todos}
              onClose={() => setEditPastLogId(null)}
              onConfirm={handleEditPastTaskConfirm}
            />
          );
        })()}
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

function StopwatchIcon({ className }: { className?: string }) {
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
      <line x1="10" y1="2" x2="14" y2="2" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <circle cx="12" cy="14" r="8" />
      <path d="M12 10v4l2 2" />
    </svg>
  );
}
