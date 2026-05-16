"use client";

import { useRef, useState } from "react";
import Modal from "./Modal";
import {
  exportBackup,
  importBackup,
  triggerDownload,
  type ImportPreview,
} from "@/lib/backup";
import { forcePushLocalToS3 } from "@/lib/storage";

interface Props {
  onClose: () => void;
  onImported: () => void;
}

export default function BackupModal({ onClose, onImported }: Props) {
  const [busy, setBusy] = useState<"export" | "import" | "push" | null>(null);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExport = async () => {
    setBusy("export");
    setError("");
    setMessage("");
    try {
      const result = await exportBackup();
      triggerDownload(result.blob, result.filename);
      const c = result.counts;
      setMessage(
        `バックアップを作成しました: ${result.filename}\n` +
          `ログ${c.logs}件 / メモ${c.checkins}件 / ` +
          `ToDo${c.todos}件 / 繰り返し${c.recurringTodos}件 / ` +
          `タイマー${c.countdowns}件 / サブスク${c.subscriptions}件 / 画像${c.photos}件`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const handlePickFile = () => {
    if (busy) return;
    fileInputRef.current?.click();
  };

  const handleForcePush = async () => {
    if (busy) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "この端末のローカルデータでS3を上書きします。\n他端末で行った直近の編集も失われる可能性があります。よろしいですか？"
      )
    ) {
      return;
    }
    setBusy("push");
    setError("");
    setMessage("");
    try {
      const r = await forcePushLocalToS3();
      if (r.ok) {
        const photoLine =
          r.photoTotal > 0
            ? `\n写真：${r.photoOk}/${r.photoTotal} 件アップロード${
                r.photoFailed > 0 ? `（失敗 ${r.photoFailed}）` : ""
              }`
            : "";
        setMessage(
          `S3に上書きしました（version ${r.newVersion ?? "?"}）。${photoLine}`
        );
      } else {
        const detail = r.message ? `\n詳細：${r.message}` : "";
        if (r.reason === "unconfigured") {
          setError("S3に接続できていません。設定/環境変数を確認してください。");
        } else if (r.reason === "conflict") {
          setError(
            "競合が解消できませんでした。一度ページを再読み込みしてから、もう一度実行してください。"
          );
        } else if (r.reason === "fetchFailed") {
          setError(`S3のメタ取得に失敗しました。${detail}`);
        } else {
          setError(`S3への保存に失敗しました。${detail}`);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "現在のデータをすべて上書きしてインポートします。よろしいですか？\n（必要なら先に「バックアップを作成」を実行してください）"
      )
    ) {
      return;
    }
    setBusy("import");
    setError("");
    setMessage("");
    try {
      const preview: ImportPreview = await importBackup(file);
      const c = preview.counts;
      setMessage(
        `インポートしました（${preview.exportedAt} のバックアップ）\n` +
          `ログ${c.logs}件 / メモ${c.checkins}件 / ` +
          `ToDo${c.todos}件 / 繰り返し${c.recurringTodos}件 / ` +
          `タイマー${c.countdowns}件 / サブスク${c.subscriptions}件 / 画像${c.photos}件`
      );
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal title="バックアップ" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-300">
          全データ（ログ・メモ・ToDo・繰り返し・タイマー・サブスク・画像）を
          ZIP ファイルとして書き出し、または ZIP から復元します。
        </p>

        <button
          type="button"
          onClick={handleExport}
          disabled={busy !== null}
          className="w-full rounded-xl bg-sky-500 py-4 text-base font-bold text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          {busy === "export" ? "書き出し中…" : "バックアップを作成（ZIP）"}
        </button>

        <button
          type="button"
          onClick={handlePickFile}
          disabled={busy !== null}
          className="w-full rounded-xl bg-slate-700 py-4 text-base font-bold text-white hover:bg-slate-600 disabled:cursor-not-allowed disabled:bg-slate-800"
        >
          {busy === "import" ? "インポート中…" : "ZIPから復元（上書き）"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="border-t border-slate-700 pt-4">
          <p className="mb-2 text-xs text-slate-400">
            この端末のデータでS3を上書きします。ZIPから復元した直後や、
            S3のデータが古くなっている場合に使用します。
          </p>
          <button
            type="button"
            onClick={handleForcePush}
            disabled={busy !== null}
            className="w-full rounded-xl bg-amber-600 py-4 text-base font-bold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-slate-800"
          >
            {busy === "push"
              ? "S3に送信中…"
              : "この端末のデータでS3を上書き"}
          </button>
        </div>

        {message && (
          <p className="whitespace-pre-wrap rounded-xl bg-slate-900 px-4 py-3 text-sm text-emerald-300">
            {message}
          </p>
        )}
        {error && (
          <p className="whitespace-pre-wrap rounded-xl bg-rose-900/40 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
