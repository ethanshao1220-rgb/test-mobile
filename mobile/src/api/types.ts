export type Unit = "g" | "ml" | "serving" | "bowl" | "piece" | "cup";
export type Gender = "male" | "female";
export type GoalType = "fat_loss" | "muscle_gain" | "maintain";
export type Period = "day" | "week" | "month";

export type UserProfile = {
  id: string;
  nickname: string;
  gender: Gender;
  age: number;
  height_cm: number;
  current_weight_kg: number;
  activity_level: string;
};

export type BodyMetric = {
  id: string;
  record_date: string;
  weight_kg: number;
  chest_cm?: number | null;
  waist_cm?: number | null;
  hip_cm?: number | null;
  bmi: number;
  body_fat_percent: number;
  body_fat_formula: string;
  bmr: number;
  tdee: number;
};

export type Plan = {
  id: string;
  goal_type: GoalType;
  start_date: string;
  end_date: string;
  start_weight_kg: number;
  target_weight_kg: number;
  exercise_frequency_per_week: number;
  daily_calorie_target: number;
  daily_calorie_delta: number;
  status: string;
};

export type DashboardToday = {
  date: string;
  target_intake: number;
  food_consumed: number;
  exercise_burned: number;
  remaining_calories: number;
  completion_rate: number;
  active_plan: Plan | null;
  nutrition: NutritionSummary;
};

export type NutritionSummary = {
  protein: number;
  carbs: number;
  fat: number;
  protein_target: number;
  carbs_target: number;
  fat_target: number;
};

export type PlanSummary = {
  period: Period;
  target_intake: number;
  food_consumed: number;
  exercise_burned: number;
  remaining_calories: number;
  daily_delta: number;
};

export type FoodLogInput = {
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  quantity: number;
  unit: Unit;
  timestamp: string;
};

export type FoodLog = {
  id: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  quantity: number;
  unit: Unit;
  timestamp: string;
};

export type ExerciseLogInput = {
  activity_name: string;
  duration_min: number;
  calories_burned: number;
  timestamp: string;
  note?: string;
};

export type Food = {
  id: string;
  name: string;
  category: string;
  unit: Unit;
  quantity: number;
  unit_options: FoodUnitOption[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type FoodUnitOption = {
  unit: Unit;
  label: string;
  ratio: number;
};
