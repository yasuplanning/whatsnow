import type {
  CheckinEntry,
  CountdownTimer,
  LogEntry,
  PaymentCycle,
  RecurringTodo,
  Subscription,
  SubscriptionStatus,
  TodoItem,
} from "../types";
import {
  type CategoryDefinition,
  getDefaultCategories,
  inferCategoryFromTitleAndMemo,
  normalizeCategory,
} from "../category";
import { diffMinutes, migrateIsoToJst } from "../time";

const STORAGE_KEY = "whatsnow.logs.v1";
const CHECKIN_STORAGE_KEY = "whatsnow.checkins.v1";
const LAST_ACTIVITY_KEY = "whatsnow.lastActivityAt.v1";
const TODO_STORAGE_KEY = "whatsnow.todos.v1";
const RECURRING_TODO_STORAGE_KEY = "whatsnow.recurringTodos.v1";
const COUNTDOWN_STORAGE_KEY = "whatsnow.countdowns.v1";
const SUBSCRIPTION_STORAGE_KEY = "whatsnow.subscriptions.v1";
const PHOTO_STORAGE_KEY = "whatsnow.photos.v1";
const CATEGORY_STORAGE_KEY = "whatsnow.categories.v1";
const BACKUP_KEY = "whatsnow.backup.preMigration.v1";

// In S3-mode the index layer disables this so reading does not trigger a PUT
// that would race other devices and burn version numbers.
let shouldWriteBackOnRead = true;
export function setShouldWriteBackOnRead(value: boolean): void {
  shouldWriteBackOnRead = value;
}

function readSubcategory(raw: any): string | null {
  return typeof raw?.subcategory === "string" && raw.subcategory !== ""
    ? raw.subcategory
    : null;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

let backupAttempted = false;
function ensureBackup(): void {
  if (backupAttempted) return;
  backupAttempted = true;
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem("whatsnow.events.v1");
  } catch {
    // ignore
  }
  try {
    if (window.localStorage.getItem(BACKUP_KEY)) return;
    const snapshot = {
      at: new Date().toISOString(),
      logs: window.localStorage.getItem(STORAGE_KEY),
      checkins: window.localStorage.getItem(CHECKIN_STORAGE_KEY),
      countdowns: window.localStorage.getItem(COUNTDOWN_STORAGE_KEY),
      todos: window.localStorage.getItem(TODO_STORAGE_KEY),
      recurring: window.localStorage.getItem(RECURRING_TODO_STORAGE_KEY),
      subscriptions: window.localStorage.getItem(SUBSCRIPTION_STORAGE_KEY),
    };
    const anyPresent =
      snapshot.logs ||
      snapshot.checkins ||
      snapshot.countdowns ||
      snapshot.todos ||
      snapshot.recurring ||
      snapshot.subscriptions;
    if (!anyPresent) return;
    window.localStorage.setItem(BACKUP_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore quota errors
  }
}

function readArray<T>(key: string): T[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as T[];
  } catch {
    return [];
  }
}

