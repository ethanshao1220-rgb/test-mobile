import { createExerciseLog, createFoodLog } from "@/api/services";
import type { ExerciseLogInput, FoodLogInput } from "@/api/types";
import { enqueueExerciseLog, enqueueFoodLog } from "@/offline/outbox";

export type SubmitLogResult = "synced" | "queued";

export async function submitFoodLogWithOffline(input: FoodLogInput): Promise<SubmitLogResult> {
  try {
    await createFoodLog(input);
    return "synced";
  } catch {
    await enqueueFoodLog(input);
    return "queued";
  }
}

export async function submitExerciseLogWithOffline(
  input: ExerciseLogInput,
): Promise<SubmitLogResult> {
  try {
    await createExerciseLog(input);
    return "synced";
  } catch {
    await enqueueExerciseLog(input);
    return "queued";
  }
}
