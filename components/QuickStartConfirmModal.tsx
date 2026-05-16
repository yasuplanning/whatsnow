"use client";

import Modal from "./Modal";

interface Props {
  category: string;
  subcategory: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function QuickStartConfirmModal({
  category,
  subcategory,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal title="クイック開始" onClose={onCancel}>
      <div className="space-y-4">
        <p className="text-sm text-slate-300">
          以下のタイトルで ToDo を作成し、すぐに作業を開始しますか？
        </p>
        <p className="rounded-xl bg-slate-900 px-4 py-3 text-lg font-bold text-white">
          {category} / {subcategory}
        </p>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl bg-slate-700 py-3 text-base font-semibold text-white hover:bg-slate-600"
          >
            いいえ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-emerald-500 py-3 text-base font-bold text-white hover:bg-emerald-400"
          >
            はい
          </button>
        </div>
      </div>
    </Modal>
  );
}
