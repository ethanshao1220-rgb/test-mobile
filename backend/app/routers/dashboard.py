from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories import active_plan, exercise_calories_for_day, food_calories_for_day, get_or_create_user
from app.schemas import ApiResponse, DashboardToday, PlanRead
from app.services.algorithms import calculate_remaining_calories

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/today", response_model=ApiResponse[DashboardToday])
def read_today(target_date: date | None = None, db: Session = Depends(get_db)) -> ApiResponse[DashboardToday]:
    user = get_or_create_user(db)
    day = target_date or date.today()
    plan = active_plan(db, user.id)
    target_intake = plan.daily_calorie_target if plan else 0
    food_consumed = food_calories_for_day(db, user.id, day)
    exercise_burned = exercise_calories_for_day(db, user.id, day)
    remaining = calculate_remaining_calories(target_intake, exercise_burned, food_consumed)
    completion = round(min(food_consumed / target_intake, 1) * 100) if target_intake else 0
    return ApiResponse(
        data=DashboardToday(
            date=day,
            target_intake=target_intake,
            food_consumed=food_consumed,
            exercise_burned=exercise_burned,
            remaining_calories=remaining,
            completion_rate=completion,
            active_plan=PlanRead.model_validate(plan) if plan else None,
            planned_exercises=[],
        )
    )
