import { createExerciseLog, createFoodLog } from "@/api/services";
import { markOutboxItemFailed, readOutbox, removeOutboxItem } from "@/offline/outbox";

let activeFlush: Promise<SyncResult> | null = null;

export type SyncResult = {
  syncedCount: number;
  failedCount: number;
};

type SyncListener = () => void;

const syncListeners = new Set<SyncListener>();
let isSyncing = false;
let lastError: string | null = null;

function notifySyncListeners() {
  syncListeners.forEach((listener) => listener());
}

export function subscribeSyncState(listener: SyncListener) {
  syncListeners.add(listener);
  return () => syncListeners.delete(listener);
}

export function getSyncRuntimeState() {
  return { isSyncing, lastError };
}

function setSyncing(value: boolean) {
  isSyncing = value;
  notifySyncListeners();
}

function setLastError(value: string | null) {
  lastError = value;
  notifySyncListeners();
}

function messageForError(error: unknown) {
  return error instanceof Error ? error.message : "同步失败，请稍后重试";
}

export async function flushOutbox(): Promise<SyncResult> {
  if (activeFlush) return activeFlush;
  activeFlush = runFlush().finally(() => {
    activeFlush = null;
  });
  return activeFlush;
}

async function runFlush(): Promise<SyncResult> {
  setSyncing(true);
  setLastError(null);
  let syncedCount = 0;
  let failedCount = 0;

  try {
    const items = await readOutbox();
    for (const item of items) {
      try {
        if (item.type === "food-log") {
          await createFoodLog(item.payload);
        } else {
          await createExerciseLog(item.payload);
        }
        await removeOutboxItem(item.localId);
        syncedCount += 1;
      } catch (error) {
        failedCount += 1;
        const message = messageForError(error);
        await markOutboxItemFailed(item.localId, message);
        setLastError(message);
      }
    }
    return { syncedCount, failedCount };
  } finally {
    setSyncing(false);
  }
}
