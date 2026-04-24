"use client";

import { useState } from "react";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/run-sync", { method: "POST" });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Sync failed");
      }
      
      alert(`同期が完了しました。\n${data.successCount ?? 0}件の予約データを更新しました。`);
      // 画面をリロードして最新データを反映
      window.location.reload();
    } catch (err: any) {
      alert(`同期に失敗しました。\nエラー: ${err.message}`);
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={isSyncing}
      variant="outline"
      className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-50"
    >
      <RefreshCcw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
      {isSyncing ? "同期中..." : "最新データに同期"}
    </Button>
  );
}
