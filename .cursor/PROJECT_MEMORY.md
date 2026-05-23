# FitDiet Project Memory

## 1. Purpose

This file stores current project facts and collaboration context.

Use this document when you need fast orientation on:

- current architecture state
- active entry points and startup commands
- current source of truth documents
- implemented capabilities
- known gaps and risks
- handoff context for future sessions

This is not the PRD and not the rules file.

Document split:

- Product requirements and priorities: `VibeCoding-饮食管理软件开发文档.md`
- Engineering and collaboration rules: `.cursor/rules/mobile-first-diet-tracker.mdc`
- Project facts and current state: `.cursor/PROJECT_MEMORY.md`
- Operational notes and commands: `README.md`

## 2. Current Architecture State

The project is in migration, not a clean-slate rewrite.

Current structure:

1. Old Web MVP
   - `public/`
   - `server/app.py`
   - SQLite data in `server/data/app.db`
   - still runnable and must be preserved

2. New backend
   - `backend/`
   - FastAPI + SQLAlchemy + Pydantic
   - layered toward `routers/services/repositories/schemas/models`
   - current local fallback database: `backend/app.db`
   - target production database: PostgreSQL via `DATABASE_URL`

3. New mobile app
   - `mobile/`
   - Expo Router + TypeScript + React Query + React Hook Form
   - intended future main product entry

Migration rule:

- preserve the old MVP
- do not delete `public/` or `server/app.py`
- do not default to adding major new product work into the old MVP
- primary forward path is `mobile/ + backend/`

## 3. Current Source of Truth

### Product source of truth

- `VibeCoding-饮食管理软件开发文档.md`

This is the current唯一 PRD.

### Rules source of truth

- `.cursor/rules/mobile-first-diet-tracker.mdc`

This file should remain rules-only.

### Project state source of truth

- `.cursor/PROJECT_MEMORY.md`
- `README.md`

Use this memory file for stable project facts.
Use `README.md` for commands, verification notes, and operational context.

## 4. Active Entry Points and Commands

### Old Web MVP

Entry points:

- `public/index.html`
- `public/app.js`
- `public/styles.css`
- `server/app.py`

Run:

```bash
python3 server/app.py
```

Open:

```text
http://localhost:3000
```

### Backend

Entry points:

- `backend/app/main.py`
- `backend/app/routers/`
- `backend/app/services/`
- `backend/app/repositories/`
- `backend/app/schemas/`
- `backend/app/models/`

Install and run:

```bash
python3 -m pip install -r backend/requirements.txt
npm run backend:dev
```

Health check:

```text
http://localhost:8000/health
```

### Mobile

Entry points:

- `mobile/app/_layout.tsx`
- `mobile/app/(tabs)/_layout.tsx`
- `mobile/app/(tabs)/index.tsx`
- `mobile/app/(tabs)/plan.tsx`
- `mobile/app/(tabs)/mood.tsx`
- `mobile/app/(tabs)/profile.tsx`
- `mobile/app/record/index.tsx`

Run:

```bash
npm --prefix mobile install
npm run mobile:dev
```

API base URL:

- default: `http://localhost:8000`
- real device: use `EXPO_PUBLIC_API_BASE_URL` to point at the computer LAN IP

## 5. Current Product Shape

Current mobile primary navigation:

- 今天
- 计划
- 心情
- 我的
- 中央 `+` 记录入口

Current record center direction:

- 吃一点
- 动一下

Current visual direction:

- black / white / gray only
- iOS-style
- glass / blur
- rounded cards
- neumorphic / elevated shadows
- keep old Web MVP content structure as reference

Visual references:

- `UI_STYLE_PROMPT.md`
- `public/index.html`
- `public/styles.css`
- `public/app.js`

## 6. Current Data Contract Facts

### Food log structure

Required fields:

```text
food_name
calories
protein
carbs
fat
quantity
unit
timestamp
```

Allowed normalized units only:

```text
g
ml
serving
```

Known issue:

- old MVP still contains `piece` in historical logic/data references
- migration must normalize this and avoid mixing units in new logic

### Calorie calculation facts

Target calories should be derived from plan period rather than manually setting an arbitrary kcal delta:

```text
daily_delta = target_weight_change_kg * 7700 / period_days
daily_target_intake = TDEE + daily_delta
```

Today remaining calories:

```text
remaining = target_intake + exercise_burned - food_consumed
```

### Body algorithm facts

- BMI from height and weight
- BMR via Mifflin-St Jeor
- TDEE from BMR and activity factor
- body fat estimate should prefer Deurenberg formula
- circumference-based estimates can only be辅助, not authoritative

## 7. Implemented Capability Snapshot

### Backend direction already present

- health check
- plan direction
- body metric direction
- dashboard direction
- food search direction
- food log direction
- exercise log direction
- body algorithm service direction
- exercise compensation logic direction

### Mobile direction already present

- tab shell
- 今天 / 计划 / 心情 / 我的
- central record entry
- record center for food and exercise
- React Query based API service flow
- restored black-white old-style mobile UI direction

### Old Web MVP remains useful for

- visual reference
- content reference
- behavior reference
- safe fallback runnable demo

## 8. Current Core Chain Status

Core chain definition:

```text
plan -> food log -> exercise log -> today dashboard
```

Current status snapshot:

### 8.1 Plan

- backend direction exists
- target calorie calculation direction exists
- current status: usable as architecture direction, still needs continued product hardening

### 8.2 Food log

- food search direction exists
- create food log direction exists
- manual food entry direction now exists
- current status: basic end-to-end logging loop is now usable on mobile
- current known gaps:
  - edit/delete is not yet a closed loop
  - offline queue is minimal, not a full sync system
  - backend replay is not idempotent yet

