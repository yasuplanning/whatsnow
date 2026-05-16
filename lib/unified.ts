import type {
  CheckinEntry,
  CountdownTimer,
  LogEntry,
  TodoItem,
} from "./types";
import type { Category } from "./category";
import { diffMinutes } from "./time";

export type UnifiedKind = "log" | "checkin" | "countdown" | "todoDone";

export interface UnifiedLog {
  id: string;
  type: UnifiedKind;
  title: string;
  category: Category | null;
  startAt: string | null;
  endAt: string | null;
  scheduledEndAt: string | null;
  eventAt: string | null;
  checkinAt: string | null;
  durationMinutes: number | null;
  memo: string;
  status: string;
  photoId: string | null;
  photoPath: string | null;
  photoSummary: string | null;
  todoId: string | null;
  todoTitle: string | null;
  recurringTodoId: string | null;
  createdAt: string;
  updatedAt: string;
}

export function logToUnified(t: LogEntry): UnifiedLog {
  return {
    id: t.id,
    type: "log",
    title: t.category,
    category: t.category,
    startAt: t.startAt || null,
    endAt: t.endAt,
    scheduledEndAt: t.plannedEndAt,
    eventAt: null,
    checkinAt: null,
    durationMinutes: t.durationMinutes ?? diffMinutes(t.startAt, t.endAt),
    memo: t.memo,
    status: t.status,
    photoId: null,
    photoPath: null,
    photoSummary: null,
    todoId: t.todoIds[0] ?? t.todoId ?? null,
    todoTitle: null,
    recurringTodoId: null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export function checkinToUnified(c: CheckinEntry): UnifiedLog {
  return {
    id: c.id,
    type: "checkin",
    title: c.text,
    category: c.category,
    startAt: null,
    endAt: null,
    scheduledEndAt: null,
    eventAt: null,
    checkinAt: c.checkedAt || null,
    durationMinutes: null,
    memo: "",
    status: "",
    photoId: null,
    photoPath: null,
    photoSummary: null,
    todoId: null,
    todoTitle: null,
    recurringTodoId: null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export function countdownToUnified(c: CountdownTimer): UnifiedLog {
  return {
    id: c.id,
    type: "countdown",
    title: c.title,
    category: c.category,
    startAt: c.startedAt || null,
    endAt: c.completedAt,
    scheduledEndAt: c.dueAt || null,
    eventAt: null,
    checkinAt: null,
    durationMinutes:
      c.completedAt && c.startedAt
        ? diffMinutes(c.startedAt, c.completedAt)
        : c.durationMinutes,
    memo: c.memo,
    status: c.status,
    photoId: null,
    photoPath: null,
    photoSummary: null,
    todoId: null,
    todoTitle: null,
    recurringTodoId: null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export function todoDoneToUnified(t: TodoItem): UnifiedLog {
  return {
    id: t.id,
    type: "todoDone",
    title: t.title,
    category: t.category,
    startAt: null,
    endAt: t.doneAt,
    scheduledEndAt: t.deadline,
    eventAt: null,
    checkinAt: t.doneAt ?? t.updatedAt,
    durationMinutes: null,
    memo: t.memo,
    status: t.status,
    photoId: null,
    photoPath: null,
    photoSummary: null,
    todoId: t.id,
    todoTitle: t.title,
    recurringTodoId: t.recurringTodoId ?? null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}
