// Privacy policy text, shared by the in-app page (src/app/privacy.tsx) and the static
// public/privacy.html (npm run privacy). Keep it in step with what the app actually does.

export const UPDATED = "November 23, 2026";
export const CONTACT = "https://github.com/toni95518/lean-muscle-guide/issues";

export const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "Summary",
    body: [
      "Lean Muscle Theory Guide (薄肌理论指南) keeps your log on your device. There are no ads, no analytics and no tracking, and your data is never sold or shared for marketing.",
    ],
  },
  {
    title: "Data stored on your device",
    body: [
      "Your goals and body details (sex, age, height, weight), food, exercise, water and weight logs, favorites, Coach chat history and reminder settings are stored only on your device.",
      "Your AI API key is kept in the device's secure storage (in the web version, in your browser's storage). It is sent only to the AI provider you chose, never to us.",
    ],
  },
  {
    title: "AI features",
    body: [
      "When you use Photo, Say it or Coach, the photo or text you provide, together with a short summary of your goals and recent log, is sent directly from your device to the AI provider you selected (for example Google, OpenAI or Anthropic) using your own API key.",
      "That provider processes it under its own terms and privacy policy. We do not receive or store these requests or photos.",
    ],
  },
  {
    title: "Optional backup account",
    body: [
      "If you create a backup account, we store your email address, a securely hashed password and the backups you upload (your goals, body details and logs). Coach chats, photos and your AI key are never included.",
      "Backups are used only to restore your log on a device. They are stored on servers operated by Render (application hosting) and Neon (database) in the United States.",
    ],
  },
  {
    title: "Reminders",
    body: ["Reminders are scheduled by the app on your device. No reminder data is sent to a server."],
  },
  {
    title: "Deleting your data",
    body: [
      "Delete your account and its backup at any time in Me → Backup account → Delete account. Deletion is immediate and permanent.",
      "Erase everything stored on your device in Me → Erase all data on this phone, or by deleting the app.",
    ],
  },
  {
    title: "Health information",
    body: [
      "Calorie and nutrient figures are estimates for general fitness tracking and are not medical advice. The app is not intended for children under 13.",
    ],
  },
  {
    title: "Changes and contact",
    body: [
      "If this policy changes, the updated version will be posted here with a new date.",
      "Questions: open an issue at the project's GitHub page (link below).",
    ],
  },
];
