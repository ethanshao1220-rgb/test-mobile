from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories import active_plan, exercise_calories_for_day, food_calories_for_day, food_macros_for_day, get_or_create_user
from app.schemas import ApiResponse, DashboardToday, NutritionSummary, PlanRead
from app.services.algorithms import calculate_remaining_calories

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def macro_targets(goal_type: str | None, target_intake: float) -> tuple[float, float, float]:
    ratios = {
        "fat_loss": (0.35, 0.35, 0.30),
        "muscle_gain": (0.30, 0.45, 0.25),
        "maintain": (0.30, 0.40, 0.30),
        None: (0.30, 0.40, 0.30),
    }
    protein_ratio, carb_ratio, fat_ratio = ratios.get(goal_type, ratios[None])
    return (
        round((target_intake * protein_ratio) / 4, 1) if target_intake else 0,
        round((target_intake * carb_ratio) / 4, 1) if target_intake else 0,
        round((target_intake * fat_ratio) / 9, 1) if target_intake else 0,
    )


@router.get("/today", response_model=ApiResponse[DashboardToday])
def read_today(target_date: date | None = None, db: Session = Depends(get_db)) -> ApiResponse[DashboardToday]:
    user = get_or_create_user(db)
    day = target_date or date.today()
    plan = active_plan(db, user.id)
    target_intake = plan.daily_calorie_target if plan else 0
    food_consumed = food_calories_for_day(db, user.id, day)
    exercise_burned = exercise_calories_for_day(db, user.id, day)
    protein, carbs, fat = food_macros_for_day(db, user.id, day)
    protein_target, carbs_target, fat_target = macro_targets(plan.goal_type if plan else None, target_intake)
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
            nutrition=NutritionSummary(
                protein=protein,
                carbs=carbs,
                fat=fat,
                protein_target=protein_target,
                carbs_target=carbs_target,
                fat_target=fat_target,
            ),
        )
    )
