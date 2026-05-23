from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import BodyMetric
from app.repositories import get_or_create_user, latest_body_metric
from app.schemas import ApiResponse, BodyMetricCreate, BodyMetricRead, UserProfile, UserProfileUpdate
from app.services.algorithms import calculate_body_algorithms

router = APIRouter(prefix="/me", tags=["profile"])


@router.get("", response_model=ApiResponse[UserProfile])
def read_profile(db: Session = Depends(get_db)) -> ApiResponse[UserProfile]:
    user = get_or_create_user(db)
    return ApiResponse(data=UserProfile.model_validate(user))


@router.patch("", response_model=ApiResponse[UserProfile])
def update_profile(payload: UserProfileUpdate, db: Session = Depends(get_db)) -> ApiResponse[UserProfile]:
    user = get_or_create_user(db)
    user.nickname = payload.nickname
    user.gender = payload.gender
    user.age = payload.age
    user.height_cm = payload.height_cm
    user.current_weight_kg = payload.current_weight_kg
    user.activity_level = payload.activity_level
    db.commit()
    db.refresh(user)
    return ApiResponse(data=UserProfile.model_validate(user))


body_router = APIRouter(prefix="/body-metrics", tags=["body"])


@body_router.get("", response_model=ApiResponse[list[BodyMetricRead]])
def list_body_metrics(db: Session = Depends(get_db)) -> ApiResponse[list[BodyMetricRead]]:
    user = get_or_create_user(db)
    rows = db.scalars(select(BodyMetric).where(BodyMetric.user_id == user.id).order_by(BodyMetric.record_date.desc())).all()
    return ApiResponse(data=[BodyMetricRead.model_validate(row) for row in rows])


@body_router.post("", response_model=ApiResponse[BodyMetricRead])
def create_body_metric(payload: BodyMetricCreate, db: Session = Depends(get_db)) -> ApiResponse[BodyMetricRead]:
    user = get_or_create_user(db)
    result = calculate_body_algorithms(
        gender=user.gender,
        age=user.age,
        height_cm=user.height_cm,
        weight_kg=payload.weight_kg,
        activity_level=user.activity_level,
        waist_cm=payload.waist_cm,
        hip_cm=payload.hip_cm,
    )
    metric = BodyMetric(
        user_id=user.id,
        record_date=payload.record_date or date.today(),
        weight_kg=payload.weight_kg,
        chest_cm=payload.chest_cm,
        waist_cm=payload.waist_cm,
        hip_cm=payload.hip_cm,
        bmi=result.bmi,
        body_fat_percent=result.body_fat_percent,
        body_fat_formula=result.body_fat_formula,
        bmr=result.bmr,
        tdee=result.tdee,
    )
    user.current_weight_kg = payload.weight_kg
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return ApiResponse(data=BodyMetricRead.model_validate(metric))


@body_router.get("/latest", response_model=ApiResponse[BodyMetricRead | None])
def read_latest_body_metric(db: Session = Depends(get_db)) -> ApiResponse[BodyMetricRead | None]:
    user = get_or_create_user(db)
    metric = latest_body_metric(db, user.id)
    return ApiResponse(data=BodyMetricRead.model_validate(metric) if metric else None)