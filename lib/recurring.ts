import type { RecurringTodo, TodoItem } from "./types";
import { generateId } from "./storage";

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function clampDayToMonth(year: number, month: number, day: number): number {
  const lastDay = new Date(year, month, 0).getDate();
  return Math.min(Math.max(1, day), lastDay);
}

export interface PeriodInfo {
  periodKey: string;
  triggerDate: Date;
  deadlineDate: Date;
  suffix: string;
}

export function computeMostRecentPeriod(
  template: RecurringTodo,
  now: Date
): PeriodInfo | null {
  if (template.frequency === "monthly") {
    let py = now.getFullYear();
    let pm = now.getMonth() + 1;
    const dayCurrent = clampDayToMonth(py, pm, template.dayOfMonth);
    if (now.getDate() < dayCurrent) {
      if (pm === 1) {
        pm = 12;
        py -= 1;
      } else {
        pm -= 1;
      }
    }
    const dayUsed = clampDayToMonth(py, pm, template.dayOfMonth);
    const triggerDate = new Date(py, pm - 1, dayUsed, 0, 0, 0, 0);
    const deadlineDate = new Date(
      py,
      pm - 1,
      dayUsed + Math.max(0, template.deadlineDays),
      23,
      59,
      0,
      0
    );
    return {
      periodKey: `${py}-${pad2(pm)}`,
      triggerDate,
      deadlineDate,
      suffix: `（${py}年${pm}月分）`,
    };
  }

  const targetMonth = template.monthOfYear ?? 1;
  let py = now.getFullYear();
  const currentClamped = clampDayToMonth(py, targetMonth, template.dayOfMonth);
  const reached =
    now.getMonth() + 1 > targetMonth ||
    (now.getMonth() + 1 === targetMonth && now.getDate() >= currentClamped);
  if (!reached) {
    py -= 1;
  }
  const dayUsed = clampDayToMonth(py, targetMonth, template.dayOfMonth);
  const triggerDate = new Date(py, targetMonth - 1, dayUsed, 0, 0, 0, 0);
  const deadlineDate = new Date(
    py,
    targetMonth - 1,
    dayUsed + Math.max(0, template.deadlineDays),
    23,
    59,
    0,
    0
  );
  return {
    periodKey: `${py}`,
    triggerDate,
    deadlineDate,
    suffix: `（${py}年分）`,
  };
}

export function generateRecurringTodosForNow(
  templates: RecurringTodo[],
  todos: TodoItem[],
  now: Date
): TodoItem[] {
  const additions: TodoItem[] = [];
  const seen = new Set<string>();
  for (const t of todos) {
    if (t.recurringTodoId && t.recurringPeriodKey) {
      seen.add(`${t.recurringTodoId}::${t.recurringPeriodKey}`);
    }
  }
  for (const template of templates) {
    if (!template.enabled) continue;
    const info = computeMostRecentPeriod(template, now);
    if (!info) continue;
    const key = `${template.id}::${info.periodKey}`;
    if (seen.has(key)) continue;
    const nowIso = new Date().toISOString();
    const entry: TodoItem = {
      id: generateId(),
      title: `${template.title}${info.suffix}`,
      memo: template.memo,
      category: template.category,
      progress: 0,
      status: "open",
      deadline: info.deadlineDate.toISOString(),
      createdAt: nowIso,
      updatedAt: nowIso,
      doneAt: null,
      recurringTodoId: template.id,
      recurringPeriodKey: info.periodKey,
      important: false,
      alerts: [],
    };
    additions.push(entry);
    seen.add(key);
  }
  return additions;
}

export function describeRecurring(template: RecurringTodo): string {
  if (template.frequency === "monthly") {
    return `毎月${template.dayOfMonth}日 / 期限+${template.deadlineDays}日`;
  }
  const m = template.monthOfYear ?? 1;
  return `毎年${m}月${template.dayOfMonth}日 / 期限+${template.deadlineDays}日`;
}
