import type {
  CheckinEntry,
  CountdownTimer,
  EventEntry,
  LogEntry,
  RecurringTodo,
  TodoItem,
} from "./types";

const STORAGE_KEY = "whatsnow.logs.v1";
const EVENT_STORAGE_KEY = "whatsnow.events.v1";
const CHECKIN_STORAGE_KEY = "whatsnow.checkins.v1";
const LAST_ACTIVITY_KEY = "whatsnow.lastActivityAt.v1";
const TODO_STORAGE_KEY = "whatsnow.todos.v1";
const RECURRING_TODO_STORAGE_KEY = "whatsnow.recurringTodos.v1";
const COUNTDOWN_STORAGE_KEY = "whatsnow.countdowns.v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadLogs(): LogEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      ...item,
      type: "task" as const,
      todoId: item?.todoId ?? null,
    })) as LogEntry[];
  } catch {
    return [];
  }
}

export function saveLogs(logs: LogEntry[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch {
    // ignore quota errors
  }
}

export function findActiveLog(logs: LogEntry[]): LogEntry | null {
  return logs.find((l) => l.status === "active") ?? null;
}

export function upsertLog(logs: LogEntry[], entry: LogEntry): LogEntry[] {
  const idx = logs.findIndex((l) => l.id === entry.id);
  if (idx === -1) return [...logs, entry];
  const next = logs.slice();
  next[idx] = entry;
  return next;
}

export function clearAllLogs(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function loadEvents(): EventEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(EVENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      ...item,
      type: "event" as const,
      todoId: item?.todoId ?? null,
    })) as EventEntry[];
  } catch {
    return [];
  }
}

export function saveEvents(events: EventEntry[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(events));
  } catch {
    // ignore quota errors
  }
}

export function upsertEvent(events: EventEntry[], entry: EventEntry): EventEntry[] {
  const idx = events.findIndex((e) => e.id === entry.id);
  if (idx === -1) return [...events, entry];
  const next = events.slice();
  next[idx] = entry;
  return next;
}

export function removeEvent(events: EventEntry[], id: string): EventEntry[] {
  return events.filter((e) => e.id !== id);
}

export function clearAllEvents(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(EVENT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function loadCheckins(): CheckinEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(CHECKIN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({ ...item, type: "checkin" as const })) as CheckinEntry[];
  } catch {
    return [];
  }
}

export function saveCheckins(checkins: CheckinEntry[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(CHECKIN_STORAGE_KEY, JSON.stringify(checkins));
  } catch {
    // ignore quota errors
  }
}

export function upsertCheckin(checkins: CheckinEntry[], entry: CheckinEntry): CheckinEntry[] {
  const idx = checkins.findIndex((c) => c.id === entry.id);
  if (idx === -1) return [...checkins, entry];
  const next = checkins.slice();
  next[idx] = entry;
  return next;
}

export function removeCheckin(checkins: CheckinEntry[], id: string): CheckinEntry[] {
  return checkins.filter((c) => c.id !== id);
}

export function clearAllCheckins(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(CHECKIN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function loadLastActivityAt(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(LAST_ACTIVITY_KEY);
  } catch {
    return null;
  }
}

export function saveLastActivityAt(iso: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(LAST_ACTIVITY_KEY, iso);
  } catch {
    // ignore
  }
}

export function clearLastActivityAt(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch {
    // ignore
  }
}

export function getTodos(): TodoItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(TODO_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      ...item,
      deadline: item?.deadline ?? null,
      recurringTodoId: item?.recurringTodoId ?? null,
      recurringPeriodKey: item?.recurringPeriodKey ?? null,
    })) as TodoItem[];
  } catch {
    return [];
  }
}

export function saveTodos(todos: TodoItem[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos));
  } catch {
    // ignore
  }
}

export function addTodo(todos: TodoItem[], item: TodoItem): TodoItem[] {
  return [...todos, item];
}

export function updateTodo(todos: TodoItem[], item: TodoItem): TodoItem[] {
  const idx = todos.findIndex((t) => t.id === item.id);
  if (idx === -1) return [...todos, item];
  const next = todos.slice();
  next[idx] = item;
  return next;
}

export function deleteTodo(todos: TodoItem[], id: string): TodoItem[] {
  return todos.filter((t) => t.id !== id);
}

