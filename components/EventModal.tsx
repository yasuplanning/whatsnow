"use client";

import { useRef, useState } from "react";
import Modal from "./Modal";
import { fromDatetimeLocal, toDatetimeLocal } from "@/lib/time";
import { compressImageToDataUrl } from "@/lib/image";

interface Props {
  onClose: () => void;
  onConfirm: (input: {
    content: string;
    photo: string | null;
    memo: string;
    timestamp: Date;
  }) => void;
}

export default function EventModal({ onClose, onConfirm }: Props) {
  const [content, setContent] = useState<string>("");
  const [timestamp, setTimestamp] = useState<string>(toDatetimeLocal(new Date()));
  const [memo, setMemo] = useState<string>("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      setPhoto(dataUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "画像の読み込みに失敗しました";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed) {
      setError("内容を入力してください。");
      return;
    }
    const date = fromDatetimeLocal(timestamp);
    if (!date) {
      setError("時刻を入力してください。");
      return;
    }
    onConfirm({ content: trimmed, photo, memo, timestamp: date });
  };

  return (
    <Modal title="イベント追加" onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm text-slate-300">内容</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            placeholder="例: 朝起きた、歯磨きした、昼食"
            className="w-full resize-none rounded-xl bg-slate-900 px-4 py-3 text-base text-white placeholder:text-slate-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-slate-300">時刻</label>
          <input
            type="datetime-local"
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-lg text-white"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-slate-300">写真（任意）</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              void handleFile(f);
            }}
            className="hidden"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="flex-1 rounded-xl bg-slate-700 py-3 text-base font-semibold text-white hover:bg-slate-600 disabled:opacity-60"
            >
              {busy ? "読み込み中…" : photo ? "撮り直す" : "写真を撮影 / 選択"}
            </button>
            {photo && (
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="rounded-xl bg-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-600"
              >
                削除
              </button>
            )}
          </div>
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt="プレビュー"
              className="mt-2 max-h-48 w-full rounded-xl object-contain"
            />
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-slate-300">メモ（任意）</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl bg-slate-900 px-4 py-3 text-base text-white placeholder:text-slate-500"
          />
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="w-full rounded-xl bg-sky-500 py-4 text-lg font-bold text-white hover:bg-sky-400 disabled:opacity-60"
        >
          保存
        </button>
      </div>
    </Modal>
  );
}
