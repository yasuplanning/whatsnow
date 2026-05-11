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
}

export interface CheckinEntry {
  id: string;
  type: "checkin";
  text: string;
  checkedAt: string;
  createdAt: string;
  updatedAt: string;
}
