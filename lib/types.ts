import type { Category } from "./category";

export type EntryType = "log" | "checkin";

export type LogStatus = "active" | "completed";

export interface TodoAllocation {
  todoId: string;
  ratio: number;
}

export interface LogEntry {
  id: string;
  type: "log";
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
  deductionMinutes: number;
  todoAllocations: TodoAllocation[];
  photoIds: string[];
  // Entity-level optimistic locking metadata. Existing records lack these
  // fields; readers must treat missing values as version=1 and not-deleted.
  version?: number;
  deletedAt?: string | null;
  deletedByDevice?: string | null;
}

export interface CheckinEntry {
  id: string;
  type: "checkin";
  text: string;
  category: Category;
  subcategory: string | null;
  checkedAt: string;
  createdAt: string;
  updatedAt: string;
  version?: number;
  deletedAt?: string | null;
  deletedByDevice?: string | null;
}

export type CountdownTimerStatus = "active" | "done" | "cancelled";

export interface CountdownTimer {
  id: string;
  title: string;
  category: Category;
  subcategory: string | null;
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
  version?: number;
  deletedAt?: string | null;
  deletedByDevice?: string | null;
}

export type RecurringFrequency = "monthly" | "yearly";

export interface RecurringTodo {
  id: string;
  title: string;
  memo: string;
  category: Category;
  subcategory: string | null;
  frequency: RecurringFrequency;
  dayOfMonth: number;
  monthOfYear: number | null;
  deadlineDays: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  version?: number;
  deletedAt?: string | null;
  deletedByDevice?: string | null;
}

export type TodoStatus = "open" | "done";

export interface TodoAlert {
  id: string;
  minutesBefore: number;
  notified: boolean;
}

export interface TodoItem {
  id: string;
  title: string;
  memo: string;
  category: Category;
  subcategory: string | null;
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
  important: boolean;
  alerts: TodoAlert[];
  version?: number;
  deletedAt?: string | null;
  deletedByDevice?: string | null;
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
  subcategory: string | null;
  status: SubscriptionStatus;
  reviewEnabled: boolean;
  reviewDaysBefore: number;
  createdAt: string;
  updatedAt: string;
  version?: number;
  deletedAt?: string | null;
  deletedByDevice?: string | null;
}