export function completeTodo(todos: TodoItem[], id: string): TodoItem[] {
  const nowIso = new Date().toISOString();
  return todos.map((t) =>
    t.id === id
      ? {
          ...t,
          status: "done" as const,
          progress: 100,
          doneAt: nowIso,
          updatedAt: nowIso,
        }
      : t
  );
}

export function getTodoById(todos: TodoItem[], id: string): TodoItem | null {
  return todos.find((t) => t.id === id) ?? null;
}

function swapTodosByIds(
  todos: TodoItem[],
  idA: string,
  idB: string
): TodoItem[] {
  const next = todos.slice();
  const i = next.findIndex((t) => t.id === idA);
  const j = next.findIndex((t) => t.id === idB);
  if (i === -1 || j === -1) return todos;
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function moveTodoUp(todos: TodoItem[], id: string): TodoItem[] {
  const openIds = todos.filter((t) => t.status === "open").map((t) => t.id);
  const idx = openIds.indexOf(id);
  if (idx <= 0) return todos;
  return swapTodosByIds(todos, id, openIds[idx - 1]);
}

export function moveTodoDown(todos: TodoItem[], id: string): TodoItem[] {
  const openIds = todos.filter((t) => t.status === "open").map((t) => t.id);
  const idx = openIds.indexOf(id);
  if (idx === -1 || idx === openIds.length - 1) return todos;
  return swapTodosByIds(todos, id, openIds[idx + 1]);
}

export function getRecurringTodos(): RecurringTodo[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(RECURRING_TODO_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as RecurringTodo[];
  } catch {
    return [];
  }
}

export function saveRecurringTodos(items: RecurringTodo[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(
      RECURRING_TODO_STORAGE_KEY,
      JSON.stringify(items)
    );
  } catch {
    // ignore
  }
}

export function addRecurringTodo(
  items: RecurringTodo[],
  item: RecurringTodo
): RecurringTodo[] {
  return [...items, item];
}

export function updateRecurringTodo(
  items: RecurringTodo[],
  item: RecurringTodo
): RecurringTodo[] {
  const idx = items.findIndex((t) => t.id === item.id);
  if (idx === -1) return [...items, item];
  const next = items.slice();
  next[idx] = item;
  return next;
}

export function deleteRecurringTodo(
  items: RecurringTodo[],
  id: string
): RecurringTodo[] {
  return items.filter((t) => t.id !== id);
}

export function getRecurringTodoById(
  items: RecurringTodo[],
  id: string
): RecurringTodo | null {
  return items.find((t) => t.id === id) ?? null;
}

export function clearAllRecurringTodos(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(RECURRING_TODO_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function getCountdownTimers(): CountdownTimer[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(COUNTDOWN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CountdownTimer[];
  } catch {
    return [];
  }
}

export function saveCountdownTimers(items: CountdownTimer[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(COUNTDOWN_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function addCountdownTimer(
  items: CountdownTimer[],
  item: CountdownTimer
): CountdownTimer[] {
  return [...items, item];
}

export function updateCountdownTimer(
  items: CountdownTimer[],
  item: CountdownTimer
): CountdownTimer[] {
  const idx = items.findIndex((t) => t.id === item.id);
  if (idx === -1) return [...items, item];
  const next = items.slice();
  next[idx] = item;
  return next;
}

export function completeCountdownTimer(
  items: CountdownTimer[],
  id: string
): CountdownTimer[] {
  const nowIso = new Date().toISOString();
  return items.map((t) =>
    t.id === id
      ? {
          ...t,
          status: "done" as const,
          completedAt: nowIso,
          updatedAt: nowIso,
        }
      : t
  );
}

export function cancelCountdownTimer(
  items: CountdownTimer[],
  id: string
): CountdownTimer[] {
  const nowIso = new Date().toISOString();
  return items.map((t) =>
    t.id === id
      ? {
          ...t,
          status: "cancelled" as const,
          completedAt: nowIso,
          updatedAt: nowIso,
        }
      : t
  );
}

export function getActiveCountdownTimers(
  items: CountdownTimer[]
): CountdownTimer[] {
  return items.filter((t) => t.status === "active");
}

export function clearAllCountdownTimers(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(COUNTDOWN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function clearAllTodos(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(TODO_STORAGE_KEY);
  } catch {
    // ignore
  }
}
