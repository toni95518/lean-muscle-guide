# Publishing to the App Store (iOS)

Everything Apple asks for, in the order you'll need it. Version **1.1.0**, build **1**.
Bundle ID `com.leanmuscleguide.app` · EAS project `867b19ce-69c7-46cf-bf87-8f2b642b4c42`.

## 1. Apple Developer Program (one time)

1. On your iPhone, install the **Apple Developer** app, sign in with your Apple ID (two-factor authentication must be on), tap **Account → Enroll now**.
2. Enroll as an **Individual**. Your legal name is shown as the seller on the App Store. You'll scan a government photo ID.
3. Pay the **US$99 / year** fee. Approval usually takes a day or two, sometimes longer — you'll get an email.

Nothing below works until that email arrives, except the web/Android release.

## 2. Create the app in App Store Connect

https://appstoreconnect.apple.com → **Apps → + → New App**

| Field | Value |
|---|---|
| Platform | iOS |
| Name | Lean Muscle Theory Guide (must be unique on the store; fallback: "Lean Muscle Guide – AI Log") |
| Primary language | English (U.S.) — add Chinese (Simplified), French, German later under *Localizations* |
| Bundle ID | `com.leanmuscleguide.app` (appears after the first `eas build`, or register it under Certificates, IDs & Profiles) |
| SKU | `lmtg-ios-001` |
| User access | Full access |

## 3. Build and upload

From `mobile/` on your laptop:

```powershell
npx eas-cli@latest build -p ios --profile production
```

- Log in with your **Apple ID** when EAS asks, and let it **create the distribution certificate and provisioning profile** for you (answer *Yes*).
- The build runs on Expo's servers (~15–25 min). Free plan builds may wait in a queue.

```powershell
npx eas-cli@latest submit -p ios --latest
```

- Pick the app you created in step 2. EAS can create an **App Store Connect API key** for you — say *Yes*; it's stored on Expo, not in the repo.
- After upload, Apple processes the build (~10–30 min) and it appears under **TestFlight**.

For each later upload, raise `ios.buildNumber` in `app.json` (`"2"`, `"3"`…). Raise `version` only for a new release (1.1.1, 1.2.0).

## 4. TestFlight (your iPhone and friends)

- **Internal testing** (you, up to 100 people on your developer team): TestFlight → *Internal Testing → +* → add yourself. Available right away. Install the **TestFlight** app on the iPhone and accept the invite.
- **External testing** (friends by email or a public link, up to 10,000): *External Testing → +* → add a group → add the build → fill in *Test Information* (use the review notes below). The first build needs a short **Beta App Review** (usually < 1 day). Then turn on **Public Link** and send it to friends.
- Export compliance: already answered in `app.json` (`usesNonExemptEncryption: false`), so TestFlight won't ask.

## 5. Store listing

**Subtitle** (30 chars): `AI food log & fitness coach`

**Promotional text** (170): `Snap a meal or a nutrition label, say what you ate, and let your own AI fill in calories, protein and nutrients. Reminders, trends and a coach that knows your goal.`

**Description:**

```
Lean Muscle Theory Guide (薄肌理论指南) is a calorie and fitness log built around getting lean while keeping muscle.

LOG IN SECONDS
• Photo: snap your plate — your AI lists the foods, portions, calories and macros.
• Say it: type or dictate "two eggs and a coffee with milk".
• Review everything before it's added, and tap any food later to fix it.
• Favorites, recent foods and "repeat yesterday's meal".

A COACH THAT KNOWS YOU
• Ask what to eat or how to train — the Coach sees your goal and last 7 days.
• Attach photos of meals or nutrition labels; label numbers are read exactly.
• Suggested meals and workouts come with an Add button.

TRACK WHAT MATTERS
• Calories, protein, carbs, fat, water, weight and exercise.
• Optional nutrients: sodium, sugar, fiber, potassium, iron, vitamins and more.
• 7- and 30-day trends, streaks and a weight line.
• Reminders for meals, water, an evening check-in and a weekly weigh-in — skipped once you've logged.

PRIVATE BY DESIGN
• Your log stays on your phone. No ads, no tracking.
• Bring your own AI: Gemini (has a free tier), ChatGPT, Claude, DeepSeek, Qwen, OpenRouter or any compatible API. Requests go straight from your phone to the provider.
• Optional backup account to move your log to a new phone; delete it any time.

English, 中文, Français, Deutsch.

Estimates are for general fitness and are not medical advice.
```

