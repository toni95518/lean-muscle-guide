# 薄肌理论指南 · Lean Muscle Theory Guide

A full-stack nutrition and fitness tracker. The app shows its name in Chinese (薄肌理论指南) on Chinese-language phones and in English (Lean Muscle Theory Guide) everywhere else. Users log meals, workouts, water and body weight, and see daily calorie and macro targets calculated from their own profile. Data is stored per account in PostgreSQL behind a REST API. The mobile-first web client is built to be added to the iPhone Home Screen.

**Version 0.3.1**: see [CHANGELOG.md](CHANGELOG.md).

## Features

- **Accounts.** Email and password sign-up with bcrypt-hashed passwords and JWT sessions. A WeChat Mini Program login endpoint is ready for the mini program client.
- **Daily calorie budget.** Goal − food + exercise, with protein, carb and fat progress against personal targets.
- **Food logging.** A shared library of about 45 foods, saved custom foods, and recent foods by meal. Servings are adjustable.
- **Quick add.** Type calories eaten (with optional macros) or calories burned directly, for example a number from a menu, a label, or a watch. Minutes are optional.
- **Ask your own AI.** The app gives a prompt in the user's language. They paste it into the AI app they already use (ChatGPT, Claude, 豆包, DeepSeek…) with a photo of the food, paste the reply back, review and edit the estimate, and log every item at once. Entries are tagged "AI" or "Quick".
- **Exercise logging.** 24 activities with MET values. Calories burned are estimated from duration and body weight, and users can override the number.
- **Water and weight.** Daily water in liters (tap a 250 ml glass) and weigh-ins. The latest weigh-in updates the profile, which feeds into targets and burn estimates.
- **Trends.** A 7-day summary computed on the server: calories eaten vs. burned, average intake and protein, workouts, active minutes, logging streak and weight trend.
- **Units.** Weight in lb, kg or 斤 (jin), and height in ft/in or cm. Storage is always kg and cm.
- **Privacy.** Every query is scoped to the signed-in user, and tests check that users can't read or change each other's data.

## Tech stack

| Layer | Choice |
|---|---|
| API | Node.js 22, Express 5, TypeScript |
| Database | PostgreSQL 16 with Drizzle ORM and SQL migrations |
| Validation | Zod (every request body and query) |
| Auth | JWT (HS256, 30-day tokens), bcrypt, rate-limited login |
| Security | Helmet (CSP, headers), per-user row scoping, JSON body limit |
| Web client | Vanilla JS, HTML and CSS with hand-built SVG charts, in a single file |
| Tests | Vitest + Supertest against a real PostgreSQL database |
| DevOps | Dockerfile, Docker Compose, GitHub Actions CI |

## Architecture

```
┌────────────────────┐        HTTPS / JSON        ┌───────────────────────────┐
│ Web client (web/)  │ ─────────────────────────▶ │ Express API (server/)     │
│ iPhone Home Screen │   Authorization: Bearer    │  routes → services → db   │
└────────────────────┘                            │  Zod validation           │
┌────────────────────┐                            │  JWT auth middleware      │
│ WeChat Mini Program│ ─── POST /api/auth/wechat ▶│                           │
│ (planned)          │                            └─────────────┬─────────────┘
└────────────────────┘                                          │ Drizzle ORM
┌────────────────────┐                                          ▼
│ iPhone app (Expo)  │                            ┌───────────────────────────┐
│ (planned)          │                            │ PostgreSQL                │
└────────────────────┘                            └───────────────────────────┘
```

One API serves every client. The server never decides what "today" is: clients send their local calendar date (`YYYY-MM-DD`), so days are correct in any time zone.

## Project structure

```
fuel-move/
├── server/
│   ├── src/
│   │   ├── app.ts              Express app (middleware, routes, static web client)
│   │   ├── index.ts            Starts the HTTP server
│   │   ├── env.ts              Validated environment variables
│   │   ├── db/
│   │   │   ├── schema.ts       Tables, enums, indexes
│   │   │   ├── migrate.ts      Applies migrations + seeds libraries
│   │   │   └── seed.ts
│   │   ├── routes/             auth, me (profile), days, library, summary
│   │   ├── services/           day loading/aggregation, profile
│   │   ├── lib/                nutrition math, dates, auth, WeChat, errors
│   │   └── data/library.ts     Seed foods and activities
│   ├── drizzle/                Generated SQL migrations
│   └── tests/                  Unit tests + API integration tests
├── web/index.html              Web client
├── Dockerfile
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## Getting started

### Option A: Docker (easiest)

```bash
docker compose up --build
```

Open http://localhost:3000 and create an account.

### Option B: Run locally

Requirements: Node.js 20+ and PostgreSQL 14+.

```bash
# 1. Create a database
createdb fuel_move

