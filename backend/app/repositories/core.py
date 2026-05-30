from datetime import date, datetime, time, timedelta
from typing import Literal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import BodyMetric, ExerciseLog, Food, FoodLog, Plan, User

Period = Literal["day", "week", "month"]


def default_unit_options(unit: str) -> list[dict[str, str | float]]:
    mapping: dict[str, list[dict[str, str | float]]] = {
        "燕麦": [{"unit": "g", "label": "克", "ratio": 1}, {"unit": "serving", "label": "份", "ratio": 50}],
        "鸡胸肉": [{"unit": "g", "label": "克", "ratio": 1}, {"unit": "serving", "label": "份", "ratio": 100}],
        "米饭": [{"unit": "g", "label": "克", "ratio": 1}, {"unit": "bowl", "label": "碗", "ratio": 150}],
        "鸡蛋": [{"unit": "g", "label": "克", "ratio": 1}, {"unit": "piece", "label": "个", "ratio": 50}],
        "香蕉": [{"unit": "g", "label": "克", "ratio": 1}, {"unit": "piece", "label": "根", "ratio": 120}],
        "牛奶": [{"unit": "ml", "label": "毫升", "ratio": 1}, {"unit": "cup", "label": "杯", "ratio": 250}],
    }
    return mapping.get(unit, [{"unit": unit, "label": unit, "ratio": 1}])


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


def period_bounds(target_date: date, period: Period) -> tuple[datetime, datetime, int]:
    if period == "week":
        start_date = target_date - timedelta(days=target_date.weekday())
        days = 7
    elif period == "month":
        start_date = target_date.replace(day=1)
        next_month = start_date.replace(year=start_date.year + 1, month=1) if start_date.month == 12 else start_date.replace(month=start_date.month + 1)
        start = datetime.combine(start_date, time.min)
        end = datetime.combine(next_month, time.min)
        return start, end, (end.date() - start.date()).days
    else:
        start_date = target_date
        days = 1
    start = datetime.combine(start_date, time.min)
    end = start + timedelta(days=days)
    return start, end, days


def food_calories_for_range(db: Session, user_id: str, start: datetime, end: datetime) -> float:
    value = db.scalar(
        select(func.coalesce(func.sum(FoodLog.calories), 0)).where(
            FoodLog.user_id == user_id,
            FoodLog.timestamp >= start,
            FoodLog.timestamp < end,
        )
    )
    return float(value or 0)


def exercise_calories_for_range(db: Session, user_id: str, start: datetime, end: datetime) -> float:
    value = db.scalar(
        select(func.coalesce(func.sum(ExerciseLog.calories_burned), 0)).where(
            ExerciseLog.user_id == user_id,
            ExerciseLog.timestamp >= start,
            ExerciseLog.timestamp < end,
        )
    )
    return float(value or 0)


def food_macros_for_day(db: Session, user_id: str, target_date: date) -> tuple[float, float, float]:
    start, end = day_bounds(target_date)
    row = db.execute(
        select(
            func.coalesce(func.sum(FoodLog.protein), 0),
            func.coalesce(func.sum(FoodLog.carbs), 0),
            func.coalesce(func.sum(FoodLog.fat), 0),
        ).where(
            FoodLog.user_id == user_id,
            FoodLog.timestamp >= start,
            FoodLog.timestamp < end,
        )
    ).one()
    return float(row[0] or 0), float(row[1] or 0), float(row[2] or 0)


def food_calories_for_day(db: Session, user_id: str, target_date: date) -> float:
    start, end = day_bounds(target_date)
    return food_calories_for_range(db, user_id, start, end)


def exercise_calories_for_day(db: Session, user_id: str, target_date: date) -> float:
    start, end = day_bounds(target_date)
    return exercise_calories_for_range(db, user_id, start, end)


def seed_foods(db: Session) -> None:
    existing = db.scalars(select(Food)).all()
    if existing:
        changed = False
        for food in existing:
            if not food.unit_options:
                food.unit_options = default_unit_options(food.name)
                changed = True
        if changed:
            db.commit()
        return
    foods = [
        Food(
            name="燕麦",
            category="主食",
            unit="g",
            quantity=100,
            unit_options=[{"unit": "g", "label": "克", "ratio": 1}, {"unit": "serving", "label": "份", "ratio": 50}],
            calories=375,
            protein=12,
            carbs=67,
            fat=7,
        ),
        Food(
            name="鸡胸肉",
            category="蛋白质",
            unit="g",
            quantity=100,
            unit_options=[{"unit": "g", "label": "克", "ratio": 1}, {"unit": "serving", "label": "份", "ratio": 100}],
            calories=165,
            protein=31,
            carbs=0,
            fat=3.6,
        ),
        Food(
            name="米饭",
            category="主食",
            unit="g",
            quantity=100,
            unit_options=[{"unit": "g", "label": "克", "ratio": 1}, {"unit": "bowl", "label": "碗", "ratio": 150}],
            calories=116,
            protein=2.6,
            carbs=25.9,
            fat=0.3,
        ),
        Food(
            name="鸡蛋",
            category="蛋白质",
            unit="g",
            quantity=50,
            unit_options=[{"unit": "g", "label": "克", "ratio": 1}, {"unit": "piece", "label": "个", "ratio": 50}],
            calories=70,
            protein=6,
            carbs=0.6,
            fat=5,
        ),
        Food(
            name="香蕉",
            category="水果",
            unit="g",
            quantity=100,
            unit_options=[{"unit": "g", "label": "克", "ratio": 1}, {"unit": "piece", "label": "根", "ratio": 120}],
            calories=89,
            protein=1.1,
            carbs=22.8,
            fat=0.3,
        ),
        Food(
            name="牛奶",
            category="饮品",
            unit="ml",
            quantity=100,
            unit_options=[{"unit": "ml", "label": "毫升", "ratio": 1}, {"unit": "cup", "label": "杯", "ratio": 250}],
            calories=54,
            protein=3.4,
            carbs=5,
            fat=3.2,
        ),
    ]
    db.add_all(foods)
    db.commit()