function writeArray<T>(key: string, items: T[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function loadAndMigrate<T>(
  key: string,
  migrate: (item: any) => T
): T[] {
  if (!isBrowser()) return [];
  ensureBackup();
  const raw = readArray<any>(key);
  if (raw.length === 0) return [];
  const migrated = raw.map(migrate);
  if (shouldWriteBackOnRead) {
    const before = JSON.stringify(raw);
    const after = JSON.stringify(migrated);
    if (before !== after) {
      writeArray(key, migrated);
    }
  }
  return migrated;
}

function readPhotoMap(): Record<string, string> {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(PHOTO_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

function writePhotoMap(map: Record<string, string>): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(map));
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

export function savePhoto(dataUrl: string): { photoId: string; photoPath: string } {
  const photoId = generateId();
  const map = readPhotoMap();
  map[photoId] = dataUrl;
  writePhotoMap(map);
  return { photoId, photoPath: `local://photos/${photoId}` };
}

export function getPhotoDataUrl(photoId: string | null | undefined): string | null {
  if (!photoId) return null;
  const map = readPhotoMap();
  return map[photoId] ?? null;
}

export function getAllPhotos(): Record<string, string> {
  return readPhotoMap();
}

export function setAllPhotos(map: Record<string, string>): void {
  writePhotoMap(map);
}

export function setPhotoCache(photoId: string, dataUrl: string): void {
  const map = readPhotoMap();
  map[photoId] = dataUrl;
  writePhotoMap(map);
}

export function removePhoto(photoId: string | null | undefined): void {
  if (!photoId) return;
  const map = readPhotoMap();
  if (photoId in map) {
    delete map[photoId];
    writePhotoMap(map);
  }
}

function migrateLogEntry(raw: any): LogEntry {
  const startAt = migrateIsoToJst(raw?.startAt) ?? "";
  const plannedEndAt = migrateIsoToJst(raw?.plannedEndAt);
  const endAt = migrateIsoToJst(raw?.endAt);
  const createdAt = migrateIsoToJst(raw?.createdAt) ?? startAt;
  const updatedAt = migrateIsoToJst(raw?.updatedAt) ?? createdAt;
  const memo = typeof raw?.memo === "string" ? raw.memo : "";
  const status = raw?.status === "completed" ? "completed" : "active";
  const category =
    raw?.category !== undefined
      ? normalizeCategory(raw.category)
      : inferCategoryFromTitleAndMemo("", memo);
  const existingDuration =
    typeof raw?.durationMinutes === "number" ? raw.durationMinutes : null;
  const durationMinutes =
    existingDuration !== null ? existingDuration : diffMinutes(startAt, endAt);
  const todoId: string | null = raw?.todoId ?? null;
  const rawTodoIds = Array.isArray(raw?.todoIds)
    ? raw.todoIds.filter((v: unknown): v is string => typeof v === "string")
    : null;
  let todoIds: string[];
  if (rawTodoIds && rawTodoIds.length > 0) {
    todoIds = Array.from(new Set(rawTodoIds));
  } else if (todoId) {
    todoIds = [todoId];
  } else {
    todoIds = [];
  }
  const deductionMinutes =
    typeof raw?.deductionMinutes === "number" &&
    Number.isFinite(raw.deductionMinutes)
      ? Math.max(0, Math.floor(raw.deductionMinutes))
      : 0;
  const rawAllocations = Array.isArray(raw?.todoAllocations)
    ? raw.todoAllocations
    : [];
  const todoAllocations = rawAllocations
    .map((a: any) => {
      const aTodoId = typeof a?.todoId === "string" ? a.todoId : null;
      const ratio =
        typeof a?.ratio === "number" && Number.isFinite(a.ratio)
          ? Math.max(0, Math.floor(a.ratio))
          : null;
      if (!aTodoId || ratio === null) return null;
      if (!todoIds.includes(aTodoId)) return null;
      return { todoId: aTodoId, ratio };
    })
    .filter(
      (a: { todoId: string; ratio: number } | null): a is { todoId: string; ratio: number } =>
        a !== null
    );
  const photoIds = Array.isArray(raw?.photoIds)
    ? raw.photoIds.filter((v: unknown): v is string => typeof v === "string")
    : [];
  return {
    id: typeof raw?.id === "string" ? raw.id : generateId(),
    type: "log",
    category,
    startAt,
    plannedEndAt,
    endAt,
    durationMinutes,
    memo,
    status,
    createdAt,
    updatedAt,
    todoId,
    todoIds,
    deductionMinutes,
    todoAllocations,
    photoIds,
  };
}

function migrateCheckinEntry(raw: any): CheckinEntry {
  const checkedAt = migrateIsoToJst(raw?.checkedAt) ?? "";
  const createdAt = migrateIsoToJst(raw?.createdAt) ?? checkedAt;
  const updatedAt = migrateIsoToJst(raw?.updatedAt) ?? createdAt;
  const text = typeof raw?.text === "string" ? raw.text : "";
  const category =
    raw?.category !== undefined
      ? normalizeCategory(raw.category)
      : inferCategoryFromTitleAndMemo(text, "");
  return {
    id: typeof raw?.id === "string" ? raw.id : generateId(),
    type: "checkin",
    text,
    category,
    subcategory: readSubcategory(raw),
    checkedAt,
    createdAt,
    updatedAt,
  };
}

function migrateCountdownTimer(raw: any): CountdownTimer {
  const startedAt = migrateIsoToJst(raw?.startedAt) ?? "";
  const dueAt = migrateIsoToJst(raw?.dueAt) ?? "";
  const completedAt = migrateIsoToJst(raw?.completedAt);
  const createdAt = migrateIsoToJst(raw?.createdAt) ?? startedAt;
  const updatedAt = migrateIsoToJst(raw?.updatedAt) ?? createdAt;
  const title = typeof raw?.title === "string" ? raw.title : "";
  const memo = typeof raw?.memo === "string" ? raw.memo : "";
  const category =
    raw?.category !== undefined
      ? normalizeCategory(raw.category)
      : inferCategoryFromTitleAndMemo(title, memo);
  const durationMinutes =
    typeof raw?.durationMinutes === "number" ? raw.durationMinutes : 0;
  const status =
    raw?.status === "done" || raw?.status === "cancelled" ? raw.status : "active";
  return {
    id: typeof raw?.id === "string" ? raw.id : generateId(),
    title,
    category,
    subcategory: readSubcategory(raw),
    memo,
    durationMinutes,
    startedAt,
    dueAt,
    completedAt,
    status,
    isMinimized: !!raw?.isMinimized,
    notified: !!raw?.notified,
    createdAt,
    updatedAt,
  };
}

function migrateTodoItem(raw: any): TodoItem {
  const deadline = migrateIsoToJst(raw?.deadline);
  const createdAt = migrateIsoToJst(raw?.createdAt) ?? "";
  const updatedAt = migrateIsoToJst(raw?.updatedAt) ?? createdAt;
  const doneAt = migrateIsoToJst(raw?.doneAt);
  const title = typeof raw?.title === "string" ? raw.title : "";
  const memo = typeof raw?.memo === "string" ? raw.memo : "";
  const category =
    raw?.category !== undefined
      ? normalizeCategory(raw.category)
      : inferCategoryFromTitleAndMemo(title, memo);
  const rawAlerts = Array.isArray(raw?.alerts) ? raw.alerts : [];
  const alerts = rawAlerts
    .map((a: any) => {
      const minutesBefore =
        typeof a?.minutesBefore === "number" && Number.isFinite(a.minutesBefore)
          ? Math.max(0, Math.floor(a.minutesBefore))
          : null;
      if (minutesBefore === null) return null;
      return {
        id: typeof a?.id === "string" ? a.id : generateId(),
        minutesBefore,
        notified: a?.notified === true,
      };
    })
    .filter((a: any): a is NonNullable<typeof a> => a !== null)
    .slice(0, 3);
  const rawProgress = typeof raw?.progress === "number" ? raw.progress : 0;
  const status: "open" | "done" =
    raw?.status === "done" || rawProgress >= 100 ? "done" : "open";
  const progress = status === "done" ? 100 : Math.max(0, Math.min(90, rawProgress));
  return {
    id: typeof raw?.id === "string" ? raw.id : generateId(),
    title,
    memo,
    category,
    subcategory: readSubcategory(raw),
    progress,
    status,
    deadline,
    createdAt,
    updatedAt,
    doneAt: status === "done" ? doneAt ?? updatedAt : null,
    recurringTodoId: raw?.recurringTodoId ?? null,
    recurringPeriodKey: raw?.recurringPeriodKey ?? null,
    subscriptionId: raw?.subscriptionId ?? null,
    subscriptionPeriodKey: raw?.subscriptionPeriodKey ?? null,
    important: raw?.important === true,
    alerts,
  };
}

function migrateSubscription(raw: any): Subscription {
  const createdAt = migrateIsoToJst(raw?.createdAt) ?? "";
  const updatedAt = migrateIsoToJst(raw?.updatedAt) ?? createdAt;
  const nextRenewalAt = migrateIsoToJst(raw?.nextRenewalAt) ?? "";
  const contractStartedAt = migrateIsoToJst(raw?.contractStartedAt);
  const serviceName =
    typeof raw?.serviceName === "string" ? raw.serviceName : "";
  const memo = typeof raw?.memo === "string" ? raw.memo : "";
  const category =
    raw?.category !== undefined
      ? normalizeCategory(raw.category)
      : inferCategoryFromTitleAndMemo(serviceName, memo);
  const paymentCycle: PaymentCycle =
    raw?.paymentCycle === "yearly" || raw?.paymentCycle === "other"
      ? raw.paymentCycle
      : "monthly";
  const status: SubscriptionStatus =
    raw?.status === "considering" ||
    raw?.status === "scheduled_cancel" ||
    raw?.status === "cancelled"
      ? raw.status
      : "active";
  const subcategory = readSubcategory(raw);
  return {
    id: typeof raw?.id === "string" ? raw.id : generateId(),
    serviceName,
    amount:
      typeof raw?.amount === "number" && Number.isFinite(raw.amount)
        ? Math.floor(raw.amount)
        : 0,
    paymentCycle,
    customCycleMonths:
      typeof raw?.customCycleMonths === "number" &&
      Number.isFinite(raw.customCycleMonths)
        ? raw.customCycleMonths
        : null,
    nextRenewalAt,
    contractStartedAt,
    paymentMethod:
      typeof raw?.paymentMethod === "string" ? raw.paymentMethod : "",
    cancelUrl: typeof raw?.cancelUrl === "string" ? raw.cancelUrl : "",
    memo,
    category,
    subcategory,
    status,
    reviewEnabled: raw?.reviewEnabled === true,
    reviewDaysBefore:
      typeof raw?.reviewDaysBefore === "number"
        ? Math.max(0, Math.floor(raw.reviewDaysBefore))
        : 7,
    createdAt,
    updatedAt,
  };
}

function migrateRecurring(raw: any): RecurringTodo {
  const createdAt = migrateIsoToJst(raw?.createdAt) ?? "";
  const updatedAt = migrateIsoToJst(raw?.updatedAt) ?? createdAt;
  const title = typeof raw?.title === "string" ? raw.title : "";
  const memo = typeof raw?.memo === "string" ? raw.memo : "";
  const category =
    raw?.category !== undefined
      ? normalizeCategory(raw.category)
      : inferCategoryFromTitleAndMemo(title, memo);
  return {
    id: typeof raw?.id === "string" ? raw.id : generateId(),
    title,
    memo,
    category,
    subcategory: readSubcategory(raw),
    frequency: raw?.frequency === "yearly" ? "yearly" : "monthly",
    dayOfMonth: typeof raw?.dayOfMonth === "number" ? raw.dayOfMonth : 1,
    monthOfYear: typeof raw?.monthOfYear === "number" ? raw.monthOfYear : null,
    deadlineDays:
      typeof raw?.deadlineDays === "number" ? raw.deadlineDays : 0,
    enabled: raw?.enabled !== false,
    createdAt,
    updatedAt,
  };
}

export function loadLogs(): LogEntry[] {
  return loadAndMigrate<LogEntry>(STORAGE_KEY, migrateLogEntry);
}

export function saveLogs(logs: LogEntry[]): void {
  writeArray(STORAGE_KEY, logs);
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

export function loadCheckins(): CheckinEntry[] {
  return loadAndMigrate<CheckinEntry>(CHECKIN_STORAGE_KEY, migrateCheckinEntry);
}

export function saveCheckins(checkins: CheckinEntry[]): void {
  writeArray(CHECKIN_STORAGE_KEY, checkins);
}

export function upsertCheckin(
  checkins: CheckinEntry[],
  entry: CheckinEntry
): CheckinEntry[] {
  const idx = checkins.findIndex((c) => c.id === entry.id);
  if (idx === -1) return [...checkins, entry];
  const next = checkins.slice();
  next[idx] = entry;
  return next;
}

export function removeCheckin(
  checkins: CheckinEntry[],
  id: string
): CheckinEntry[] {
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
  return loadAndMigrate<TodoItem>(TODO_STORAGE_KEY, migrateTodoItem);
}

export function saveTodos(todos: TodoItem[]): void {
  writeArray(TODO_STORAGE_KEY, todos);
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

export function reorderOpenTodos(
  todos: TodoItem[],
  orderedOpenIds: string[]
): TodoItem[] {
  const openById = new Map<string, TodoItem>();
  for (const t of todos) {
    if (t.status === "open") openById.set(t.id, t);
  }
  const reorderedOpen: TodoItem[] = [];
  const used = new Set<string>();
  for (const id of orderedOpenIds) {
    const found = openById.get(id);
    if (found && !used.has(id)) {
      reorderedOpen.push(found);
      used.add(id);
    }
  }
  for (const t of todos) {
    if (t.status === "open" && !used.has(t.id)) {
      reorderedOpen.push(t);
      used.add(t.id);
    }
  }
  const result: TodoItem[] = [];
  let openCursor = 0;
  for (const t of todos) {
    if (t.status === "open") {
      result.push(reorderedOpen[openCursor]);
      openCursor += 1;
    } else {
      result.push(t);
    }
  }
  return result;
}

export function clearAllTodos(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(TODO_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function getRecurringTodos(): RecurringTodo[] {
  return loadAndMigrate<RecurringTodo>(RECURRING_TODO_STORAGE_KEY, migrateRecurring);
}

export function saveRecurringTodos(items: RecurringTodo[]): void {
  writeArray(RECURRING_TODO_STORAGE_KEY, items);
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
  return loadAndMigrate<CountdownTimer>(
    COUNTDOWN_STORAGE_KEY,
    migrateCountdownTimer
  );
}

export function saveCountdownTimers(items: CountdownTimer[]): void {
  writeArray(COUNTDOWN_STORAGE_KEY, items);
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

export function getSubscriptions(): Subscription[] {
  return loadAndMigrate<Subscription>(
    SUBSCRIPTION_STORAGE_KEY,
    migrateSubscription
  );
}

export function saveSubscriptions(items: Subscription[]): void {
  writeArray(SUBSCRIPTION_STORAGE_KEY, items);
}

export function addSubscription(
  items: Subscription[],
  item: Subscription
): Subscription[] {
  return [...items, item];
}

export function updateSubscription(
  items: Subscription[],
  item: Subscription
): Subscription[] {
  const idx = items.findIndex((s) => s.id === item.id);
  if (idx === -1) return [...items, item];
  const next = items.slice();
  next[idx] = item;
  return next;
}

export function deleteSubscription(
  items: Subscription[],
  id: string
): Subscription[] {
  return items.filter((s) => s.id !== id);
}

export function clearAllSubscriptions(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(SUBSCRIPTION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function clearAllPhotos(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(PHOTO_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function migrateCategoryDefinition(raw: any): CategoryDefinition | null {
  if (!raw || typeof raw !== "object") return null;
  const name = typeof raw?.name === "string" ? raw.name : "";
  if (!name) return null;
  const id =
    typeof raw?.id === "string" && raw.id !== "" ? raw.id : `cat-${name}`;
  const color =
    typeof raw?.color === "string" && raw.color !== ""
      ? raw.color
      : "bg-slate-200 text-slate-800";
  const builtin = raw?.builtin === true;
  const subcategories = Array.isArray(raw?.subcategories)
    ? raw.subcategories.filter(
        (s: unknown): s is string => typeof s === "string" && s !== ""
      )
    : [];
  return { id, name, color, builtin, subcategories };
}

export function getCategoriesFromStorage(): CategoryDefinition[] {
  if (!isBrowser()) return getDefaultCategories();
  ensureBackup();
  let raw: unknown;
  try {
    const text = window.localStorage.getItem(CATEGORY_STORAGE_KEY);
    raw = text ? JSON.parse(text) : null;
  } catch {
    raw = null;
  }
  if (!Array.isArray(raw)) {
    const defaults = getDefaultCategories();
    if (shouldWriteBackOnRead) saveCategories(defaults);
    return defaults;
  }
  const migrated: CategoryDefinition[] = [];
  for (const item of raw) {
    const def = migrateCategoryDefinition(item);
    if (def) migrated.push(def);
  }
  if (migrated.length === 0) {
    const defaults = getDefaultCategories();
    if (shouldWriteBackOnRead) saveCategories(defaults);
    return defaults;
  }
  if (!migrated.some((c) => c.name === "その他")) {
    migrated.push({
      id: "builtin-その他",
      name: "その他",
      color: "bg-slate-200 text-slate-800",
      builtin: true,
      subcategories: [],
    });
  }
  return migrated;
}

export function saveCategories(items: CategoryDefinition[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function clearAllCategories(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(CATEGORY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export type { BackupSnapshot } from "./types";

export function restoreAllData(snapshot: import("./types").BackupSnapshot): void {
  if (!isBrowser()) return;
  saveLogs(snapshot.logs);
  saveCheckins(snapshot.checkins);
  saveTodos(snapshot.todos);
  saveRecurringTodos(snapshot.recurringTodos);
  saveCountdownTimers(snapshot.countdowns);
  saveSubscriptions(snapshot.subscriptions);
  if (snapshot.categories && snapshot.categories.length > 0) {
    saveCategories(snapshot.categories);
  }
  setAllPhotos(snapshot.photos);
  if (snapshot.lastActivityAt) {
    saveLastActivityAt(snapshot.lastActivityAt);
  } else {
    clearLastActivityAt();
  }
}