**Keywords** (100): `calorie,counter,food,diary,macro,protein,nutrition,diet,fitness,coach,AI,photo,weight,water,meal`

| Field | Value |
|---|---|
| Category | Health & Fitness (secondary: Food & Drink) |
| Support URL | https://github.com/toni95518/lean-muscle-guide/issues |
| Marketing URL | https://lean-muscle-guide.expo.app |
| Privacy Policy URL | https://lean-muscle-guide.expo.app/privacy.html |
| Copyright | 2026 \<your legal name\> |
| Age rating | Answer *None* to everything → 4+ |
| Price | Free |

**Screenshots:** the one required set is *iPhone with Dynamic Island (medium)*: **1179 × 2556** (or 1206 × 2622), 1–10 images, PNG or JPEG. A starter set is in `docs/screenshots/` (Today, Photo review, Coach, Edit food, Trends, Me). Best: replace them with screenshots taken on your iPhone from the TestFlight build (an iPhone 15/16 screenshot is exactly 1179 × 2556). iPad screenshots aren't needed — the app is iPhone-only (`supportsTablet: false`).

## 6. App Privacy (the "nutrition label")

App Store Connect → *App Privacy → Get Started*. **Do you or your third-party partners collect data from this app? → Yes** (only because of the optional backup account). Data the app sends straight from the phone to the AI provider the user chose, with the user's own key, isn't collected by you; it is covered in the privacy policy.

| Data type | Collected | Linked to user | Tracking | Purpose |
|---|---|---|---|---|
| Contact Info → Email Address | Yes | Yes | No | App Functionality |
| Health & Fitness → Fitness (logs, weight, goals) | Yes | Yes | No | App Functionality |
| User Content → Other User Content (backup contents) | Yes | Yes | No | App Functionality |

Everything else (location, identifiers, usage data, diagnostics, purchases, photos) → **Not collected**. Tracking → **No**.

## 7. Review notes (App Review Information)

- **Sign-in required:** No (the backup account is optional). Leave the demo account fields empty, or create one and give its email and password.
- **Notes:**

```
The app works fully without an account or AI: add foods from the built-in library (Today → Add → Search) or Quick kcal.

AI features (Photo, Say it, Coach) use the user's own API key from the provider of their choice. For review, a Google Gemini key is provided:
Me → AI connection → Gemini → paste the key → Load models → pick a "flash" model → Test connection.
Key: <PASTE A GEMINI KEY HERE — make a separate key for Apple and delete it after approval>

Optional backup account: Me → Backup account → create with any email. Delete account is on the same screen.
Reminders: Me → Reminders → turn on → "Send a test reminder".
```

Create the review key at https://aistudio.google.com/apikey as a **new, separate key**, paste it only into App Store Connect (never into the repo or chat), and delete it once the app is approved.

## 8. Submit for review

Version page → *Build → +* → pick build 1 → **Add for Review → Submit**. Review is usually 1–2 days. Choose *Manually release* if you want to press the button yourself.

### If Apple rejects

| Reason | What to do |
|---|---|
| 2.1 – needs a working AI to review | Make sure the key in the notes works and has quota; test it in TestFlight first. |
| 4.2 – minimum functionality | Point out the built-in library, trends, reminders and offline use. |
| 5.1.1 – data / account | Delete account is in Me → Backup account; privacy policy URL above. |
| Guideline 1.4.1 – health claims | The description already says estimates are not medical advice. |

## Android and web (same release)

```powershell
cd mobile
npx expo export --platform web
npx eas-cli@latest deploy --prod          # web: lean-muscle-guide.expo.app (+ /privacy.html)
npx eas-cli@latest build -p android --profile preview   # APK link for friends
```

Google Play later: `--profile production` makes an `.aab`; that needs a Google Play developer account (US$25 once).
