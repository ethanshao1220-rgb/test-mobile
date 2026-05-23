from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Plan
from app.repositories import active_plan, get_or_create_user, latest_body_metric
from app.schemas import ApiResponse, PlanCreate, PlanRead, PlanSummary
from app.services.algorithms import calculate_daily_calorie_delta, calculate_target_intake

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
def read_plan_summary(period: str = "day", db: Session = Depends(get_db)) -> ApiResponse[PlanSummary]:
    user = get_or_create_user(db)
    plan = active_plan(db, user.id)
    target = plan.daily_calorie_target if plan else 0
    delta = plan.daily_calorie_delta if plan else 0
    multiplier = {"day": 1, "week": 7, "month": 30}.get(period, 1)
    return ApiResponse(data=PlanSummary(period=period, target_intake=target * multiplier, food_consumed=0, exercise_burned=0, remaining_calories=target * multiplier, daily_delta=delta))