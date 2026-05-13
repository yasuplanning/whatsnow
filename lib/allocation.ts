import type { LogEntry, TodoAllocation } from "./types";
import { diffMinutes } from "./time";

export function getDurationMinutes(log: LogEntry): number {
  if (
    typeof log.durationMinutes === "number" &&
    Number.isFinite(log.durationMinutes)
  ) {
    return Math.max(0, Math.floor(log.durationMinutes));
  }
  const calc = diffMinutes(log.startAt, log.endAt);
  return calc !== null ? Math.max(0, calc) : 0;
}

export function getNetMinutes(log: LogEntry): number {
  const duration = getDurationMinutes(log);
  const deduction = Math.max(0, Math.floor(log.deductionMinutes ?? 0));
  return Math.max(0, duration - deduction);
}

export function normalizeAllocations(
  todoIds: string[],
  current: TodoAllocation[]
): TodoAllocation[] {
  const currentMap = new Map<string, number>();
  for (const a of current) {
    if (typeof a?.todoId !== "string") continue;
    const ratio =
      typeof a?.ratio === "number" && Number.isFinite(a.ratio)
        ? Math.max(0, Math.floor(a.ratio))
        : 1;
    currentMap.set(a.todoId, ratio);
  }
  const result: TodoAllocation[] = [];
  for (const id of todoIds) {
    if (currentMap.has(id)) {
      result.push({ todoId: id, ratio: currentMap.get(id) as number });
    } else {
      result.push({ todoId: id, ratio: 1 });
    }
  }
  return result;
}

function effectiveAllocations(log: LogEntry): TodoAllocation[] {
  const todoIds = log.todoIds ?? [];
  if (todoIds.length === 0) return [];
  const stored = log.todoAllocations ?? [];
  if (stored.length > 0) return stored;
  return todoIds.map((id) => ({ todoId: id, ratio: 1 }));
}

export function getAllocationMinutes(log: LogEntry, todoId: string): number {
  const todoIds = log.todoIds ?? [];
  if (!todoIds.includes(todoId)) return 0;
  const net = getNetMinutes(log);
  if (net === 0) return 0;
  const allocations = effectiveAllocations(log);
  const totalRatio = allocations.reduce(
    (sum, a) => sum + Math.max(0, a.ratio),
    0
  );
  if (totalRatio === 0) return 0;
  const target = allocations.find((a) => a.todoId === todoId);
  if (!target) return 0;
  return Math.floor((net * Math.max(0, target.ratio)) / totalRatio);
}

export function getTotalAllocatedMinutes(
  logs: LogEntry[],
  todoId: string
): number {
  let total = 0;
  for (const log of logs) {
    total += getAllocationMinutes(log, todoId);
  }
  return total;
}

export function countContributingTasks(
  logs: LogEntry[],
  todoId: string
): number {
  let count = 0;
  for (const log of logs) {
    if (!(log.todoIds ?? []).includes(todoId)) continue;
    if (getAllocationMinutes(log, todoId) > 0) count++;
  }
  return count;
}

export function getTotalRatio(allocations: TodoAllocation[]): number {
  return allocations.reduce((sum, a) => sum + Math.max(0, a.ratio), 0);
}

export function getUnallocatedMinutes(log: LogEntry): number {
  const todoIds = log.todoIds ?? [];
  if (todoIds.length === 0) return 0;
  const net = getNetMinutes(log);
  if (net === 0) return 0;
  let assigned = 0;
  for (const id of todoIds) {
    assigned += getAllocationMinutes(log, id);
  }
  return Math.max(0, net - assigned);
}
