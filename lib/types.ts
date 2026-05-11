export type LogStatus = "active" | "completed";

export interface LogEntry {
  id: string;
  task: string;
  startAt: string;
  plannedEndAt: string | null;
  endAt: string | null;
  memo: string;
  status: LogStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EventEntry {
  id: string;
  content: string;
  photo: string | null;
  memo: string;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
}
