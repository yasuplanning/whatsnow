import type { Subscription, TodoItem } from "./types";
import { generateId } from "./storage";
import { pad2 } from "./time";

export function periodKeyFor(sub: Subscription): string | null {
  if (!sub.nextRenewalAt) return null;
  const d = new Date(sub.nextRenewalAt);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function buildReviewTodo(
  sub: Subscription,
  periodKey: string
): TodoItem {
  const nowIso = new Date().toISOString();
  return {
    id: generateId(),
    title: `「${sub.serviceName}」見直し`,
    memo: sub.memo,
    category: sub.category,
    progress: 0,
    status: "open",
    deadline: sub.nextRenewalAt || null,
    createdAt: nowIso,
    updatedAt: nowIso,
    doneAt: null,
    recurringTodoId: null,
    recurringPeriodKey: null,
    subscriptionId: sub.id,
    subscriptionPeriodKey: periodKey,
    important: false,
    alerts: [],
  };
}

function dedupeKeySet(todos: TodoItem[]): Set<string> {
  const seen = new Set<string>();
  for (const t of todos) {
    if (t.subscriptionId && t.subscriptionPeriodKey) {
      seen.add(`${t.subscriptionId}::${t.subscriptionPeriodKey}`);
    }
  }
  return seen;
}

export function generateSubscriptionReviewTodosForNow(
  subscriptions: Subscription[],
  todos: TodoItem[],
  now: Date
): TodoItem[] {
  const additions: TodoItem[] = [];
  const seen = dedupeKeySet(todos);
  for (const sub of subscriptions) {
    if (sub.status === "cancelled") continue;
    if (!sub.reviewEnabled) continue;
    const periodKey = periodKeyFor(sub);
    if (!periodKey) continue;
    const renewalMs = new Date(sub.nextRenewalAt).getTime();
    if (!Number.isFinite(renewalMs)) continue;
    const triggerMs =
      renewalMs - sub.reviewDaysBefore * 24 * 60 * 60 * 1000;
    if (now.getTime() < triggerMs) continue;
    const key = `${sub.id}::${periodKey}`;
    if (seen.has(key)) continue;
    additions.push(buildReviewTodo(sub, periodKey));
    seen.add(key);
  }
  return additions;
}

export function createReviewTodoManually(
  sub: Subscription,
  todos: TodoItem[]
): TodoItem | null {
  if (sub.status === "cancelled") return null;
  const periodKey = periodKeyFor(sub);
  if (!periodKey) return null;
  for (const t of todos) {
    if (
      t.subscriptionId === sub.id &&
      t.subscriptionPeriodKey === periodKey
    ) {
      return null;
    }
  }
  return buildReviewTodo(sub, periodKey);
}
