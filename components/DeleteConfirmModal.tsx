"use client";

import Modal from "./Modal";

interface Props {
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteConfirmModal({ onClose, onConfirm }: Props) {
  return (
    <Modal title="データ削除" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-base leading-relaxed text-slate-100">
          本当にすべての記録を削除しますか？
          <br />
          この操作は取り消せません。
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-700 py-4 text-base font-semibold text-white hover:bg-slate-600"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-rose-600 py-4 text-base font-bold text-white hover:bg-rose-500"
          >
            すべて削除
          </button>
        </div>
      </div>
    </Modal>
  );
}
