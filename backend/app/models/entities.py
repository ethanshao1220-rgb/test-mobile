from datetime import date, datetime
from typing import Literal
from uuid import uuid4

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

Gender = Literal["male", "female"]
GoalType = Literal["fat_loss", "muscle_gain", "maintain"]
Unit = Literal["g", "ml", "serving"]


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    nickname: Mapped[str] = mapped_column(String, nullable=False)
    gender: Mapped[str] = mapped_column(String, nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    height_cm: Mapped[float] = mapped_column(Float, nullable=False)
    current_weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    activity_level: Mapped[str] = mapped_column(String, nullable=False, default="moderate")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    body_metrics: Mapped[list[BodyMetric]] = relationship(back_populates="user")
    plans: Mapped[list[Plan]] = relationship(back_populates="user")


class BodyMetric(Base):
    __tablename__ = "body_metrics"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: new_id("body"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    record_date: Mapped[date] = mapped_column(Date, nullable=False)
    weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    chest_cm: Mapped[float | None] = mapped_column(Float)
    waist_cm: Mapped[float | None] = mapped_column(Float)
    hip_cm: Mapped[float | None] = mapped_column(Float)
    bmi: Mapped[float] = mapped_column(Float, nullable=False)
    body_fat_percent: Mapped[float] = mapped_column(Float, nullable=False)
    body_fat_formula: Mapped[str] = mapped_column(String, nullable=False)
    bmr: Mapped[float] = mapped_column(Float, nullable=False)
    tdee: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped[User] = relationship(back_populates="body_metrics")


class Food(Base):
    __tablename__ = "foods"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: new_id("food"))
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    category: Mapped[str] = mapped_column(String, nullable=False)
    unit: Mapped[str] = mapped_column(String, nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    calories: Mapped[float] = mapped_column(Float, nullable=False)
    protein: Mapped[float] = mapped_column(Float, nullable=False)
    carbs: Mapped[float] = mapped_column(Float, nullable=False)
    fat: Mapped[float] = mapped_column(Float, nullable=False)


class FoodLog(Base):
    __tablename__ = "food_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: new_id("meal"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    food_name: Mapped[str] = mapped_column(String, nullable=False)
    calories: Mapped[float] = mapped_column(Float, nullable=False)
    protein: Mapped[float] = mapped_column(Float, nullable=False)
    carbs: Mapped[float] = mapped_column(Float, nullable=False)
    fat: Mapped[float] = mapped_column(Float, nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class ExerciseLog(Base):
    __tablename__ = "exercise_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: new_id("exercise"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    activity_name: Mapped[str] = mapped_column(String, nullable=False)
    duration_min: Mapped[int] = mapped_column(Integer, nullable=False)
    calories_burned: Mapped[float] = mapped_column(Float, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    note: Mapped[str | None] = mapped_column(Text)


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: new_id("plan"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    goal_type: Mapped[str] = mapped_column(String, nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    start_weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    target_weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    exercise_frequency_per_week: Mapped[int] = mapped_column(Integer, nullable=False)
    daily_calorie_target: Mapped[float] = mapped_column(Float, nullable=False)
    daily_calorie_delta: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    user: Mapped[User] = relationship(back_populates="plans")


class PlannedExercise(Base):
    __tablename__ = "planned_exercises"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: new_id("planned_exercise"))
    plan_id: Mapped[str] = mapped_column(ForeignKey("plans.id"), nullable=False)
    activity_name: Mapped[str] = mapped_column(String, nullable=False)
    sessions_per_week: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_min: Mapped[int] = mapped_column(Integer, nullable=False)
    estimated_calories: Mapped[float] = mapped_column(Float, nullable=False)
