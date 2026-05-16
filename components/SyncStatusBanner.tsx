"use client";

import { useEffect, useState } from "react";
import {
  forceReloadFromS3,
  subscribeSyncStatus,
  type SyncStatus,
} from "@/lib/storage";

interface Props {
  onReloaded?: () => void;
}

export default function SyncStatusBanner({ onReloaded }: Props) {
  const [status, setStatus] = useState<SyncStatus>({ kind: "idle" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return subscribeSyncStatus(setStatus);
  }, []);

  const handleReload = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await forceReloadFromS3();
      if (r.usedRemote) onReloaded?.();
    } finally {
      setBusy(false);
    }
  };

  const text = (() => {
    switch (status.kind) {
      case "idle":
        return null;
      case "syncing":
        return "S3同期中…";
      case "saving":
        return "保存中…";
      case "saved":
        return "S3同期済み";
      case "loadFailed":
        return "S3接続失敗：ローカルキャッシュを表示中";
      case "saveFailed":
        return `保存失敗：${status.message}`;
      case "conflict":
        return "他端末で更新があります。再読み込みしてください";
      case "offline":
        return "オフライン：通信回復後に同期します";
      case "localOnly":
        return "ローカルモード";
      default:
        return null;
    }
  })();

  if (!text) return null;

  const tone =
    status.kind === "saved" ||
    status.kind === "syncing" ||
    status.kind === "saving" ||
    status.kind === "localOnly"
      ? "bg-slate-800 text-slate-300"
      : status.kind === "conflict"
      ? "bg-rose-900/60 text-rose-100"
      : "bg-amber-900/60 text-amber-100";

  const showReloadButton =
    status.kind === "conflict" ||
    status.kind === "loadFailed" ||
    status.kind === "saveFailed";

  return (
    <div
      className={`flex items-center justify-between gap-2 px-3 py-1.5 text-xs ${tone}`}
    >
      <span className="truncate">{text}</span>
      {showReloadButton && (
        <button
          type="button"
          onClick={() => {
            void handleReload();
          }}
          disabled={busy}
          className="shrink-0 rounded bg-white/10 px-2 py-0.5 hover:bg-white/20 disabled:opacity-50"
        >
          {busy ? "再読込中…" : "再読み込み"}
        </button>
      )}
    </div>
  );
}
