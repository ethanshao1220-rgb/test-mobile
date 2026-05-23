from dataclasses import dataclass
from datetime import date

ACTIVITY_FACTORS = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "active": 1.725,
    "very_active": 1.9,
}
KCAL_PER_KG = 7700


@dataclass(frozen=True)
class BodyAlgorithmResult:
    bmi: float
    body_fat_percent: float
    body_fat_formula: str
    bmr: float
    tdee: float


def round_one(value: float) -> float:
    return round(value, 1)


def calculate_bmi(weight_kg: float, height_cm: float) -> float:
    height_m = height_cm / 100
    return round_one(weight_kg / (height_m * height_m))


def calculate_bmr(gender: str, age: int, height_cm: float, weight_kg: float) -> float:
    base = 10 * weight_kg + 6.25 * height_cm - 5 * age
    offset = 5 if gender == "male" else -161
    return round_one(base + offset)


def calculate_body_fat_percent(gender: str, age: int, bmi: float, waist_cm: float | None = None, hip_cm: float | None = None) -> tuple[float, str]:
    gender_factor = 1 if gender == "male" else 0
    deurenberg = 1.2 * bmi + 0.23 * age - 10.8 * gender_factor - 5.4
    if waist_cm and hip_cm:
        waist_hip_ratio = waist_cm / hip_cm
        adjustment = (waist_hip_ratio - (0.9 if gender == "male" else 0.8)) * 12
        return round_one(max(deurenberg + adjustment, 3)), "deurenberg_waist_hip_adjusted"
    return round_one(max(deurenberg, 3)), "deurenberg"


def calculate_tdee(bmr: float, activity_level: str) -> float:
    factor = ACTIVITY_FACTORS.get(activity_level, ACTIVITY_FACTORS["moderate"])
    return round_one(bmr * factor)


def calculate_body_algorithms(
    *,
    gender: str,
    age: int,
    height_cm: float,
    weight_kg: float,
    activity_level: str,
    waist_cm: float | None = None,
    hip_cm: float | None = None,
) -> BodyAlgorithmResult:
    bmi = calculate_bmi(weight_kg, height_cm)
    body_fat_percent, formula = calculate_body_fat_percent(gender, age, bmi, waist_cm, hip_cm)
    bmr = calculate_bmr(gender, age, height_cm, weight_kg)
    tdee = calculate_tdee(bmr, activity_level)
    return BodyAlgorithmResult(bmi=bmi, body_fat_percent=body_fat_percent, body_fat_formula=formula, bmr=bmr, tdee=tdee)


def calculate_daily_calorie_delta(start_weight_kg: float, target_weight_kg: float, start_date: date, end_date: date) -> float:
    days = max((end_date - start_date).days + 1, 1)
    return round_one((target_weight_kg - start_weight_kg) * KCAL_PER_KG / days)


def calculate_target_intake(tdee: float, daily_delta: float) -> float:
    return round_one(tdee + daily_delta)


def calculate_remaining_calories(target_intake: float, exercise_burned: float, food_consumed: float) -> float:
    return round_one(target_intake + exercise_burned - food_consumed)
