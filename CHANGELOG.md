# Changelog

## 1.0.0 (2026-10-30) — first public release

- **Live:** Android APK through EAS Build (internal distribution link), and a web version for iPhone and any browser at https://lean-muscle-guide.expo.app (EAS Hosting).
- **Nutrient tracking:** users pick any of 15 nutrients (sodium, sugar, saturated fat, cholesterol, fiber, potassium, calcium, iron, magnesium, zinc, vitamins A, C, D, B12, folate). The AI estimates them per food; Today shows bars against FDA Daily Value defaults or the user's own targets; Quick add and Coach include them.
- **AI fixes:** OpenAI's newer models get `max_completion_tokens` and no custom temperature; Gemini and OpenAI get more room for hidden reasoning; replies cut off at the limit are retried once with more room; unreadable replies are logged in the Expo terminal.
- Splash screen moved to the `expo-splash-screen` config plugin (required by SDK 58). Expo Doctor: 20/20 checks pass.
- Fixed after launch: the web app's sign-in fields collapsed to zero height; the API now allows the web app's origin (`CORS_ORIGIN`) so backup sign-in works there.
- Docs: rewritten README (try it, architecture, hosting, API) and a new `docs/RELEASING.md` for shipping updates.

## 0.99.0 (2026-10-28) — test build before release

- Added the **phone app** (`mobile/`, Expo SDK 58) for iPhone and Android. It's local-first: everything is stored on the phone and no account is needed.
- **Connect your AI:** pick Claude, ChatGPT, Gemini, DeepSeek, Qwen, Doubao, OpenRouter or any OpenAI-compatible API, paste a key, load and test models. The key is kept in secure storage and requests go straight from the phone to the provider (no more copy-paste).
- **Photo** and **Say it** (keyboard dictation): the AI returns foods and exercise from one photo or sentence, shown in an editable review (names, kcal, portions) before anything is added.
- **Coach:** chat that knows your goal and last 7 days; suggested meals and workouts appear as cards you can add to today or a future day.
- **Favorites:** long-press any food to star it, one-tap re-add, "repeat yesterday's meal", recent foods.
- Trends (7 / 30 days, streak, weight line), goals, language, erase-all.
- **Optional backup account:** new `GET / PUT / DELETE /api/backup` endpoints, `backups` table (migration `0003`) and 7 tests (48 in total).

## 0.4.0 (2026-10-23)

- The whole interface is now available in **English, 中文, Français and Deutsch**. That includes the food and activity library, serving sizes, error messages, number and date formats, and the "Ask your AI" prompt. The app follows the device language by default. Users can choose another language on the sign-in screen or in Goals, and the choice is saved to their account.
- Added **planning ahead**: go forward up to a year, or jump to any date with the date picker, and add planned meals and workouts. Future days show a "planning ahead" note and hide water and weight.
- The server rejects weigh-ins for future dates, so a planned day can't change today's targets.
- Moved all interface text to `web/i18n.js`. The client reaches the server only through one data layer, ready for an on-device mode.
- Added migration `0002` (profile language) and 3 tests (41 in total).

## 0.3.1 (2026-10-23)

- Water is shown in liters. One tap is a 250 ml glass, set by `GLASS_ML` in `web/index.html`. The Today card, Trends and the water goal (entered in liters, 0.25–5 L) all use liters. Stored data is unchanged: the app still saves glass counts.

## 0.3.0 (2026-10-23)

- Renamed the app to **薄肌理论指南**. Chinese-language phones see the Chinese name, and everyone else sees **Lean Muscle Theory Guide**, including the browser tab and the Home Screen name.
- Added **Quick add**: log calories eaten (with optional protein, carbs and fat) or calories burned directly, without picking a food or activity. Exercise minutes are now optional.
- Added **Ask your AI**: copy a prompt (in Chinese or English), send it with a food photo to your own AI app, paste the reply back, review and edit each item, and log them all at once.
- Added API endpoints: `GET /api/ai/food-prompt`, `POST /api/ai/parse-food` and `POST /api/days/:date/food/batch`.
- Entries now record `quick` and `ai` as their source, and the Today screen tags them. This needs migration `0001`, which runs automatically on start.
- Added 9 tests (38 in total).

## 0.2.1 (2026-10-22)

- Fixed: opening the app from a phone over Wi‑Fi (plain HTTP on a local network) failed to sign in. The server no longer forces HTTPS upgrades, and it sends HSTS only in production.

## 0.2.0 (2026-10-21)

The app is now a full-stack project.

- Added a Node.js + Express + TypeScript REST API with a PostgreSQL database (Drizzle ORM, SQL migrations).
- Added accounts: email/password sign-up and sign-in with JWT, plus a WeChat Mini Program login endpoint.
- Moved the food and activity libraries into the database, and added saved custom foods.
- Moved the weekly summary to the server, including averages, logging streak and weight trend.
- Added 斤 (jin) as a weight unit, and an lb / kg / 斤 switch on the weight card.
- Added device token storage for future push reminders.
- Connected the web client to the API: added a sign-in screen and a sync status indicator, and data now syncs across devices.
- Added 29 unit and API tests, a Dockerfile, Docker Compose and a GitHub Actions CI workflow.

## 0.1.0 (2026-10-20)

- First version: a single-page web app with food, exercise, water and weight logging, macro targets, and 7-day trends. Data was stored in browser storage.
