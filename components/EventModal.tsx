"use client";

import { useRef, useState } from "react";
import Modal from "./Modal";
import CategorySelect from "./CategorySelect";
import { fromDatetimeLocal, toDatetimeLocal } from "@/lib/time";
import { compressImageToDataUrl } from "@/lib/image";
import {
  inferCategoryFromTitleAndMemo,
  type Category,
  type CategoryDefinition,
} from "@/lib/category";

interface Props {
  categories: CategoryDefinition[];
  onClose: () => void;
  onConfirm: (input: {
    content: string;
    photoDataUrl: string | null;
    photoSummary: string | null;
    memo: string;
    timestamp: Date;
    category: Category;
    subcategory: string | null;
  }) => void;
  onAddSubcategory?: (categoryName: string) => void;
}

export default function EventModal({
  categories,
  onClose,
  onConfirm,
  onAddSubcategory,
}: Props) {
  const [content, setContent] = useState<string>("");
  const [timestamp, setTimestamp] = useState<string>(toDatetimeLocal(new Date()));
  const [memo, setMemo] = useState<string>("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoSummary, setPhotoSummary] = useState<string>("");
  const [category, setCategory] = useState<Category>(
    categories[0]?.name ?? "その他"
  );
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [categoryDirty, setCategoryDirty] = useState(false);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleContentChange = (next: string) => {
    setContent(next);
    if (!categoryDirty) {
      setCategory(inferCategoryFromTitleAndMemo(next, memo));
    }
  };

  const handleMemoChange = (next: string) => {
    setMemo(next);
    if (!categoryDirty) {
      setCategory(inferCategoryFromTitleAndMemo(content, next));
    }
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      setPhotoDataUrl(dataUrl);
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
    onConfirm({
      content: trimmed,
      photoDataUrl,
      photoSummary: photoSummary.trim() || null,
      memo,
      timestamp: date,
      category,
      subcategory,
    });
  };

  return (
    <Modal title="イベント追加" onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm text-slate-300">内容</label>
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            rows={2}
            placeholder="例: 朝起きた、歯磨きした、昼食"
            className="w-full resize-none rounded-xl bg-slate-900 px-4 py-3 text-base text-white placeholder:text-slate-500"
          />
        </div>

        <CategorySelect
          categories={categories}
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
              {busy ? "読み込み中…" : photoDataUrl ? "撮り直す" : "写真を撮影 / 選択"}
            </button>
            {photoDataUrl && (
              <button
                type="button"
                onClick={() => setPhotoDataUrl(null)}
                className="rounded-xl bg-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-600"
              >
                削除
              </button>
            )}
          </div>
          {photoDataUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoDataUrl}
                alt="プレビュー"
                className="mt-2 max-h-48 w-full rounded-xl object-contain"
              />
              <input
                type="text"
                value={photoSummary}
                onChange={(e) => setPhotoSummary(e.target.value)}
                placeholder="写真の説明（例: 食事の写真）"
                className="mt-2 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm text-white placeholder:text-slate-500"
              />
            </>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-slate-300">メモ（任意）</label>
          <textarea
            value={memo}
            onChange={(e) => handleMemoChange(e.target.value)}
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
