#!/usr/bin/env python3
import json
import os
import sqlite3
from datetime import UTC, date, datetime, timedelta
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DIR = ROOT / "public"
DATA_DIR = Path(__file__).resolve().parent / "data"
DB_PATH = DATA_DIR / "app.db"
USER_ID = "u_001"
PORT = int(os.environ.get("PORT", "3000"))

DATA_DIR.mkdir(parents=True, exist_ok=True)


def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def now_iso():
    return datetime.now(UTC).isoformat()


def today_iso():
    return date.today().isoformat()


def add_days(day: str, days: int) -> str:
    return (date.fromisoformat(day) + timedelta(days=days)).isoformat()


def start_of_week(day: str | None = None) -> str:
    d = date.fromisoformat(day or today_iso())
    return (d - timedelta(days=d.weekday())).isoformat()


def row_to_dict(row):
    return dict(row) if row else None


def round_num(value, digits=1):
    return round(float(value or 0), digits)


def init_db():
    with connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              nickname TEXT NOT NULL,
              gender TEXT NOT NULL,
              age INTEGER NOT NULL,
              height_cm REAL NOT NULL,
              current_weight_kg REAL NOT NULL,
              goal_type TEXT NOT NULL,
              daily_calorie_target REAL NOT NULL,
              daily_protein_target_g REAL NOT NULL,
              daily_carb_target_g REAL NOT NULL,
              daily_fat_target_g REAL NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS user_settings (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              unit_system TEXT NOT NULL,
              reminder_enabled INTEGER NOT NULL,
              theme_mode TEXT NOT NULL,
              default_home_tab TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              FOREIGN KEY(user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS foods (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              category TEXT NOT NULL,
              brand_name TEXT,
              is_user_created INTEGER NOT NULL DEFAULT 0,
              owner_user_id TEXT,
              base_unit TEXT NOT NULL,
              base_amount REAL NOT NULL,
              calorie REAL NOT NULL,
              protein_g REAL NOT NULL,
              carb_g REAL NOT NULL,
              fat_g REAL NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS food_logs (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              food_id TEXT NOT NULL,
              log_date TEXT NOT NULL,
              meal_type TEXT NOT NULL,
              amount REAL NOT NULL,
              unit TEXT NOT NULL,
              calorie REAL NOT NULL,
              protein_g REAL NOT NULL,
              carb_g REAL NOT NULL,
              fat_g REAL NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              FOREIGN KEY(user_id) REFERENCES users(id),
              FOREIGN KEY(food_id) REFERENCES foods(id)
            );

            CREATE TABLE IF NOT EXISTS weight_logs (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              weight_kg REAL NOT NULL,
              record_date TEXT NOT NULL,
              note TEXT,
              created_at TEXT NOT NULL,
              UNIQUE(user_id, record_date),
              FOREIGN KEY(user_id) REFERENCES users(id)
            );
            """
        )
        now = now_iso()
        exists = conn.execute("SELECT id FROM users WHERE id = ?", (USER_ID,)).fetchone()
        if not exists:
            conn.execute(
                "INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (USER_ID, "Alex", "male", 26, 178, 72.5, "fat_loss", 2100, 145, 220, 60, now, now),
            )
            conn.execute(
                "INSERT INTO user_settings VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                ("settings_001", USER_ID, "metric", 1, "light", "data", now, now),
            )
        food_count = conn.execute("SELECT COUNT(*) count FROM foods").fetchone()["count"]
        if food_count == 0:
            foods = [
                ("food_001", "燕麦", "主食", None, 0, None, "g", 100, 375, 12, 67, 7),
                ("food_002", "鸡胸肉", "蛋白质", None, 0, None, "g", 100, 165, 31, 0, 3.6),
                ("food_003", "米饭", "主食", None, 0, None, "g", 100, 116, 2.6, 25.9, 0.3),
                ("food_004", "鸡蛋", "蛋白质", None, 0, None, "piece", 1, 70, 6, 0.6, 5),
                ("food_005", "香蕉", "水果", None, 0, None, "g", 100, 89, 1.1, 22.8, 0.3),
                ("food_006", "西兰花", "蔬菜", None, 0, None, "g", 100, 34, 2.8, 6.6, 0.4),
                ("food_007", "乳清蛋白", "补剂", None, 0, None, "g", 30, 120, 24, 3, 2),
                ("food_008", "牛肉", "蛋白质", None, 0, None, "g", 100, 250, 26, 0, 15),
                ("food_009", "全麦面包", "主食", None, 0, None, "g", 100, 247, 13, 41, 4.2),
                ("food_010", "牛奶", "饮品", None, 0, None, "ml", 100, 54, 3.4, 5, 3.2),
            ]
            conn.executemany(
                "INSERT INTO foods VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [(*food, now, now) for food in foods],
            )


def get_user(conn):
    return row_to_dict(conn.execute("SELECT * FROM users WHERE id = ?", (USER_ID,)).fetchone())


def get_settings(conn):
    row = row_to_dict(conn.execute("SELECT unit_system, reminder_enabled, theme_mode, default_home_tab FROM user_settings WHERE user_id = ?", (USER_ID,)).fetchone())
    row["reminder_enabled"] = bool(row["reminder_enabled"])
    return row


def food_totals(conn, log_date):
    row = conn.execute(
        """
        SELECT COALESCE(SUM(calorie),0) calorie,
               COALESCE(SUM(protein_g),0) protein_g,
               COALESCE(SUM(carb_g),0) carb_g,
               COALESCE(SUM(fat_g),0) fat_g
        FROM food_logs WHERE user_id = ? AND log_date = ?
        """,
        (USER_ID, log_date),
    ).fetchone()
    return {"calorie": round_num(row["calorie"]), "protein_g": round_num(row["protein_g"]), "carb_g": round_num(row["carb_g"]), "fat_g": round_num(row["fat_g"])}


def completion_for_date(conn, log_date, user=None):
    user = user or get_user(conn)
    totals = food_totals(conn, log_date)
    if not user["daily_calorie_target"]:
        return 0
    calorie_score = min(totals["calorie"] / user["daily_calorie_target"], 1)
    protein_score = min(totals["protein_g"] / user["daily_protein_target_g"], 1)
    return round((calorie_score * 0.65 + protein_score * 0.35) * 100)


def advice_for(totals, user):
    advice = []
    if totals["calorie"] == 0:
        advice.append("今天还没有记录饮食，先添加第一餐")
    if totals["protein_g"] < user["daily_protein_target_g"] * 0.6:
        advice.append("今日蛋白质摄入偏低，下一餐优先补充优质蛋白")
    if totals["calorie"] > user["daily_calorie_target"]:
        advice.append("今日热量已经超过目标，后续尽量选择低脂高蛋白食物")
    if not advice:
        advice.append("今日执行不错，继续保持当前饮食节奏")
    return advice[:2]


def calculate_nutrition(food, amount):
    ratio = float(amount) / float(food["base_amount"])
    return {
        "calorie": round_num(food["calorie"] * ratio),
        "protein_g": round_num(food["protein_g"] * ratio),
        "carb_g": round_num(food["carb_g"] * ratio),
        "fat_g": round_num(food["fat_g"] * ratio),
    }


def food_log_list(conn, log_date):
    rows = conn.execute(
        """
        SELECT fl.*, f.name food_name
        FROM food_logs fl JOIN foods f ON f.id = fl.food_id
        WHERE fl.user_id = ? AND fl.log_date = ?
        ORDER BY fl.created_at DESC
        """,
        (USER_ID, log_date),
    ).fetchall()
    return [
        {
            "id": row["id"],
            "meal_type": row["meal_type"],
            "food_id": row["food_id"],
            "food_name": row["food_name"],
            "amount": row["amount"],
            "unit": row["unit"],
            "calorie": round_num(row["calorie"]),
            "protein_g": round_num(row["protein_g"]),
            "carb_g": round_num(row["carb_g"]),
            "fat_g": round_num(row["fat_g"]),
        }
        for row in rows
    ]


def weekly_summary(conn, week_start):
    user = get_user(conn)
    days = [add_days(week_start, i) for i in range(7)]
    daily = []
    for item_date in days:
        totals = food_totals(conn, item_date)
        completion = completion_for_date(conn, item_date, user)
        calorie_status = "below_target"
        if totals["calorie"] > user["daily_calorie_target"] * 1.05:
            calorie_status = "over_target"
        elif user["daily_calorie_target"] * 0.85 <= totals["calorie"] <= user["daily_calorie_target"] * 1.05:
            calorie_status = "within_target"
        daily.append({"date": item_date, "completion_rate": completion, "calorie_status": calorie_status})
    completion = round(sum(item["completion_rate"] for item in daily) / 7)
    first_weight = conn.execute(
        "SELECT weight_kg FROM weight_logs WHERE user_id = ? AND record_date >= ? AND record_date <= ? ORDER BY record_date ASC LIMIT 1",
        (USER_ID, week_start, add_days(week_start, 6)),
    ).fetchone()
    last_weight = conn.execute(
        "SELECT weight_kg FROM weight_logs WHERE user_id = ? AND record_date >= ? AND record_date <= ? ORDER BY record_date DESC LIMIT 1",
        (USER_ID, week_start, add_days(week_start, 6)),
    ).fetchone()
    weight_change = round_num(last_weight["weight_kg"] - first_weight["weight_kg"]) if first_weight and last_weight else 0
    return {"completion": completion, "daily": daily, "weight_change": weight_change}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC_DIR), **kwargs)

    def send_json(self, data, status=200):
        payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def ok(self, data=None):
        self.send_json({"code": 0, "message": "ok", "data": data or {}})

    def fail(self, message="invalid parameter", status=400, code=4001):
        self.send_json({"code": code, "message": message, "data": None}, status)

    def read_body(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length == 0:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = {key: values[0] for key, values in parse_qs(parsed.query).items()}
        try:
            if not path.startswith("/api/"):
                if path == "/" or not (PUBLIC_DIR / path.lstrip("/")).exists():
                    self.path = "/index.html"
                return super().do_GET()
            with connect() as conn:
                if path == "/api/me":
                    data = get_user(conn)
                    data["profile_completed"] = True
                    return self.ok(data)
                if path == "/api/settings":
                    return self.ok(get_settings(conn))
                if path == "/api/dashboard/today":
                    target_date = query.get("date") or today_iso()
                    user = get_user(conn)
                    totals = food_totals(conn, target_date)
                    week_start = start_of_week(target_date)
                    week = weekly_summary(conn, week_start)
                    return self.ok({
                        "date": target_date,
                        "goal_type": user["goal_type"],
                        "completion_rate": completion_for_date(conn, target_date, user),
                        "calories": {"target": user["daily_calorie_target"], "consumed": totals["calorie"], "remaining": round_num(user["daily_calorie_target"] - totals["calorie"])},
                        "macros": {
                            "protein": {"target": user["daily_protein_target_g"], "consumed": totals["protein_g"], "remaining": round_num(user["daily_protein_target_g"] - totals["protein_g"])},
                            "carb": {"target": user["daily_carb_target_g"], "consumed": totals["carb_g"], "remaining": round_num(user["daily_carb_target_g"] - totals["carb_g"])},
                            "fat": {"target": user["daily_fat_target_g"], "consumed": totals["fat_g"], "remaining": round_num(user["daily_fat_target_g"] - totals["fat_g"])},
                        },
                        "advice": advice_for(totals, user),
                        "weekly_report_entry": {"week_start": week_start, "week_end": add_days(week_start, 6), "summary": f"本周平均完成度 {week['completion']}%"},
                    })
                if path == "/api/reports/weekly":
                    current_start = query.get("week_start") or start_of_week()
                    previous_start = add_days(current_start, -7)
                    current = weekly_summary(conn, current_start)
                    previous = weekly_summary(conn, previous_start)
                    return self.ok({
                        "week_start": current_start,
                        "week_end": add_days(current_start, 6),
                        "comparison": {
                            "current_week_completion_rate": current["completion"],
                            "previous_week_completion_rate": previous["completion"],
                            "completion_rate_diff": current["completion"] - previous["completion"],
                            "current_week_weight_change_kg": current["weight_change"],
                            "previous_week_weight_change_kg": previous["weight_change"],
                        },
                        "summary": {
                            "title": "本周执行优于上周" if current["completion"] >= previous["completion"] else "本周执行需要加强",
                            "text": "整体饮食记录和目标执行较稳定。" if current["completion"] >= 70 else "本周完成度偏低，建议优先保证每日记录完整。",
                        },
                        "daily_breakdown": current["daily"],
                        "advice": ["继续保持记录习惯", "关注蛋白质摄入是否达标"] if current["completion"] >= 70 else ["优先完成每餐记录", "从早餐开始补足蛋白质"],
                    })
                if path == "/api/food-logs":
                    target_date = query.get("date") or today_iso()
                    return self.ok({"date": target_date, "items": food_log_list(conn, target_date), "totals": food_totals(conn, target_date)})
                if path == "/api/foods":
                    keyword = f"%{query.get('keyword', '')}%"
                    limit = int(query.get("page_size", "20"))
                    rows = conn.execute(
                        """
                        SELECT id, name, category, base_unit, base_amount, calorie, protein_g, carb_g, fat_g, is_user_created
                        FROM foods
                        WHERE name LIKE ? AND (is_user_created = 0 OR owner_user_id = ?)
                        ORDER BY is_user_created DESC, name ASC
                        LIMIT ?
                        """,
                        (keyword, USER_ID, limit),
                    ).fetchall()
                    return self.ok({"items": [{**row_to_dict(row), "is_user_created": bool(row["is_user_created"])} for row in rows]})
                if path.startswith("/api/foods/"):
                    food_id = unquote(path.rsplit("/", 1)[-1])
                    row = conn.execute("SELECT * FROM foods WHERE id = ? AND (is_user_created = 0 OR owner_user_id = ?)", (food_id, USER_ID)).fetchone()
                    if not row:
                        return self.fail("food not found", 404, 4041)
                    data = row_to_dict(row)
                    data["is_user_created"] = bool(data["is_user_created"])
                    return self.ok(data)
                if path == "/api/weight-logs":
                    start = query.get("start_date") or add_days(today_iso(), -30)
                    end = query.get("end_date") or today_iso()
                    rows = conn.execute("SELECT * FROM weight_logs WHERE user_id = ? AND record_date >= ? AND record_date <= ? ORDER BY record_date DESC", (USER_ID, start, end)).fetchall()
                    return self.ok({"items": [row_to_dict(row) for row in rows]})
            return self.fail("not found", 404, 4040)
        except Exception as exc:
            return self.fail(str(exc), 500, 5000)

    def do_POST(self):
        self.handle_mutation("POST")

    def do_PATCH(self):
        self.handle_mutation("PATCH")

    def do_DELETE(self):
        self.handle_mutation("DELETE")

    def handle_mutation(self, method):
        parsed = urlparse(self.path)
        path = parsed.path
        body = self.read_body() if method != "DELETE" else {}
        try:
            with connect() as conn:
                if method == "PATCH" and path == "/api/me":
                    current = get_user(conn)
                    next_user = {**current, **body}
                    conn.execute(
                        "UPDATE users SET nickname=?, gender=?, age=?, height_cm=?, current_weight_kg=?, updated_at=? WHERE id=?",
                        (next_user["nickname"], next_user["gender"], next_user["age"], next_user["height_cm"], next_user["current_weight_kg"], now_iso(), USER_ID),
                    )
                    return self.ok(get_user(conn))
                if method == "PATCH" and path == "/api/settings":
                    current = get_settings(conn)
                    next_settings = {**current, **body}
                    conn.execute(
                        "UPDATE user_settings SET unit_system=?, reminder_enabled=?, theme_mode=?, default_home_tab=?, updated_at=? WHERE user_id=?",
                        (next_settings.get("unit_system", "metric"), 1 if next_settings.get("reminder_enabled") else 0, next_settings.get("theme_mode", "light"), next_settings.get("default_home_tab", "data"), now_iso(), USER_ID),
                    )
                    return self.ok(get_settings(conn))
                if method == "POST" and path == "/api/goals/recalculate":
                    weight = float(body.get("current_weight_kg") or get_user(conn)["current_weight_kg"])
                    goal_type = body.get("goal_type") or get_user(conn)["goal_type"]
                    calorie = round(weight * (35 if goal_type == "muscle_gain" else 29))
                    protein = round(weight * 2)
                    fat = round(weight * 0.8)
                    carb = round((calorie - protein * 4 - fat * 9) / 4)
                    return self.ok({"recommended": {"daily_calorie_target": calorie, "daily_protein_target_g": protein, "daily_carb_target_g": carb, "daily_fat_target_g": fat}})
                if method == "PATCH" and path == "/api/goals/current":
                    conn.execute(
                        "UPDATE users SET goal_type=?, daily_calorie_target=?, daily_protein_target_g=?, daily_carb_target_g=?, daily_fat_target_g=?, updated_at=? WHERE id=?",
                        (body["goal_type"], body["daily_calorie_target"], body["daily_protein_target_g"], body["daily_carb_target_g"], body["daily_fat_target_g"], now_iso(), USER_ID),
                    )
                    return self.ok(get_user(conn))
                if method == "POST" and path == "/api/food-logs":
                    food = conn.execute("SELECT * FROM foods WHERE id = ?", (body.get("food_id"),)).fetchone()
                    if not food:
                        return self.fail("food not found")
                    amount = float(body.get("amount") or 0)
                    if amount <= 0:
                        return self.fail("amount must be greater than 0")
                    nutrition = calculate_nutrition(food, amount)
                    log_id = f"log_{int(datetime.now(UTC).timestamp() * 1000)}"
                    conn.execute(
                        "INSERT INTO food_logs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        (log_id, USER_ID, food["id"], body.get("date") or today_iso(), body.get("meal_type") or "snack", amount, body.get("unit") or food["base_unit"], nutrition["calorie"], nutrition["protein_g"], nutrition["carb_g"], nutrition["fat_g"], now_iso(), now_iso()),
                    )
                    return self.ok({"id": log_id, "meal_type": body.get("meal_type") or "snack", "food_id": food["id"], "food_name": food["name"], "amount": amount, "unit": body.get("unit") or food["base_unit"], **nutrition})
                if path.startswith("/api/food-logs/"):
                    log_id = unquote(path.rsplit("/", 1)[-1])
                    log = conn.execute("SELECT * FROM food_logs WHERE id = ? AND user_id = ?", (log_id, USER_ID)).fetchone()
                    if not log:
                        return self.fail("log not found", 404, 4041)
                    if method == "PATCH":
                        food = conn.execute("SELECT * FROM foods WHERE id = ?", (log["food_id"],)).fetchone()
                        amount = float(body.get("amount") or log["amount"])
                        nutrition = calculate_nutrition(food, amount)
                        conn.execute(
                            "UPDATE food_logs SET meal_type=?, amount=?, unit=?, calorie=?, protein_g=?, carb_g=?, fat_g=?, updated_at=? WHERE id=? AND user_id=?",
                            (body.get("meal_type") or log["meal_type"], amount, body.get("unit") or log["unit"], nutrition["calorie"], nutrition["protein_g"], nutrition["carb_g"], nutrition["fat_g"], now_iso(), log_id, USER_ID),
                        )
                        return self.ok({"success": True})
                    if method == "DELETE":
                        conn.execute("DELETE FROM food_logs WHERE id = ? AND user_id = ?", (log_id, USER_ID))
                        return self.ok({"success": True})
                if method == "POST" and path == "/api/weight-logs":
                    record_date = body.get("record_date") or today_iso()
                    weight = float(body.get("weight_kg"))
                    conn.execute(
                        """
                        INSERT INTO weight_logs (id, user_id, weight_kg, record_date, note, created_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                        ON CONFLICT(user_id, record_date) DO UPDATE SET weight_kg=excluded.weight_kg, note=excluded.note
                        """,
                        (f"weight_{int(datetime.now(UTC).timestamp() * 1000)}", USER_ID, weight, record_date, body.get("note") or "", now_iso()),
                    )
                    conn.execute("UPDATE users SET current_weight_kg=?, updated_at=? WHERE id=?", (weight, now_iso(), USER_ID))
                    return self.ok({"success": True})
            return self.fail("not found", 404, 4040)
        except Exception as exc:
            return self.fail(str(exc), 500, 5000)


def main():
    init_db()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"饮食管理应用已启动：http://localhost:{PORT}")
    print(f"手机访问请使用：http://你的电脑局域网IP:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()