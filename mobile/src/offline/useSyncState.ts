import { useEffect, useState } from "react";
import { getOutboxSnapshot, subscribeOutbox } from "@/offline/outbox";
import { getSyncRuntimeState, subscribeSyncState } from "@/offline/sync";

export type SyncState = {
  pendingCount: number;
  isSyncing: boolean;
  lastError: string | null;
  reload: () => Promise<void>;
};

export function useSyncState(): SyncState {
  const [pendingCount, setPendingCount] = useState(0);
  const [runtime, setRuntime] = useState(getSyncRuntimeState());

  async function reload() {
    const snapshot = await getOutboxSnapshot();
    setPendingCount(snapshot.pendingCount);
    setRuntime(getSyncRuntimeState());
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void reload();
    }, 0);
    const unsubscribeOutbox = subscribeOutbox(() => {
      void reload();
    });
    const unsubscribeSync = subscribeSyncState(() => {
      setRuntime(getSyncRuntimeState());
    });
    return () => {
      clearTimeout(timer);
      unsubscribeOutbox();
      unsubscribeSync();
    };
  }, []);

  return {
    pendingCount,
    isSyncing: runtime.isSyncing,
    lastError: runtime.lastError,
    reload,
  };
}
