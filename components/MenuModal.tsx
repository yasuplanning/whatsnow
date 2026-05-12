"use client";

import Modal from "./Modal";

interface Props {
  onClose: () => void;
  onExport: () => void;
  onTimeline: () => void;
  onAddPast: () => void;
  onAddEvent: () => void;
  onListEvents: () => void;
  onManageRecurring: () => void;
  onManageSubscriptions: () => void;
  onOpenCountdown: () => void;
  onDelete: () => void;
}

export default function MenuModal({
  onClose,
  onExport,
  onTimeline,
  onAddPast,
  onAddEvent,
  onListEvents,
  onManageRecurring,
  onManageSubscriptions,
  onOpenCountdown,
  onDelete,
}: Props) {
  return (
    <Modal title="メニュー" onClose={onClose}>
      <div className="space-y-3">
        <button
          type="button"
          onClick={onAddPast}
          className="w-full rounded-xl bg-slate-700 py-4 text-lg font-semibold text-white hover:bg-slate-600"
        >
          過去の記録を追加
        </button>
        <button
          type="button"
          onClick={onAddEvent}
          className="w-full rounded-xl bg-slate-700 py-4 text-lg font-semibold text-white hover:bg-slate-600"
        >
          イベントを追加
        </button>
        <button
          type="button"
          onClick={onListEvents}
          className="w-full rounded-xl bg-slate-700 py-4 text-lg font-semibold text-white hover:bg-slate-600"
        >
          イベント一覧
        </button>
        <button
          type="button"
          onClick={onManageRecurring}
          className="w-full rounded-xl bg-slate-700 py-4 text-lg font-semibold text-white hover:bg-slate-600"
        >
          毎月・毎年やるべきこと
        </button>
        <button
          type="button"
          onClick={onManageSubscriptions}
          className="w-full rounded-xl bg-slate-700 py-4 text-lg font-semibold text-white hover:bg-slate-600"
        >
          サブスク管理
        </button>
        <button
          type="button"
          onClick={onOpenCountdown}
          className="w-full rounded-xl bg-slate-700 py-4 text-lg font-semibold text-white hover:bg-slate-600"
        >
          カウントダウンタイマー
        </button>
        <button
          type="button"
          onClick={onTimeline}
          className="w-full rounded-xl bg-slate-700 py-4 text-lg font-semibold text-white hover:bg-slate-600"
        >
          できごと一覧
        </button>
        <button
          type="button"
          onClick={onExport}
          className="w-full rounded-xl bg-slate-700 py-4 text-lg font-semibold text-white hover:bg-slate-600"
        >
          バックアップ
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="w-full rounded-xl bg-rose-600 py-4 text-lg font-semibold text-white hover:bg-rose-500"
        >
          データ削除
        </button>
      </div>
    </Modal>
  );
}
