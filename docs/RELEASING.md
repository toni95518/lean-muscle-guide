# Releasing

How version 1.0.0 was published, and how to ship updates. Commands run on Windows PowerShell in the project folder (`Documents\lean-muscle-guide`).

## What's live

| Piece | Where | Updated by |
|---|---|---|
| Android app (APK) | EAS Build, project `@toni95518/lean-muscle-guide` on expo.dev | `eas build` (manual) |
| Web app (iPhone and browsers) | EAS Hosting, https://lean-muscle-guide.expo.app | `expo export` + `eas deploy` (manual) |
| Backup and accounts API | Render web service `lean-muscle-guide` (Docker, free plan), https://lean-muscle-guide.onrender.com | Automatic on every push to `main` |
| Database | Neon PostgreSQL (free plan) | Migrations run automatically when the API starts |
| CI | GitHub Actions: server tests + phone app type check | Automatic on every push |

Only the API is redeployed by a git push. **The Android app and the web app change only when you rebuild them.**

## How 1.0.0 was published (October 30, 2026)

1. **Checks:** `npx tsc --noEmit` and `npx expo-doctor` (20/20) in `mobile/`; server tests (48) in CI.
2. **Splash screen:** SDK 58 no longer accepts the top-level `splash` key in `app.json`. It moved to the `expo-splash-screen` config plugin (`npx expo install expo-splash-screen`).
3. **Version:** `1.0.0` in `mobile/app.json`, `mobile/package.json` and `server/package.json`.
4. **Expo project:** `npx eas-cli@latest init` created `@toni95518/lean-muscle-guide` and wrote `extra.eas.projectId` and `owner` into `app.json`.
5. **Android:** `npx eas-cli@latest build -p android --profile preview`. EAS generated the signing keystore and stores it on Expo's servers. Don't delete it: future updates must be signed with the same key to install over 1.0.
6. **Web:** `npx expo export --platform web`, then `npx eas-cli@latest deploy --prod`.
7. **Render:** added `CORS_ORIGIN=https://lean-muscle-guide.expo.app` so the web app may call the backup API. The Android app doesn't need it.
8. **Fix after launch:** the sign-in fields collapsed to zero height on the web (`flex: 0` in `account.tsx`), fixed with `flexGrow: 0, flexBasis: "auto"` and redeployed.

## Ship an update

1. Make the change, then check it:
   ```powershell
   cd mobile
   npx tsc --noEmit
   npx expo-doctor
   npx expo start --tunnel        # try it in Expo Go
   ```
2. Raise `"version"` in `mobile/app.json` (for example `1.0.1` for fixes, `1.1.0` for features) and add a CHANGELOG entry.
3. Commit and push. This also redeploys the API on Render.
   ```powershell
   git add -A
   git commit -m "v1.0.1: …"
   git push
   ```
4. Web app:
   ```powershell
   cd mobile
   npx expo export --platform web
   npx eas-cli@latest deploy --prod
   ```
5. Android app (only when phone-app code changed):
   ```powershell
   npx eas-cli@latest build -p android --profile preview
   ```
   Share the new build's Install link. Android installs it over the old version and keeps the user's data, because it's signed with the same key.
6. Check:
   - https://lean-muscle-guide.onrender.com/api/health returns `{"ok":true}`.
   - GitHub → Actions is green.
   - The web app shows the change after a reload.

Always run these from the git project folder, not from an unzipped copy.

## Accounts and secrets

- **Expo:** account `toni95518`. The command line logs in with an access token saved as the Windows user variable `EXPO_TOKEN`. If a token leaks, delete it on expo.dev → Account settings → Access tokens and create a new one.
- **Render:** `DATABASE_URL`, `JWT_SECRET` and `CORS_ORIGIN` are set in the service's Environment page. Never commit them or paste them anywhere.
- **AI keys** belong to each user and stay on their device.

## Later

- **Google Play:** $25 one-time developer account; `eas build -p android --profile production` (AAB), then `eas submit -p android`. Needs a privacy policy page and a store listing.
- **iPhone App Store / TestFlight:** Apple Developer Program ($99/year); `eas build -p ios --profile production`, then `eas submit -p ios`.
- **Turning things off:** suspend the Render service (Settings → Suspend) rather than deleting it. Deleting the Neon project erases all backups.
