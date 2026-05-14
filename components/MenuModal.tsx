"use client";

import Modal from "./Modal";

interface Props {
  onClose: () => void;
  onTimeline: () => void;
  onOpenAggregate: () => void;
  onOpenSettings: () => void;
  onDelete: () => void;
}

export default function MenuModal({
  onClose,
  onTimeline,
  onOpenAggregate,
  onOpenSettings,
  onDelete,
}: Props) {
  return (
    <Modal title="メニュー" onClose={onClose}>
      <div className="space-y-3">
        <button
          type="button"
          onClick={onTimeline}
          className="w-full rounded-xl bg-slate-700 py-4 text-lg font-semibold text-white hover:bg-slate-600"
        >
          過去ログ
        </button>
        <button
          type="button"
          onClick={onOpenAggregate}
          className="w-full rounded-xl bg-slate-700 py-4 text-lg font-semibold text-white hover:bg-slate-600"
        >
          集計
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full rounded-xl bg-slate-700 py-4 text-lg font-semibold text-white hover:bg-slate-600"
        >
          設定
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
