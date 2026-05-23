import { apiRequest } from "@/api/client";
import type { BodyMetric, DashboardToday, Food, Plan, UserProfile } from "@/api/types";

export function getTodayDashboard(): Promise<DashboardToday> {
  return apiRequest<DashboardToday>("/dashboard/today");
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

export function createFoodLog(input: {
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  quantity: number;
  unit: "g" | "ml" | "serving";
  timestamp: string;
}): Promise<unknown> {
  return apiRequest("/food-logs", { method: "POST", body: JSON.stringify(input) });
}

export function createExerciseLog(input: {
  activity_name: string;
  duration_min: number;
  calories_burned: number;
  timestamp: string;
  note?: string;
}): Promise<unknown> {
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