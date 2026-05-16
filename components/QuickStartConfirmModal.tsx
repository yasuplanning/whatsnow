"use client";

import Modal from "./Modal";

interface Props {
  category: string;
  subcategory: string;
  endingActiveTaskTitle?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function QuickStartConfirmModal({
  category,
  subcategory,
  endingActiveTaskTitle,
  onConfirm,
  onCancel,
}: Props) {
  const ending = endingActiveTaskTitle && endingActiveTaskTitle.length > 0;
  return (
    <Modal title="TODO作成" onClose={onCancel}>
      <div className="space-y-4">
        <p className="text-sm text-slate-300">
          {ending
            ? "現在のログを終了して、以下のタイトルで ToDo を作成し、新しい作業を開始しますか？"
            : "以下のタイトルで ToDo を作成し、すぐに作業を開始しますか？"}
        </p>
        {ending && (
          <p className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-slate-400">
            終了するログ：
            <span className="text-slate-200">{endingActiveTaskTitle}</span>
          </p>
        )}
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
