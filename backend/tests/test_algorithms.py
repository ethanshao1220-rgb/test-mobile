from datetime import date

from app.services.algorithms import (
    calculate_bmi,
    calculate_bmr,
    calculate_daily_calorie_delta,
    calculate_remaining_calories,
    calculate_target_intake,
    calculate_tdee,
)


def test_body_algorithms() -> None:
    assert calculate_bmi(72.5, 178) == 22.9
    assert calculate_bmr("male", 26, 178, 72.5) == 1712.5
    assert calculate_tdee(1712.5, "moderate") == 2654.4


def test_plan_delta_and_remaining_calories() -> None:
    delta = calculate_daily_calorie_delta(75, 70, date(2026, 5, 1), date(2026, 5, 30))
    assert delta == -1283.3
    target = calculate_target_intake(2600, delta)
    assert target == 1316.7
    assert calculate_remaining_calories(target, 300, 800) == 816.7
