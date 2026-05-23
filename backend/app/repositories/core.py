from datetime import date, datetime, time, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import BodyMetric, ExerciseLog, Food, FoodLog, Plan, User


def get_or_create_user(db: Session) -> User:
    user = db.get(User, settings.default_user_id)
    if user:
        return user
    user = User(
        id=settings.default_user_id,
        nickname="Alex",
        gender="male",
        age=26,
        height_cm=178,
        current_weight_kg=72.5,
        activity_level="moderate",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def latest_body_metric(db: Session, user_id: str) -> BodyMetric | None:
    return db.scalars(select(BodyMetric).where(BodyMetric.user_id == user_id).order_by(BodyMetric.record_date.desc(), BodyMetric.created_at.desc())).first()


def active_plan(db: Session, user_id: str) -> Plan | None:
    return db.scalars(select(Plan).where(Plan.user_id == user_id, Plan.status == "active").order_by(Plan.created_at.desc())).first()


def day_bounds(target_date: date) -> tuple[datetime, datetime]:
    start = datetime.combine(target_date, time.min)
    end = start + timedelta(days=1)
    return start, end


def food_calories_for_day(db: Session, user_id: str, target_date: date) -> float:
    start, end = day_bounds(target_date)
    value = db.scalar(
        select(func.coalesce(func.sum(FoodLog.calories), 0)).where(
            FoodLog.user_id == user_id,
            FoodLog.timestamp >= start,
            FoodLog.timestamp < end,
        )
    )
    return float(value or 0)


def exercise_calories_for_day(db: Session, user_id: str, target_date: date) -> float:
    start, end = day_bounds(target_date)
    value = db.scalar(
        select(func.coalesce(func.sum(ExerciseLog.calories_burned), 0)).where(
            ExerciseLog.user_id == user_id,
            ExerciseLog.timestamp >= start,
            ExerciseLog.timestamp < end,
        )
    )
    return float(value or 0)


def seed_foods(db: Session) -> None:
    if db.scalar(select(func.count(Food.id))):
        return
    foods = [
        Food(name="燕麦", category="主食", unit="g", quantity=100, calories=375, protein=12, carbs=67, fat=7),
        Food(name="鸡胸肉", category="蛋白质", unit="g", quantity=100, calories=165, protein=31, carbs=0, fat=3.6),
        Food(name="米饭", category="主食", unit="g", quantity=100, calories=116, protein=2.6, carbs=25.9, fat=0.3),
        Food(name="鸡蛋", category="蛋白质", unit="serving", quantity=1, calories=70, protein=6, carbs=0.6, fat=5),
        Food(name="香蕉", category="水果", unit="g", quantity=100, calories=89, protein=1.1, carbs=22.8, fat=0.3),
        Food(name="牛奶", category="饮品", unit="ml", quantity=100, calories=54, protein=3.4, carbs=5, fat=3.2),
    ]
    db.add_all(foods)
    db.commit()
