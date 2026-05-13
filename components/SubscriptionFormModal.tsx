"use client";

import { useState } from "react";
import Modal from "./Modal";
import type {
  PaymentCycle,
  Subscription,
  SubscriptionStatus,
} from "@/lib/types";
import {
  inferCategoryFromTitleAndMemo,
  type Category,
  type CategoryDefinition,
} from "@/lib/category";
import CategorySelect from "./CategorySelect";
import { pad2, toJstIso } from "@/lib/time";

interface Props {
  categories: CategoryDefinition[];
  initial: Subscription | null;
  onClose: () => void;
  onSubmit: (input: SubmitInput) => void;
  onDelete?: () => void;
  onAddSubcategory?: (categoryName: string) => void;
}

export interface SubmitInput {
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
}

const CYCLE_OPTIONS: { value: PaymentCycle; label: string }[] = [
  { value: "monthly", label: "月額" },
  { value: "yearly", label: "年額" },
  { value: "other", label: "その他" },
];

const STATUS_OPTIONS: { value: SubscriptionStatus; label: string }[] = [
  { value: "active", label: "継続" },
  { value: "considering", label: "解約検討" },
  { value: "scheduled_cancel", label: "解約予定" },
  { value: "cancelled", label: "解約済み" },
];

const REVIEW_DAY_OPTIONS = [3, 7, 14, 30];

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function fromDateInputValue(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const day = Number(m[3]);
  const d = new Date(y, mo - 1, day, 0, 0, 0, 0);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function defaultNextRenewal(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export default function SubscriptionFormModal({
  categories,
  initial,
  onClose,
  onSubmit,
  onDelete,
  onAddSubcategory,
}: Props) {
  const isEdit = initial !== null;
  const [serviceName, setServiceName] = useState<string>(
    initial?.serviceName ?? ""
  );
  const [amount, setAmount] = useState<string>(
    initial ? String(initial.amount) : "0"
  );
  const [paymentCycle, setPaymentCycle] = useState<PaymentCycle>(
    initial?.paymentCycle ?? "monthly"
  );
  const [nextRenewal, setNextRenewal] = useState<string>(
    initial ? toDateInputValue(initial.nextRenewalAt) : defaultNextRenewal()
  );
  const [contractStarted, setContractStarted] = useState<string>(
    initial?.contractStartedAt ? toDateInputValue(initial.contractStartedAt) : ""
  );
  const [paymentMethod, setPaymentMethod] = useState<string>(
    initial?.paymentMethod ?? ""
  );
  const [cancelUrl, setCancelUrl] = useState<string>(initial?.cancelUrl ?? "");
  const [memo, setMemo] = useState<string>(initial?.memo ?? "");
  const [status, setStatus] = useState<SubscriptionStatus>(
    initial?.status ?? "active"
  );
  const [reviewEnabled, setReviewEnabled] = useState<boolean>(
    initial?.reviewEnabled ?? true
  );
  const [reviewDaysBefore, setReviewDaysBefore] = useState<number>(
    initial?.reviewDaysBefore ?? 7
  );
  const [category, setCategory] = useState<Category>(
    initial?.category ?? categories[0]?.name ?? "その他"
  );
  const [subcategory, setSubcategory] = useState<string | null>(
    initial?.subcategory ?? null
  );
  const [categoryDirty, setCategoryDirty] = useState<boolean>(isEdit);
  const [error, setError] = useState<string>("");

  const handleServiceChange = (next: string) => {
    setServiceName(next);
    if (!categoryDirty) {
      setCategory(inferCategoryFromTitleAndMemo(next, memo));
    }
  };

  const handleMemoChange = (next: string) => {
    setMemo(next);
    if (!categoryDirty) {
      setCategory(inferCategoryFromTitleAndMemo(serviceName, next));
    }
  };

  const handleSubmit = () => {
    const trimmedName = serviceName.trim();
    if (!trimmedName) {
      setError("サービス名を入力してください。");
      return;
    }
    const amountNum = Number.parseInt(amount, 10);
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      setError("金額には0以上の整数を入力してください。");
      return;
    }
    const renewalDate = fromDateInputValue(nextRenewal);
    if (!renewalDate) {
      setError("次回更新日を入力してください。");
      return;
    }
    const startedDate = contractStarted
      ? fromDateInputValue(contractStarted)
      : null;
    if (contractStarted && !startedDate) {
      setError("契約開始日の日付が不正です。");
      return;
    }
    onSubmit({
      serviceName: trimmedName,
      amount: amountNum,
      paymentCycle,
      customCycleMonths: initial?.customCycleMonths ?? null,
      nextRenewalAt: toJstIso(renewalDate),
      contractStartedAt: startedDate ? toJstIso(startedDate) : null,
      paymentMethod,
      cancelUrl,
      memo,
      category,
      subcategory,
      status,
      reviewEnabled,
      reviewDaysBefore,
    });
  };

  const handleDelete = () => {
    if (!onDelete) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm("このサブスクを削除しますか？")
    ) {
      return;
    }
    onDelete();
  };

  return (
    <Modal title={isEdit ? "サブスク編集" : "サブスク追加"} onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm text-slate-300">サービス名</label>
          <input
            type="text"
            value={serviceName}
            onChange={(e) => handleServiceChange(e.target.value)}
            placeholder="例: Netflix"
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-base text-white placeholder:text-slate-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-slate-300">金額（円）</label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-base text-white"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-slate-300">支払周期</label>
          <div className="grid grid-cols-3 gap-2">
            {CYCLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPaymentCycle(opt.value)}
                className={`rounded-xl py-3 text-base font-semibold transition ${
                  paymentCycle === opt.value
                    ? "bg-sky-500 text-white"
                    : "bg-slate-700 text-slate-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-slate-300">次回更新日</label>
          <input
            type="date"
            value={nextRenewal}
            onChange={(e) => setNextRenewal(e.target.value)}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-base text-white"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-slate-300">
            契約開始日（任意）
          </label>
          <input
            type="date"
            value={contractStarted}
            onChange={(e) => setContractStarted(e.target.value)}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-base text-white"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-slate-300">
            支払方法（任意）
          </label>
          <input
            type="text"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            placeholder="例: 楽天カード"
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-base text-white placeholder:text-slate-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-slate-300">
            解約URL（任意）
          </label>
          <input
            type="url"
            value={cancelUrl}
            onChange={(e) => setCancelUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-base text-white placeholder:text-slate-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-slate-300">memo（任意）</label>
          <textarea
            value={memo}
            onChange={(e) => handleMemoChange(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-xl bg-slate-900 px-4 py-3 text-base text-white placeholder:text-slate-500"
          />
        </div>

        <CategorySelect
          categories={categories}
          label="用途カテゴリ"
          value={category}
          onChange={(c) => {
            setCategoryDirty(true);
            setCategory(c);
          }}
          subcategoryValue={subcategory}
          onSubcategoryChange={setSubcategory}
          onAddSubcategory={onAddSubcategory}
        />

        <div className="space-y-2">
          <label className="block text-sm text-slate-300">ステータス</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-base text-white"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 rounded-xl bg-slate-900 p-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={reviewEnabled}
              onChange={(e) => setReviewEnabled(e.target.checked)}
              className="h-5 w-5"
            />
            <span className="text-base">
              更新前に見直し（自動で「ToDo」に追加）
            </span>
          </label>
          {reviewEnabled && (
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">
                更新日の何日前に追加するか
              </label>
              <select
                value={reviewDaysBefore}
                onChange={(e) =>
                  setReviewDaysBefore(Number(e.target.value))
                }
                className="w-full rounded-xl bg-slate-800 px-4 py-2 text-base text-white"
              >
                {REVIEW_DAY_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}日前
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          className="w-full rounded-xl bg-sky-500 py-4 text-lg font-bold text-white hover:bg-sky-400"
        >
          保存
        </button>

        {isEdit && onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            className="w-full rounded-xl bg-rose-600 py-3 text-base font-semibold text-white hover:bg-rose-500"
          >
            削除
          </button>
        )}
      </div>
    </Modal>
  );
}
