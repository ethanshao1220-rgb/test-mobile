from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

Gender = Literal["male", "female"]
GoalType = Literal["fat_loss", "muscle_gain", "maintain"]
Unit = Literal["g", "ml", "serving"]
Period = Literal["day", "week", "month"]


class ApiResponse[T](BaseModel):
    code: int = 0
    message: str = "ok"
    data: T


class UserProfile(BaseModel):
    id: str
    nickname: str
    gender: Gender
    age: int
    height_cm: float
    current_weight_kg: float
    activity_level: str

    model_config = {"from_attributes": True}


class UserProfileUpdate(BaseModel):
    nickname: str = Field(min_length=1)
    gender: Gender
    age: int = Field(gt=0, lt=120)
    height_cm: float = Field(gt=80, lt=250)
    current_weight_kg: float = Field(gt=20, lt=400)
    activity_level: str


class BodyMetricCreate(BaseModel):
    record_date: date
    weight_kg: float = Field(gt=20, lt=400)
    chest_cm: float | None = Field(default=None, gt=30, lt=250)
    waist_cm: float | None = Field(default=None, gt=30, lt=250)
    hip_cm: float | None = Field(default=None, gt=30, lt=250)


class BodyMetricRead(BodyMetricCreate):
    id: str
    bmi: float
    body_fat_percent: float
    body_fat_formula: str
    bmr: float
    tdee: float

    model_config = {"from_attributes": True}


class PlanCreate(BaseModel):
    goal_type: GoalType
    start_date: date
    end_date: date
    start_weight_kg: float = Field(gt=20, lt=400)
    target_weight_kg: float = Field(gt=20, lt=400)
    exercise_frequency_per_week: int = Field(ge=0, le=14)


class PlanRead(PlanCreate):
    id: str
    daily_calorie_target: float
    daily_calorie_delta: float
    status: str

    model_config = {"from_attributes": True}


class FoodRead(BaseModel):
    id: str
    name: str
    category: str
    unit: Unit
    quantity: float
    calories: float
    protein: float
    carbs: float
    fat: float

    model_config = {"from_attributes": True}


class FoodLogCreate(BaseModel):
    food_name: str = Field(min_length=1)
    calories: float = Field(ge=0)
    protein: float = Field(ge=0)
    carbs: float = Field(ge=0)
    fat: float = Field(ge=0)
    quantity: float = Field(gt=0)
    unit: Unit
    timestamp: datetime


class FoodLogRead(FoodLogCreate):
    id: str

    model_config = {"from_attributes": True}


class ExerciseLogCreate(BaseModel):
    activity_name: str = Field(min_length=1)
    duration_min: int = Field(gt=0, le=1440)
    calories_burned: float = Field(ge=0)
    timestamp: datetime
    note: str | None = None


class ExerciseLogRead(ExerciseLogCreate):
    id: str

    model_config = {"from_attributes": True}


class NutritionSummary(BaseModel):
    protein: float
    carbs: float
    fat: float


class DashboardToday(BaseModel):
    date: date
    target_intake: float
    food_consumed: float
    exercise_burned: float
    remaining_calories: float
    completion_rate: int
    active_plan: PlanRead | None
    nutrition: NutritionSummary


class PlanSummary(BaseModel):
    period: Period
    target_intake: float
    food_consumed: float
    exercise_burned: float
    remaining_calories: float
    daily_delta: float
