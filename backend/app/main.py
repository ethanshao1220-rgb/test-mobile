from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import Base, SessionLocal, engine
from app.repositories import get_or_create_user, seed_foods
from app.routers.dashboard import router as dashboard_router
from app.routers.foods import router as foods_router
from app.routers.logs import exercise_router, food_router
from app.routers.plans import router as plans_router
from app.routers.profile import body_router
from app.routers.profile import router as profile_router

app = FastAPI(title="FitDiet Mobile API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile_router)
app.include_router(body_router)
app.include_router(plans_router)
app.include_router(dashboard_router)
app.include_router(food_router)
app.include_router(exercise_router)
app.include_router(foods_router)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    if engine.dialect.name == "sqlite":
        with engine.begin() as connection:
            columns = {row[1] for row in connection.execute(text("PRAGMA table_info(foods)")).fetchall()}
            if "unit_options" not in columns:
                connection.execute(text("ALTER TABLE foods ADD COLUMN unit_options JSON"))
    with SessionLocal() as db:
        get_or_create_user(db)
        seed_foods(db)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
