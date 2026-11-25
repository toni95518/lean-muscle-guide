# 薄肌理论指南 · Lean Muscle Theory Guide

A full-stack nutrition and fitness tracker built around the user's own AI. Snap a photo of a meal or say what you ate and did, and the AI the user chose (Gemini, ChatGPT, Claude and others) estimates calories, macros and any nutrients they track. Every estimate is reviewed before it's saved. The app shows its name in Chinese (薄肌理论指南) on Chinese-language phones and in English everywhere else.

**Version 1.1.0**, released November 24, 2026. See [What's new in 1.1](#whats-new-in-11) and [CHANGELOG.md](CHANGELOG.md).

## Try it

| Platform | How |
|---|---|
| **Android** | Download the APK from [Releases](https://github.com/toni95518/lean-muscle-guide/releases/latest) or the latest build on [expo.dev](https://expo.dev/accounts/toni95518/projects/lean-muscle-guide/builds) (Install → link or QR code). Allow "install unknown apps" when asked. Installing 1.1 over 1.0 keeps your log. |
| **iPhone and any browser** | Open **https://lean-muscle-guide.expo.app**. On iPhone, tap Share → **Add to Home Screen** so it opens full-screen and keeps its data. The native iPhone app is on its way through TestFlight and the App Store. |
| **Developers** | Run it with Expo Go; see [Run the phone app](#run-the-phone-app). |

Then open **Connect your AI** and paste an API key. A free Gemini key from [Google AI Studio](https://aistudio.google.com) works; pick a model whose name ends in `-flash`.

## What's new in 1.1

| Update | What it does |
|---|---|
| **Edit logged foods** | Tap any food on Today to fix what the AI got wrong: name, portion, how many (in steps of ¼), meal, calories, protein, carbs, fat and every tracked nutrient. A live total updates as you type. Delete has an Undo. Long-press still stars a favorite. |
| **Photos in Coach** | Attach up to 3 photos (camera or library) to a Coach message: a meal, a menu, or a nutrition label. Label numbers are read exactly and scaled to what you actually ate ("I had half the bag"). |
| **Reminders that open the app** | Meal reminders that open the camera, water reminders with a **+1 glass** button, an evening check-in and a weekly weigh-in. They skip themselves once that thing is logged. See [How reminders work](#how-reminders-work). Phone app only. |
| **Coach works with fast models** | "Lite" models such as Gemini Flash-Lite used to answer without Add buttons. The Coach now asks for strict JSON, falls back cleanly when a model refuses that, and reads looser replies. If a reply still has no card, an **Add to log…** link sends the text to Say it. "2 × banana" quantities are kept. |
| **Delete account** | Me → Backup account → Delete account removes the account, its backup and its login straight away (required by Apple). |
| **Privacy policy** | In the app (Me → Privacy policy) and at [lean-muscle-guide.expo.app/privacy.html](https://lean-muscle-guide.expo.app/privacy.html). |
| **Fixes** | On iPhone-sized screens in the web version, the Coach chat no longer slides sideways after a reply and the weight row on Today fits. The version line no longer says "test build". |
| **Behind the scenes** | Version 1.1.0 (iOS build 1, Android versionCode 2), an App Store guide in [docs/APP_STORE.md](docs/APP_STORE.md), tests for the reminder planner and account deletion (both run in CI), and an end-to-end check of the web build. |

## How reminders work

Reminders are **local notifications**: the phone schedules them itself, so no server, push service or account is involved, and they arrive even in airplane mode.

1. **Turn them on** in Me → Reminders. The app asks for notification permission once. If it was refused, the card shows a button to open the phone's settings.
2. **Choose what and when.** Breakfast, lunch and dinner (on by default at 8:00, 12:30 and 18:30), water (10:30, 14:30, 17:30), an evening check-in (21:00) and a weekly weigh-in (Monday 7:30). Each has its own switch and a ±15-minute time stepper. **Send a test reminder** shows one in 5 seconds.
3. **The app plans the next 8 days.** Each reminder is a one-off notification at an exact time. Whenever the app opens, comes back to the foreground, or the log or settings change, it cancels its own reminders and plans them again from the current log.
4. **Reminders skip what's done.** A meal that already has food gets no reminder, water reminders stop once the day's water goal is reached, and the weigh-in is skipped once you've weighed in. Times that have already passed are never scheduled.
5. **Tapping opens the right screen.** A meal reminder opens Photo for that meal and day; its **Photo** and **Say it** buttons go straight to those screens. The water reminder's **+1 glass** button adds a glass, then opens Today. Others open Today. This works whether the app was closed or already open.
6. **They stop on their own.** Because only 8 days are planned ahead, reminders fade out after about a week without opening the app instead of nagging forever. The plan also stays under iOS's limit of 64 pending notifications (at most 60, 55 with everything on).

The planning is a pure function (`mobile/src/lib/reminders/plan.ts`) with its own tests; `reminders/index.ts` hands the plan to `expo-notifications`, sets up the Android "Reminders" channel and the notification buttons, and turns taps into navigation. The web version shows a note instead, because browsers can't schedule notifications this way.

## Features

- **Local-first.** The log, favorites and goals are stored on the device. No account is needed, and the app works offline except for AI requests.
- **Your own AI.** Claude, ChatGPT, Gemini, DeepSeek, 通义千问 Qwen, 豆包 Doubao, OpenRouter or any OpenAI-compatible API. Requests go straight from the device to that provider. The key stays in the phone's secure storage (browser storage on the web version) and never reaches this project's server.
- **Photo and Say it.** One photo, or one sentence via the keyboard's dictation ("two eggs and toast, then a 30-minute run"), becomes a list of foods and exercise. Names, calories and portions can be edited before anything is added.
- **Coach.** A chat that knows the user's goal, targets and last 7 days. Messages can include up to 3 photos, such as a nutrition label. It can suggest meals or workouts for today or a future day as cards; nothing is logged until the user taps Add.
- **Edit anything later.** Tap a logged food to correct its portion, quantity, meal, calories, macros or nutrients.
- **Reminders.** Meal, water, evening and weekly weigh-in reminders that skip what's already logged and open the right screen when tapped.
- **Nutrient tracking.** Users choose any of 15 nutrients: sodium, sugar, saturated fat, cholesterol, fiber, potassium, calcium, iron, magnesium, zinc, vitamins A, C, D and B12, and folate. The AI estimates them per food, and Today shows each against the U.S. FDA Daily Value or the user's own target. Limits turn red when exceeded.
- **Fast logging without AI.** Favorites (long-press any food), "repeat yesterday's meal", a 45-food library, quick calories in or out, and 24 activities with MET-based burn estimates.
- **Daily picture.** Calorie ring (goal − food + exercise), protein/carbs/fat bars, water in liters, weigh-ins in kg, lb or 斤, and planning up to a year ahead.
- **Trends.** 7- and 30-day eaten vs. burned, averages, days on target, streak and weight line.
- **Four languages.** English, 中文, Français and Deutsch, including the food library and the AI prompts.
- **Optional backup account.** Sign in only to back up the log to the server and restore it on another device. The account can be deleted from the app at any time.

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
│   │                           welcome, connect-ai, photo, say, add, edit-food,
│   │                           account, privacy
│   ├── src/components/         UI kit, review list, nutrient card, toast
│   ├── src/lib/
│   │   ├── store.ts            On-device storage (AsyncStorage), one record per day
│   │   ├── nutrition.ts        Calorie and macro targets, units
│   │   ├── nutrients.ts        The 15 trackable nutrients and their default targets
│   │   ├── ai/                 Providers, client, prompts, reply parser
│   │   ├── i18n/               Interface text in EN / ZH / FR / DE
│   │   ├── reminders/          Reminder planner (pure) and notification scheduling
│   │   ├── privacy.ts          Privacy policy text (app page and public/privacy.html)
│   │   └── account.ts          Backup account client
│   ├── public/privacy.html     Static privacy policy (npm run privacy)
│   ├── tests/                  Reminder planner tests (npm test)
│   ├── app.json, eas.json      App config and EAS build profiles
│   └── locales/                App name per language
├── server/
│   ├── src/                    Express app, routes, services, Drizzle schema
│   ├── drizzle/                SQL migrations (applied automatically on start)
│   └── tests/                  Unit and API tests
├── web/                        Earlier browser client (v0.4)
├── docs/RELEASING.md           How 1.0 was published and how to ship updates
├── docs/APP_STORE.md           App Store listing, privacy answers, review notes
├── docs/screenshots/           Store screenshots (1179 × 2556)
├── Dockerfile, docker-compose.yml
└── .github/workflows/ci.yml    Server tests + phone app type check and tests
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
- [x] **v1.1:** edit logged foods, photos in Coach, reminders that open the app, Coach fixes for fast models, delete account, privacy policy
- [ ] **iPhone app** through TestFlight / App Store (Apple Developer Program enrollment in review)
- [ ] **Sleep tracking** (planned for 1.2): hours and a quality rating, with trends
- [ ] **Sync between devices:** merge logs day by day instead of replacing the whole backup
- [ ] **In-app AI usage counter** with an optional daily cap
- [ ] **Google Play** release
- [ ] **Server push notifications** (local reminders shipped in 1.1; device tokens are already stored)
- [ ] **WeChat Mini Program** with WeChat login and WeChat Sports steps
- [ ] **Apple Health / wearables** for steps and workouts

## License

MIT
