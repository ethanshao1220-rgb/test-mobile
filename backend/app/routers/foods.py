from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Food
from app.repositories import seed_foods
from app.schemas import ApiResponse, FoodRead

router = APIRouter(prefix="/foods", tags=["foods"])


@router.get("/search", response_model=ApiResponse[list[FoodRead]])
def search_foods(keyword: str = "", page_size: int = 20, db: Session = Depends(get_db)) -> ApiResponse[list[FoodRead]]:
    seed_foods(db)
    normalized = keyword.strip()
    if not normalized:
        return ApiResponse(data=[])
    rows = db.scalars(select(Food).where(Food.name.contains(normalized)).order_by(Food.name.asc()).limit(page_size)).all()
    return ApiResponse(data=[FoodRead.model_validate(row) for row in rows])
