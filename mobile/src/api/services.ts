import { apiRequest } from "@/api/client";
import type {
  BodyMetric,
  DashboardToday,
  ExerciseLogInput,
  Food,
  FoodLog,
  FoodLogInput,
  Period,
  Plan,
  PlanSummary,
  UserProfile,
} from "@/api/types";

export function getTodayDashboard(): Promise<DashboardToday> {
  return apiRequest<DashboardToday>("/dashboard/today");
}

export function getPlanSummary(period: Period): Promise<PlanSummary> {
  return apiRequest<PlanSummary>(`/plans/summary?period=${period}`);
}

export function getProfile(): Promise<UserProfile> {
  return apiRequest<UserProfile>("/me");
}

export function getLatestBodyMetric(): Promise<BodyMetric | null> {
  return apiRequest<BodyMetric | null>("/body-metrics/latest");
}

export function searchFoods(keyword: string): Promise<Food[]> {
  return apiRequest<Food[]>(`/foods/search?keyword=${encodeURIComponent(keyword)}`);
}

export function getFoodLogs(targetDate: string): Promise<FoodLog[]> {
  return apiRequest<FoodLog[]>(`/food-logs?target_date=${encodeURIComponent(targetDate)}`);
}

export function createFoodLog(input: FoodLogInput): Promise<unknown> {
  return apiRequest("/food-logs", { method: "POST", body: JSON.stringify(input) });
}

export function createExerciseLog(input: ExerciseLogInput): Promise<unknown> {
  return apiRequest("/exercise-logs", { method: "POST", body: JSON.stringify(input) });
}

export function createBodyMetric(input: {
  record_date: string;
  weight_kg: number;
  chest_cm?: number;
  waist_cm?: number;
  hip_cm?: number;
}): Promise<BodyMetric> {
  return apiRequest<BodyMetric>("/body-metrics", { method: "POST", body: JSON.stringify(input) });
}

export function createPlan(input: {
  goal_type: "fat_loss" | "muscle_gain" | "maintain";
  start_date: string;
  end_date: string;
  start_weight_kg: number;
  target_weight_kg: number;
  exercise_frequency_per_week: number;
}): Promise<Plan> {
  return apiRequest<Plan>("/plans/current", { method: "POST", body: JSON.stringify(input) });
}
