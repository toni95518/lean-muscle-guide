# 薄肌理论指南 · Lean Muscle Theory Guide

A full-stack nutrition and fitness tracker built around the user's own AI. Snap a photo of a meal or say what you ate and did, and the AI the user chose (Gemini, ChatGPT, Claude and others) estimates calories, macros and any nutrients they track. Every estimate is reviewed before it's saved. The app shows its name in Chinese (薄肌理论指南) on Chinese-language phones and in English everywhere else.

**Version 1.0.0**, released October 30, 2026. See [CHANGELOG.md](CHANGELOG.md).

## Try it

| Platform | How |
|---|---|
| **Android** | Install the APK from the 1.0.0 build on [expo.dev](https://expo.dev/accounts/toni95518/projects/lean-muscle-guide/builds) (Install → link or QR code). Allow "install unknown apps" when asked. |
| **iPhone and any browser** | Open **https://lean-muscle-guide.expo.app**. On iPhone, tap Share → **Add to Home Screen** so it opens full-screen and keeps its data. |
| **Developers** | Run it with Expo Go; see [Run the phone app](#run-the-phone-app). |

Then open **Connect your AI** and paste an API key. A free Gemini key from [Google AI Studio](https://aistudio.google.com) works; pick a model whose name ends in `-flash`.

## Features

- **Local-first.** The log, favorites and goals are stored on the device. No account is needed, and the app works offline except for AI requests.
- **Your own AI.** Claude, ChatGPT, Gemini, DeepSeek, 通义千问 Qwen, 豆包 Doubao, OpenRouter or any OpenAI-compatible API. Requests go straight from the device to that provider. The key stays in the phone's secure storage (browser storage on the web version) and never reaches this project's server.
- **Photo and Say it.** One photo, or one sentence via the keyboard's dictation ("two eggs and toast, then a 30-minute run"), becomes a list of foods and exercise. Names, calories and portions can be edited before anything is added.
- **Coach.** A chat that knows the user's goal, targets and last 7 days. It can suggest meals or workouts for today or a future day as cards; nothing is logged until the user taps Add.
- **Nutrient tracking.** Users choose any of 15 nutrients: sodium, sugar, saturated fat, cholesterol, fiber, potassium, calcium, iron, magnesium, zinc, vitamins A, C, D and B12, and folate. The AI estimates them per food, and Today shows each against the U.S. FDA Daily Value or the user's own target. Limits turn red when exceeded.
- **Fast logging without AI.** Favorites (long-press any food), "repeat yesterday's meal", a 45-food library, quick calories in or out, and 24 activities with MET-based burn estimates.
- **Daily picture.** Calorie ring (goal − food + exercise), protein/carbs/fat bars, water in liters, weigh-ins in kg, lb or 斤, and planning up to a year ahead.
- **Trends.** 7- and 30-day eaten vs. burned, averages, days on target, streak and weight line.
- **Four languages.** English, 中文, Français and Deutsch, including the food library and the AI prompts.
- **Optional backup account.** Sign in only to back up the log to the server and restore it on another device.

## How it's built

| Part | Technology | Hosted on |
|---|---|---|
| Phone app (`mobile/`) | Expo SDK 58, React Native 0.88, React 19, TypeScript, Expo Router | Android: EAS Build (APK) |
| Web version of the phone app | The same code, exported with React Native Web | EAS Hosting: lean-muscle-guide.expo.app |
| Backup and accounts API (`server/`) | Node.js 22, Express 5, TypeScript, Zod, JWT, bcrypt, Helmet | Render (Docker, free plan) |
| Database | PostgreSQL 16, Drizzle ORM, SQL migrations | Neon (free plan) |
| Earlier web client (`web/`) | Vanilla JS, served by the API | Render |
| Tests and CI | Vitest + Supertest against real PostgreSQL; TypeScript checks | GitHub Actions |

```
Phone app / web app ──────────────▶ User's chosen AI (Gemini, ChatGPT, Claude…)
   │  log stored on the device          photo or text in, JSON estimates out
   │
   └── optional backup account ───▶ Express API on Render ───▶ PostgreSQL on Neon
                                      /api/auth, /api/backup
```

There is no AI on the server, so the project has no AI costs, and photos never reach the server. The server never decides what "today" is: clients send their local date (`YYYY-MM-DD`), so days are right in every time zone.

## Project structure

```
lean-muscle-guide/
├── mobile/                     Phone app (Expo / React Native)
│   ├── src/app/                Screens (Expo Router): tabs (Today, Coach, Trends, Me),
│   │                           welcome, connect-ai, photo, say, add, account
│   ├── src/components/         UI kit, review list, nutrient card, toast
│   ├── src/lib/
│   │   ├── store.ts            On-device storage (AsyncStorage), one record per day
│   │   ├── nutrition.ts        Calorie and macro targets, units
│   │   ├── nutrients.ts        The 15 trackable nutrients and their default targets
│   │   ├── ai/                 Providers, client, prompts, reply parser
│   │   ├── i18n/               Interface text in EN / ZH / FR / DE
│   │   └── account.ts          Backup account client
│   ├── app.json, eas.json      App config and EAS build profiles
│   └── locales/                App name per language
├── server/
│   ├── src/                    Express app, routes, services, Drizzle schema
│   ├── drizzle/                SQL migrations (applied automatically on start)
│   └── tests/                  Unit and API tests
├── web/                        Earlier browser client (v0.4)
├── docs/RELEASING.md           How 1.0 was published and how to ship updates
├── Dockerfile, docker-compose.yml
└── .github/workflows/ci.yml    Server tests + phone app type check
```

## Run the phone app

Requirements: Node.js 20+ and a free [Expo](https://expo.dev) account.

```bash
cd mobile
npm install
npx expo login              # once
npx expo start --tunnel     # scan the QR code with Expo Go (App Store / Google Play)
```

On iPhone, scan with the Camera app; on Android, scan from inside Expo Go. Press `r` in the terminal to reload after a change. To check the code: `npm run typecheck` and `npx expo-doctor`.

Data saved in Expo Go is separate from the installed app and from the web version. Each keeps its own on-device storage, so use the backup account to move data between them.

## Run the server

**With Docker:**

```bash
docker compose up --build   # http://localhost:3000
```

**Without Docker** (Node.js 20+ and PostgreSQL 14+):

```bash
createdb fuel_move
cd server
cp .env.example .env        # set DATABASE_URL and JWT_SECRET
npm install
npm run db:migrate          # tables + food/activity library
npm run dev                 # http://localhost:3000
```

| Command (in `server/`) | What it does |
|---|---|
| `npm run dev` | Start the API with live reload |
| `npm test` | Unit and API tests (needs a `fuel_move_test` database or `TEST_DATABASE_URL`) |
| `npm run typecheck` | Type-check |
| `npm run build` / `npm start` | Compile to `dist/` and run it |
| `npm run db:generate` | Create a migration after editing `schema.ts` |

Environment variables: `DATABASE_URL`, `JWT_SECRET` (a long random string), `CORS_ORIGIN` (comma-separated web origins allowed to call the API, for example `https://lean-muscle-guide.expo.app`), and optionally `WECHAT_APPID` / `WECHAT_SECRET`. Never commit `.env` or paste these values anywhere.

## Releasing

Version 1.0.0 is published as an Android APK (EAS Build), a web app (EAS Hosting) and the backup API (Render + Neon). [docs/RELEASING.md](docs/RELEASING.md) covers how each was set up and the commands for shipping updates.

## API reference

All endpoints are under `/api` and use JSON. Everything except `/api/auth/*` and `/api/health` needs `Authorization: Bearer <token>`. Dates are `YYYY-MM-DD`, weights are in kg and energy is in kcal. Errors look like `{ "error": { "code": "validation_failed", "message": "…", "details": [] } }`.

### Used by the phone app

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/auth/register` | `{ email, password }` | `{ token, user, profile, targets }` |
| POST | `/auth/login` | `{ email, password }` | same |
| GET | `/backup` | | `{ data, updatedAt, bytes }`, or 404 before the first backup |
| PUT | `/backup` | `{ data: Snapshot }` (up to 5 MB) | `{ updatedAt, bytes }`; replaces the previous backup |
| DELETE | `/backup` | | 204 |
| GET | `/health` | | `{ ok: true }` |

A snapshot holds the profile (goals, units, tracked nutrients), favorites, every logged day and the language. It never contains the AI key, the AI provider or the Coach chat.

### Used by the earlier web client

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/wechat` | `{ code }` from `wx.login()` |
| GET / DELETE | `/me` | Account; DELETE removes it and all its data |
| GET / PATCH | `/profile` | Profile and targets |
| GET | `/targets` | `{ bmr, tdee, kcal, protein, carbs, fat, water }` |
| GET | `/days?from=&to=`, `/days/:date` | Logged days |
| PUT | `/days/:date/water`, `/days/:date/weight` | Weight rejects future dates (400 `future_weight`) |
| POST | `/days/:date/food`, `/days/:date/food/batch`, `/days/:date/exercise` | Add entries |
| PATCH / DELETE | `/food/:id`, `/exercise/:id` | Edit or remove entries |
| GET / POST / DELETE | `/foods`, `/foods/custom`, `/activities`, `/activities/estimate` | Library and estimates |
| GET | `/summary?to=&days=7` | Trends |
| GET / POST | `/ai/food-prompt`, `/ai/parse-food` | Copy-paste AI flow |
| POST | `/push-tokens` | For future reminders |

## How the numbers are calculated

- **Resting energy (BMR):** Mifflin–St Jeor, `10 × kg + 6.25 × cm − 5 × age + 5` (men) or `− 161` (women).
- **Maintenance (TDEE):** BMR × activity (1.2 to 1.725).
- **Calorie target:** TDEE + goal adjustment (−500, −250, 0 or +250), rounded to 10, with a floor of 1,200 (women) or 1,500 (men). Users can set their own.
- **Macros:** protein = g/kg × weight, fat = 28% of calories, carbs = the rest.
- **Exercise:** `MET × 3.5 × kg ÷ 200 × minutes`.
- **Nutrient defaults:** U.S. FDA Daily Values for adults (for example sodium 2,300 mg, fiber 28 g, vitamin C 90 mg).

All figures, and every AI estimate, are for general fitness tracking, not medical advice.

## Design decisions

- **Local-first with an optional account.** Most people want a private tracker, not another login. The server only stores an opt-in backup.
- **Bring your own AI, called from the device.** No AI bill for the project, no keys on the server, and users can switch providers at any time. Two request formats (Anthropic's and the OpenAI-style one) cover every supported provider. The client adapts to newer reasoning models: it uses `max_completion_tokens`, gives "thinking" models more room, and retries once if a reply is cut off.
- **The AI proposes, the user decides.** Photo, Say it and Coach always end in a review step or an Add button, so a wrong guess never changes the log silently.
- **Tolerant JSON parsing.** Replies are read even with code fences, chatter around the JSON, unit strings ("520 千卡") or keys in four languages.
- **Canonical units.** Everything is stored in kg, cm, kcal and mg/g/µg, and converted for display.
- **Honest partial data.** Foods without nutrient estimates are counted in the Today card ("based on 2 of 3 foods") instead of silently lowering the totals.

## Translations

Phone app text lives in `mobile/src/lib/i18n/strings.ts`, one table per language. TypeScript checks that every language has every key. The food and activity library translations are in `mobile/src/lib/library.ts`. The earlier web client uses `web/i18n.js`.

## Roadmap

- [x] **v0.1–0.4:** web tracker, full-stack API, quick add, copy-paste AI flow, four languages, planning ahead
- [x] **v0.99:** phone app with on-device storage, your own AI (Photo, Say it, Coach), optional backup
- [x] **v1.0:** nutrient tracking, AI fixes for newer models, Android APK and web app live
- [ ] **Sync between devices:** merge logs day by day instead of replacing the whole backup
- [ ] **In-app AI usage counter** with an optional daily cap
- [ ] **iPhone app** through TestFlight / App Store (Apple Developer Program)
- [ ] **Google Play** release
- [ ] **Push reminders** (device tokens are already stored)
- [ ] **WeChat Mini Program** with WeChat login and WeChat Sports steps
- [ ] **Apple Health / wearables** for steps and workouts

## License

MIT
