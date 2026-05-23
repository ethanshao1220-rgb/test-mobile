from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Plan
from app.repositories import active_plan, exercise_calories_for_range, food_calories_for_range, get_or_create_user, latest_body_metric, period_bounds
from app.schemas import ApiResponse, Period, PlanCreate, PlanRead, PlanSummary
from app.services.algorithms import calculate_daily_calorie_delta, calculate_remaining_calories, calculate_target_intake

router = APIRouter(prefix="/plans", tags=["plans"])


@router.get("/current", response_model=ApiResponse[PlanRead | None])
def read_current_plan(db: Session = Depends(get_db)) -> ApiResponse[PlanRead | None]:
    user = get_or_create_user(db)
    plan = active_plan(db, user.id)
    return ApiResponse(data=PlanRead.model_validate(plan) if plan else None)


@router.post("/current", response_model=ApiResponse[PlanRead])
def upsert_current_plan(payload: PlanCreate, db: Session = Depends(get_db)) -> ApiResponse[PlanRead]:
    user = get_or_create_user(db)
    metric = latest_body_metric(db, user.id)
    tdee = metric.tdee if metric else 0
    daily_delta = calculate_daily_calorie_delta(payload.start_weight_kg, payload.target_weight_kg, payload.start_date, payload.end_date)
    target = calculate_target_intake(tdee, daily_delta)
    existing = active_plan(db, user.id)
    if existing:
        existing.status = "archived"
    plan = Plan(
        user_id=user.id,
        goal_type=payload.goal_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        start_weight_kg=payload.start_weight_kg,
        target_weight_kg=payload.target_weight_kg,
        exercise_frequency_per_week=payload.exercise_frequency_per_week,
        daily_calorie_delta=daily_delta,
        daily_calorie_target=target,
        status="active",
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return ApiResponse(data=PlanRead.model_validate(plan))


@router.get("/summary", response_model=ApiResponse[PlanSummary])
def read_plan_summary(period: Period = Query(default="day"), target_date: date | None = None, db: Session = Depends(get_db)) -> ApiResponse[PlanSummary]:
    user = get_or_create_user(db)
    plan = active_plan(db, user.id)
    day = target_date or date.today()
    start, end, days = period_bounds(day, period)
    daily_target = plan.daily_calorie_target if plan else 0
    delta = plan.daily_calorie_delta if plan else 0
    target_intake = daily_target * days
    food_consumed = food_calories_for_range(db, user.id, start, end)
    exercise_burned = exercise_calories_for_range(db, user.id, start, end)
    remaining = calculate_remaining_calories(target_intake, exercise_burned, food_consumed)
    return ApiResponse(
        data=PlanSummary(
            period=period,
            target_intake=target_intake,
            food_consumed=food_consumed,
            exercise_burned=exercise_burned,
            remaining_calories=remaining,
            daily_delta=delta,
        )
    )
