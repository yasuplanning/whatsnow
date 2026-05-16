"use client";

import Modal from "./Modal";

interface Props {
  onClose: () => void;
  onManageCategories: () => void;
  onManageLogCategories: () => void;
  onManageRecurring: () => void;
  onManageSubscriptions: () => void;
  onBackup: () => void;
}

export default function SettingsModal({
  onClose,
  onManageCategories,
  onManageLogCategories,
  onManageRecurring,
  onManageSubscriptions,
  onBackup,
}: Props) {
  return (
    <Modal title="設定" onClose={onClose}>
      <div className="space-y-3">
        <button
          type="button"
          onClick={onManageCategories}
          className="w-full rounded-xl bg-slate-700 py-4 text-lg font-semibold text-white hover:bg-slate-600"
        >
          ToDoカテゴリ管理
        </button>
        <button
          type="button"
          onClick={onManageLogCategories}
          className="w-full rounded-xl bg-slate-700 py-4 text-lg font-semibold text-white hover:bg-slate-600"
        >
          ログカテゴリ管理
        </button>
        <button
          type="button"
          onClick={onManageRecurring}
          className="w-full rounded-xl bg-slate-700 py-4 text-lg font-semibold text-white hover:bg-slate-600"
        >
          毎月・毎年ToDo
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
          onClick={onBackup}
          className="w-full rounded-xl bg-slate-700 py-4 text-lg font-semibold text-white hover:bg-slate-600"
        >
          バックアップ
        </button>
      </div>
    </Modal>
  );
}
