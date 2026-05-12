"use client";

import { useMemo, useState } from "react";
import Modal from "./Modal";
import type { Subscription, SubscriptionStatus } from "@/lib/types";
import { CATEGORY_COLOR } from "@/lib/category";
import { pad2 } from "@/lib/time";

interface Props {
  subscriptions: Subscription[];
  onClose: () => void;
  onAdd: () => void;
  onEdit: (sub: Subscription) => void;
  onAdvanceRenewal: (id: string) => void;
  onCreateReviewTodo: (sub: Subscription) => void;
}

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  active: "継続",
  considering: "解約検討",
  scheduled_cancel: "解約予定",
  cancelled: "解約済み",
};

const STATUS_COLOR: Record<SubscriptionStatus, string> = {
  active: "bg-emerald-200 text-emerald-900",
  considering: "bg-amber-200 text-amber-900",
  scheduled_cancel: "bg-orange-200 text-orange-900",
  cancelled: "bg-slate-300 text-slate-700",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`;
}

function reviewDate(sub: Subscription): string | null {
  if (!sub.nextRenewalAt) return null;
  const d = new Date(sub.nextRenewalAt);
  if (Number.isNaN(d.getTime())) return null;
  const review = new Date(d.getTime());
  review.setDate(review.getDate() - sub.reviewDaysBefore);
  return `${review.getFullYear()}/${pad2(review.getMonth() + 1)}/${pad2(review.getDate())}`;
}

function cycleLabel(sub: Subscription): string {
  if (sub.paymentCycle === "monthly") return "月額";
  if (sub.paymentCycle === "yearly") return "年額";
  return "その他";
}

function advanceLabel(sub: Subscription): string | null {
  if (sub.paymentCycle === "monthly") return "+1か月";
  if (sub.paymentCycle === "yearly") return "+1年";
  if (sub.customCycleMonths && sub.customCycleMonths > 0)
    return `+${sub.customCycleMonths}か月`;
  return null;
}

export default function SubscriptionManageModal({
  subscriptions,
  onClose,
  onAdd,
  onEdit,
  onAdvanceRenewal,
  onCreateReviewTodo,
}: Props) {
  const [showCancelled, setShowCancelled] = useState(true);
  const nowMs = Date.now();

  const { active, cancelled } = useMemo(() => {
    const a = subscriptions
      .filter((s) => s.status !== "cancelled")
      .slice()
      .sort((x, y) => {
        const xt = x.nextRenewalAt
          ? new Date(x.nextRenewalAt).getTime()
          : Number.POSITIVE_INFINITY;
        const yt = y.nextRenewalAt
          ? new Date(y.nextRenewalAt).getTime()
          : Number.POSITIVE_INFINITY;
        return xt - yt;
      });
    const c = subscriptions
      .filter((s) => s.status === "cancelled")
      .slice()
      .sort((x, y) => x.serviceName.localeCompare(y.serviceName));
    return { active: a, cancelled: c };
  }, [subscriptions]);

  const renderCard = (sub: Subscription) => {
    const renewalMs = sub.nextRenewalAt
      ? new Date(sub.nextRenewalAt).getTime()
      : NaN;
    const overdue =
      Number.isFinite(renewalMs) &&
      renewalMs < nowMs &&
      sub.status !== "cancelled";
    const adv = advanceLabel(sub);
    return (
      <div key={sub.id} className="rounded-xl bg-slate-900 p-3">
        <button
          type="button"
          onClick={() => onEdit(sub)}
          className="w-full text-left"
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="break-words text-base font-semibold">
              {sub.serviceName}
            </span>
            <span className="shrink-0 text-sm text-sky-300">
              {sub.amount.toLocaleString()}円 / {cycleLabel(sub)}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <span
              className={`rounded px-2 py-0.5 text-xs ${CATEGORY_COLOR[sub.category]}`}
            >
              {sub.category}
            </span>
            <span
              className={`rounded px-2 py-0.5 text-xs ${STATUS_COLOR[sub.status]}`}
            >
              {STATUS_LABEL[sub.status]}
            </span>
            {overdue && (
              <span className="rounded bg-rose-500/20 px-2 py-0.5 text-xs text-rose-300">
                更新日を過ぎています
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-300">
            次回更新日: {formatDate(sub.nextRenewalAt)}
          </p>
          {sub.reviewEnabled && (
            <p className="text-xs text-slate-400">
              見直し日: {reviewDate(sub) ?? "—"}（{sub.reviewDaysBefore}日前）
            </p>
          )}
        </button>
        {sub.status !== "cancelled" && (
          <div className="mt-3 flex flex-wrap gap-2">
            {adv && (
              <button
                type="button"
                onClick={() => onAdvanceRenewal(sub.id)}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
              >
                次回更新日 {adv}
              </button>
            )}
            <button
              type="button"
              onClick={() => onCreateReviewTodo(sub)}
              className="rounded-lg bg-sky-700 px-3 py-1.5 text-xs text-white hover:bg-sky-600"
            >
              見直しタスクを作成
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal title="サブスク管理" onClose={onClose}>
      <div className="space-y-4">
        <button
          type="button"
          onClick={onAdd}
          className="w-full rounded-xl bg-sky-500 py-3 text-base font-bold text-white hover:bg-sky-400"
        >
          ＋ 新規追加
        </button>

        <p className="text-sm text-slate-300">
          計{subscriptions.length}件（継続中{active.length}件・解約済み
          {cancelled.length}件）
        </p>

        <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
          {active.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">
              継続中のサブスクはありません。
            </p>
          ) : (
            active.map(renderCard)
          )}

          {cancelled.length > 0 && (
            <button
              type="button"
              onClick={() => setShowCancelled((v) => !v)}
              className="w-full rounded-xl border border-slate-700 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              {showCancelled
                ? "解約済みを非表示"
                : `解約済みを表示（${cancelled.length}件）`}
            </button>
          )}

          {showCancelled && cancelled.length > 0 && (
            <div className="space-y-2">{cancelled.map(renderCard)}</div>
          )}
        </div>
      </div>
    </Modal>
  );
}
