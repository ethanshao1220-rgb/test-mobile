from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ExerciseLog, FoodLog
from app.repositories import day_bounds, get_or_create_user
from app.schemas import ApiResponse, ExerciseLogCreate, ExerciseLogRead, FoodLogCreate, FoodLogRead

food_router = APIRouter(prefix="/food-logs", tags=["food logs"])
exercise_router = APIRouter(prefix="/exercise-logs", tags=["exercise logs"])


@food_router.get("", response_model=ApiResponse[list[FoodLogRead]])
def list_food_logs(target_date: date | None = None, db: Session = Depends(get_db)) -> ApiResponse[list[FoodLogRead]]:
    user = get_or_create_user(db)
    if target_date:
        start, end = day_bounds(target_date)
        rows = db.scalars(select(FoodLog).where(FoodLog.user_id == user.id, FoodLog.timestamp >= start, FoodLog.timestamp < end).order_by(FoodLog.timestamp.desc())).all()
    else:
        rows = db.scalars(select(FoodLog).where(FoodLog.user_id == user.id).order_by(FoodLog.timestamp.desc())).all()
    return ApiResponse(data=[FoodLogRead.model_validate(row) for row in rows])


@food_router.post("", response_model=ApiResponse[FoodLogRead])
def create_food_log(payload: FoodLogCreate, db: Session = Depends(get_db)) -> ApiResponse[FoodLogRead]:
    user = get_or_create_user(db)
    log = FoodLog(user_id=user.id, **payload.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return ApiResponse(data=FoodLogRead.model_validate(log))


@exercise_router.get("", response_model=ApiResponse[list[ExerciseLogRead]])
def list_exercise_logs(target_date: date | None = None, db: Session = Depends(get_db)) -> ApiResponse[list[ExerciseLogRead]]:
    user = get_or_create_user(db)
    if target_date:
        start, end = day_bounds(target_date)
        rows = db.scalars(select(ExerciseLog).where(ExerciseLog.user_id == user.id, ExerciseLog.timestamp >= start, ExerciseLog.timestamp < end).order_by(ExerciseLog.timestamp.desc())).all()
    else:
        rows = db.scalars(select(ExerciseLog).where(ExerciseLog.user_id == user.id).order_by(ExerciseLog.timestamp.desc())).all()
    return ApiResponse(data=[ExerciseLogRead.model_validate(row) for row in rows])


@exercise_router.post("", response_model=ApiResponse[ExerciseLogRead])
def create_exercise_log(payload: ExerciseLogCreate, db: Session = Depends(get_db)) -> ApiResponse[ExerciseLogRead]:
    user = get_or_create_user(db)
    log = ExerciseLog(user_id=user.id, **payload.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return ApiResponse(data=ExerciseLogRead.model_validate(log))