### 8.3 Exercise log

- create exercise log direction exists
- exercise calories can feed remaining-calorie logic
- current status: usable with the same minimal offline queue path
- current known gaps:
  - edit/delete loop is not implemented
  - replay is still exposed to duplicate-write risk without idempotency

### 8.4 Today dashboard

- remaining calories logic direction exists
- completion display direction exists
- current status: mobile today screen is connected to real backend data and supports retry
- main gaps:
  - food detail list is still not a true record-detail feed
  - some advice/display sections are still lighter than final product scope

### 8.5 Chain-level assessment

Overall chain status:

- runtime path exists
- architecture path is correct
- user-value path is visible
- basic mobile logging loop is now usable
- reliability path is improved but still incomplete

Current bottleneck:

- the main blocker is no longer navigation or initial data loading
- it is now centered on sync robustness, idempotency, and post-log detail completeness

## 9. Recent Data Contract Change Log

This section records recent contract-level decisions that future sessions must not silently undo.

### 9.1 Current accepted food log contract

```text
food_name
calories
protein
carbs
fat
quantity
unit
timestamp
```

Meaning:

- this is the migration target contract
- mobile and backend should converge on this shape
- old MVP historical shapes must not become the default again

### 9.2 Current accepted unit contract

Allowed normalized units only:

```text
g
ml
serving
```

Implication:

- `piece` is legacy and must be normalized or mapped during migration
- new calculations must not introduce additional unit semantics casually

### 9.3 Current accepted calorie rules

Plan-derived daily target:

```text
daily_delta = target_weight_change_kg * 7700 / period_days
daily_target_intake = TDEE + daily_delta
```

Today remaining calories:

```text
remaining = target_intake + exercise_burned - food_consumed
```

### 9.4 Current contract risk notes

- mobile UI still has places where display capability and contract completeness are not fully aligned
- future sessions should explicitly record any contract change here when changing:
  - request or response fields
  - unit semantics
  - derived calorie formulas
  - dashboard aggregation fields

## 10. Known Gaps

These are current important gaps, not speculative nice-to-haves:

1. Food logging core flow is not fully stable yet
   - edit/delete loop is incomplete
   - today page still lacks a true record-detail feed

2. Offline-first flow is only minimally complete
   - outbox and sync-state UX exist
   - automatic retry and recovery are still basic
   - no idempotency key yet, so replay can duplicate writes

3. Production backend target is not finished
   - PostgreSQL migration is still pending

4. Unit normalization is still a migration risk
   - `piece` needs proper handling

5. Mobile automated coverage is still thin
   - current Jest run passes with no test files found for the new record/offline flows

## 11. Validation Already Performed

Previously verified directions include:

- backend algorithm tests for BMI/BMR/TDEE and plan math
- backend health check
- Expo startup path
- dependency alignment to Expo SDK 54
- Expo Router entry fix
- mobile UI restored toward old black-white style
- repository quality checks executed successfully after Node/npm became available:
  - `npm run mobile:lint`
  - `npm run mobile:format:check`
  - `npm run mobile:typecheck`
  - `npm run mobile:test`
  - `npm run check`

## 12. Recent Collaboration Baseline

This section records stable collaboration outcomes from the latest repository unification pass.

### 12.1 Document split baseline

Current expected document responsibilities are:

- PRD only: `VibeCoding-饮食管理软件开发文档.md`
- rules only: `.cursor/rules/mobile-first-diet-tracker.mdc`
- project facts / handoff memory only: `.cursor/PROJECT_MEMORY.md`
- runbook / operational commands only: `README.md`
- engineering workflow / quality entrypoints only: `ENGINEERING_WORKFLOW.md`

Future sessions should preserve this split and avoid merging these roles back together.

### 12.2 Repository quality baseline

The repository now has an explicit quality gate baseline for the active stack:

- backend lint / format check / tests
- mobile lint / format check / typecheck / tests
- repository-level `npm run check`
- GitHub Actions workflow at `.github/workflows/quality.yml`
- local pre-commit gate at `scripts/pre-commit.sh`

Boundary decision kept in force:

- `mobile/` and `backend/` are under enforced checks
- old Web MVP paths `public/`, `server/`, and root `index.html` remain outside automatic formatting scope during migration

### 12.3 Git and collaboration baseline

Current repository collaboration facts:

- local git repository has been initialized for this project
- GitHub remote is already connected
- the current branch is `main`
- prior session history already includes the initial import commit and the repository standardization commit

### 12.4 Current recommended starting checks

Before continuing feature work in future sessions, prefer this baseline order:

```bash
npm run backend:test
npm run backend:dev
npm run mobile:dev
npm run check
```

## 13. Current Collaboration Guidance

When continuing work, clarify these first:

- are we changing old Web MVP, new backend, or new mobile app?
- is the task about product flow, data contract, UI restoration, or migration infrastructure?
- does the task touch the core chain: plan -> food log -> exercise log -> today dashboard?

Preferred implementation order when uncertainty appears:

1. keep runtime behavior working
2. keep contracts consistent
3. improve core record flow
4. improve offline reliability
5. then expand secondary features

## 14. Memory Maintenance Rules

When updating this file in future sessions:

- update facts, not aspirations
- prefer current runtime-backed statements over old source assumptions
- record contract-level decisions explicitly in `Recent Data Contract Change Log`
- update `Current Core Chain Status` when the main chain materially changes
- keep product requirements in PRD, not here
- keep engineering constraints in `.mdc`, not here

## 15. Handoff Template

When handing work to another agent, include:

- current architecture state: Web MVP preserved, migration in progress, mobile-first target
- active entry points and commands used
- data model changes made this session
- API contract changes made this session
- verification performed
- remaining risks