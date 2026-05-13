import type { Category } from "./category";

export type EntryType = "task" | "event" | "checkin";

export type LogStatus = "active" | "completed";

export interface LogEntry {
  id: string;
  type: "task";
  task: string;
  category: Category;
  startAt: string;
  plannedEndAt: string | null;
  endAt: string | null;
  durationMinutes: number | null;
  memo: string;
  status: LogStatus;
  createdAt: string;
  updatedAt: string;
  todoId?: string | null;
  todoIds: string[];
}

export interface EventEntry {
  id: string;
  type: "event";
  content: string;
  category: Category;
  timestamp: string;
  photoId: string | null;
  photoPath: string | null;
  photoSummary: string | null;
  memo: string;
  createdAt: string;
  updatedAt: string;
  todoId?: string | null;
}

export interface CheckinEntry {
  id: string;
  type: "checkin";
  text: string;
  category: Category;
  checkedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type CountdownTimerStatus = "active" | "done" | "cancelled";

export interface CountdownTimer {
  id: string;
  title: string;
  category: Category;
  memo: string;
  durationMinutes: number;
  startedAt: string;
  dueAt: string;
  completedAt: string | null;
  status: CountdownTimerStatus;
  isMinimized: boolean;
  notified: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RecurringFrequency = "monthly" | "yearly";

export interface RecurringTodo {
  id: string;
  title: string;
  memo: string;
  category: Category;
  frequency: RecurringFrequency;
  dayOfMonth: number;
  monthOfYear: number | null;
  deadlineDays: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TodoStatus = "open" | "done";

export interface TodoItem {
  id: string;
  title: string;
  memo: string;
  category: Category;
  progress: number;
  status: TodoStatus;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
  doneAt: string | null;
  recurringTodoId?: string | null;
  recurringPeriodKey?: string | null;
  subscriptionId?: string | null;
  subscriptionPeriodKey?: string | null;
}

export type PaymentCycle = "monthly" | "yearly" | "other";

export type SubscriptionStatus =
  | "active"
  | "considering"
  | "scheduled_cancel"
  | "cancelled";

export interface Subscription {
  id: string;
  serviceName: string;
  amount: number;
  paymentCycle: PaymentCycle;
  customCycleMonths: number | null;
  nextRenewalAt: string;
  contractStartedAt: string | null;
  paymentMethod: string;
  cancelUrl: string;
  memo: string;
  category: Category;
  status: SubscriptionStatus;
  reviewEnabled: boolean;
  reviewDaysBefore: number;
  createdAt: string;
  updatedAt: string;
}
