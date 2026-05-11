export type EntryType = "task" | "event" | "checkin";

export type LogStatus = "active" | "completed";

export interface LogEntry {
  id: string;
  type: "task";
  task: string;
  startAt: string;
  plannedEndAt: string | null;
  endAt: string | null;
  memo: string;
  status: LogStatus;
  createdAt: string;
  updatedAt: string;
  todoId?: string | null;
}

export interface EventEntry {
  id: string;
  type: "event";
  content: string;
  timestamp: string;
  photo: string | null;
  memo: string;
  createdAt: string;
  updatedAt: string;
  todoId?: string | null;
}

export interface CheckinEntry {
  id: string;
  type: "checkin";
  text: string;
  checkedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type TodoStatus = "open" | "done";

export interface TodoItem {
  id: string;
  title: string;
  memo: string;
  progress: number;
  status: TodoStatus;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
  doneAt: string | null;
  recurringTodoId?: string | null;
  recurringPeriodKey?: string | null;
}

export type RecurringFrequency = "monthly" | "yearly";

export interface RecurringTodo {
  id: string;
  title: string;
  memo: string;
  frequency: RecurringFrequency;
  dayOfMonth: number;
  monthOfYear: number | null;
  deadlineDays: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}