# 2. Configure
cd server
cp .env.example .env        # then edit DATABASE_URL and JWT_SECRET

# 3. Install, migrate, run
npm install
npm run db:migrate          # creates tables and seeds the food/activity library
npm run dev                 # http://localhost:3000, restarts on file changes
```

### Scripts (in `server/`)

| Command | What it does |
|---|---|
| `npm run dev` | Start the API with live reload |
| `npm test` | Run unit and API tests (needs a `fuel_move_test` database) |
| `npm run typecheck` | Type-check without emitting |
| `npm run build` / `npm start` | Compile to `dist/` and run it |
| `npm run db:generate` | Create a new migration after editing `schema.ts` |
| `npm run db:migrate` | Apply migrations and seed |
| `npm run db:studio` | Browse the database in Drizzle Studio |

To run the tests, create the test database once with `createdb fuel_move_test`, or set `TEST_DATABASE_URL`. The test run rebuilds that database from the migrations each time.

## API reference

All endpoints are under `/api` and use JSON. Everything except `/api/auth/*` and `/api/health` needs an `Authorization: Bearer <token>` header. Dates are `YYYY-MM-DD`, weights are in kg, and energy is in kcal.

Errors always have this shape:

```json
{ "error": { "code": "validation_failed", "message": "minutes: Number must be greater than or equal to 1", "details": [] } }
```

### Auth and account

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/auth/register` | `{ email, password, name? }` | `{ token, user, profile, targets }` |
| POST | `/auth/login` | `{ email, password }` | same as above |
| POST | `/auth/wechat` | `{ code }` from `wx.login()` | same as above |
| GET | `/me` | | `{ user, profile, targets }` |
| DELETE | `/me` | | 204; deletes the account and all its data |
| GET | `/profile` | | `{ profile, targets }` |
| PATCH | `/profile` | any of `sex, age, heightCm, weightKg, activity, goal, calorieOverride, proteinPerKg, waterGoal, weightUnit, heightUnit, setupComplete` | `{ profile, targets }` |
| GET | `/targets` | | `{ bmr, tdee, kcal, protein, carbs, fat, water }` |
| POST | `/push-tokens` | `{ platform, token }` | 204 |

### Days

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/days?from=&to=` | | days with any data (366-day maximum) |
| GET | `/days/:date` | | `{ date, food[], exercise[], waterGlasses, weightKg, totals }` |
| PUT | `/days/:date/water` | `{ glasses }` | |
| PUT | `/days/:date/weight` | `{ weightKg }` (or `null` to clear) | also updates the profile weight if it's the latest weigh-in |
| POST | `/days/:date/food` | `{ meal, foodId, quantity }`, or `{ meal, customFoodId, quantity }`, or `{ meal, name, kcal, protein?, carbs?, fat?, serving?, quantity?, saveAsCustom? }` | food entry |
| POST | `/days/:date/food/batch` | `{ meal, source?, items: [{ name, kcal, protein?, carbs?, fat?, serving?, quantity? }] }` (up to 30) | `{ entries[] }` |
| PATCH | `/food/:id` | any of `date, meal, quantity, name, serving, kcal, protein, carbs, fat` | food entry |
| DELETE | `/food/:id` | | 204 |
| POST | `/days/:date/exercise` | `{ activityId, minutes, kcal?, note? }` or `{ name, kcal, minutes?, note? }` | exercise entry; `kcal` is estimated if omitted; minutes default to 0 for quick adds |
| PATCH | `/exercise/:id` | any of `date, name, minutes, kcal, note` | exercise entry; re-estimates kcal when minutes change |
| DELETE | `/exercise/:id` | | 204 |

### Library and summary

| Method | Path | Returns |
|---|---|---|
| GET | `/foods?q=&limit=` | `{ recent[], custom[], library[] }` |
| POST | `/foods/custom` | saves or updates a custom food by name |
| DELETE | `/foods/custom/:id` | 204 |
| GET | `/activities?q=` | activities with MET and `kcalPer30Min` for this user |
| POST | `/activities/estimate` | `{ activityId \| met, minutes }` → `{ kcal }` |
| GET | `/summary?to=&days=7` | daily series, averages, totals, streak, weight trend |

### Ask your own AI

| Method | Path | Returns |
|---|---|---|
| GET | `/ai/food-prompt?lang=en\|zh&meal=` | `{ prompt }` for the user to paste into their AI with a food photo |
| POST | `/ai/parse-food` | `{ text }` (the AI's reply) → `{ items[], notes, totals }`; 422 `ai_reply_unreadable` with a fix-it message if the reply can't be read |

No model runs on the server, so there is no AI cost and the photo never reaches the server. The parser (`server/src/lib/aiFood.ts`) accepts the requested JSON format plus common variations: code fences, English or Chinese keys, values like "520 千卡", smart quotes, and bare arrays.

### Example

```bash
TOKEN=$(curl -s localhost:3000/api/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"me@example.com","password":"a-long-password"}' | jq -r .token)

curl -s localhost:3000/api/days/2026-10-21/exercise -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"Rock climbing","minutes":60,"kcal":480}'

curl -s "localhost:3000/api/summary?to=2026-10-21" -H "Authorization: Bearer $TOKEN"
```

## How the numbers are calculated

- **Resting energy (BMR)** uses the Mifflin–St Jeor equation: `10 × kg + 6.25 × cm − 5 × age + 5` (men) or `− 161` (women).
- **Maintenance (TDEE)** is BMR × activity multiplier (1.2 to 1.725).
- **Calorie target** is TDEE + goal adjustment (−500, −250, 0 or +250), rounded to 10, with a floor of 1,200 (women) or 1,500 (men). Users can set a custom target instead.
- **Macros:** protein is g/kg × body weight, fat is 28% of calories, and carbs fill the rest.
- **Exercise burn** is `MET × 3.5 × kg ÷ 200 × minutes`, with MET values from the Compendium of Physical Activities.

This logic lives in `server/src/lib/nutrition.ts` as pure functions with unit tests. All figures are estimates for general fitness tracking, not medical advice.

## Design decisions

- **Canonical units in the database.** Everything is stored in kg, cm and kcal, and clients convert for display. Adding 斤 needed no data migration.
- **An entry `source` field** (`manual`, `library`, `custom`, `photo`, `apple_health`, `werun`, `fitbit`). Photo logging, Apple Health and wearables can write entries later without schema changes.
- **Per-serving values plus quantity on each entry.** Totals are computed rather than stored, so editing a serving count is a single field change.
- **"Bring your own AI" before building in AI.** The prompt and the parser live on the server, so a future version can call a model directly (or the WeChat and iPhone clients can reuse the same flow) without changing how entries are stored.
- **Library values are copied into entries.** Fixing a library value later doesn't rewrite a user's history.
- **Range loading in three queries.** `loadDays` fetches day logs, food and exercise for a whole date range with three indexed queries, whatever the range length.

## Deployment

**International (free tiers):**
1. Create a PostgreSQL database on [Neon](https://neon.tech) or [Supabase](https://supabase.com) and copy its connection string.
2. Create a Web Service on [Render](https://render.com) from this repository using the Dockerfile.
3. Set `DATABASE_URL` and `JWT_SECRET` (a long random string) as environment variables. Migrations run automatically on start.

**Mainland China (for the WeChat Mini Program):** mini program API domains must use HTTPS and be whitelisted in the mini program console. In practice they also need ICP filing (备案), which usually means hosting in mainland China, for example on Tencent Cloud or WeChat Cloud Run (微信云托管), which runs this Dockerfile as is. Set `WECHAT_APPID` and `WECHAT_SECRET` to enable `/api/auth/wechat`.

## Roadmap

- [x] **v0.1:** frontend-only tracker (browser storage)
- [x] **v0.2:** full stack: accounts, REST API, PostgreSQL, tests, Docker, CI
- [x] **v0.3:** quick add, "Ask your own AI" photo estimates, bilingual app name
- [ ] **WeChat Mini Program client** with WeChat login, 斤 units, and WeChat Sports (微信运动) step import
- [ ] **iPhone app (React Native + Expo)** on the same API
- [ ] **Push reminders.** Device tokens are already stored (`/api/push-tokens`); next comes a scheduled job plus Expo Push or WeChat subscription messages.
- [ ] **Photo food logging.** A vision model identifies foods and portions, nutrients come from a food database (for example USDA FoodData Central), and the user confirms before saving. Pluggable providers: Apple's on-device model, a local open model, or the user's own API key.
- [ ] **Apple Health sync** for steps, workouts and active calories
- [ ] **Wearables in the cloud.** Fitbit through the Google Health API; the legacy Fitbit Web API shuts down on October 30, 2026.

## License

MIT
