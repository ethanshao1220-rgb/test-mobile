import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ExerciseLogInput, FoodLogInput } from "@/api/types";

const OUTBOX_STORAGE_KEY = "fitdiet.outbox.v1";

export type OutboxItem =
  | {
      localId: string;
      type: "food-log";
      payload: FoodLogInput;
      attempts: number;
      createdAt: string;
      lastError?: string;
    }
  | {
      localId: string;
      type: "exercise-log";
      payload: ExerciseLogInput;
      attempts: number;
      createdAt: string;
      lastError?: string;
    };

export type OutboxSnapshot = {
  items: OutboxItem[];
  pendingCount: number;
};

type Listener = () => void;

const listeners = new Set<Listener>();

function createLocalId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribeOutbox(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function readOutbox(): Promise<OutboxItem[]> {
  const raw = await AsyncStorage.getItem(OUTBOX_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as OutboxItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getOutboxSnapshot(): Promise<OutboxSnapshot> {
  const items = await readOutbox();
  return { items, pendingCount: items.length };
}

async function writeOutbox(items: OutboxItem[]) {
  await AsyncStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(items));
  notify();
}

export async function enqueueFoodLog(payload: FoodLogInput): Promise<OutboxItem> {
  const item: OutboxItem = {
    localId: createLocalId(),
    type: "food-log",
    payload,
    attempts: 0,
    createdAt: new Date().toISOString(),
  };
  await writeOutbox([...(await readOutbox()), item]);
  return item;
}

export async function enqueueExerciseLog(payload: ExerciseLogInput): Promise<OutboxItem> {
  const item: OutboxItem = {
    localId: createLocalId(),
    type: "exercise-log",
    payload,
    attempts: 0,
    createdAt: new Date().toISOString(),
  };
  await writeOutbox([...(await readOutbox()), item]);
  return item;
}

export async function removeOutboxItem(localId: string) {
  const items = await readOutbox();
  await writeOutbox(items.filter((item) => item.localId !== localId));
}

export async function markOutboxItemFailed(localId: string, error: string) {
  const items = await readOutbox();
  await writeOutbox(
    items.map((item) =>
      item.localId === localId ? { ...item, attempts: item.attempts + 1, lastError: error } : item,
    ),
  );
}
