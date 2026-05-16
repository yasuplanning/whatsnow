"use client";

import Modal from "./Modal";

interface Props {
  category: string;
  subcategory: string | null;
  endingActiveTaskTitle?: string | null;
  /** "はい" — create the ToDo and start a new log immediately. */
  onConfirm: () => void;
  /** "いいえ" — create the ToDo only, don't start a log. */
  onSaveOnly: () => void;
  /** Dismiss the modal entirely without creating anything. */
  onCancel: () => void;
}

export default function QuickStartConfirmModal({
  category,
  subcategory,
  endingActiveTaskTitle,
  onConfirm,
  onSaveOnly,
  onCancel,
}: Props) {
  const ending = endingActiveTaskTitle && endingActiveTaskTitle.length > 0;
  return (
    <Modal title="TODO作成" onClose={onCancel}>
      <div className="space-y-4">
        <p className="text-sm text-slate-300">
          {ending
            ? "以下のタイトルで ToDo を作成します。現在のログを終了して、すぐに新しい作業を開始しますか？"
            : "以下のタイトルで ToDo を作成します。すぐに作業を開始しますか？"}
        </p>
        {ending && (
          <p className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-slate-400">
            終了するログ：
            <span className="text-slate-200">{endingActiveTaskTitle}</span>
          </p>
        )}
        <p className="rounded-xl bg-slate-900 px-4 py-3 text-lg font-bold text-white">
          {subcategory ? `${category} / ${subcategory}` : category}
        </p>
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full rounded-xl bg-emerald-500 py-3 text-base font-bold text-white hover:bg-emerald-400"
          >
            はい（保存して開始）
          </button>
          <button
            type="button"
            onClick={onSaveOnly}
            className="w-full rounded-xl bg-sky-600 py-3 text-base font-semibold text-white hover:bg-sky-500"
          >
            いいえ（ToDoを保存するだけ）
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-xl bg-slate-700 py-3 text-sm text-slate-200 hover:bg-slate-600"
          >
            キャンセル
          </button>
        </div>
      </div>
    </Modal>
  );
}
