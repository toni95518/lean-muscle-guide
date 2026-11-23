import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, AppState, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ToastProvider } from "../components/toast";
import { clearLastResponse, lastResponse, onResponse, routeForResponse, syncReminders } from "../lib/reminders";
import { C } from "../lib/theme";
import { AppProvider, useApp } from "../state/app";

function Gate() {
  const { ready } = useApp();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg }}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="connect-ai" options={{ presentation: "modal" }} />
      <Stack.Screen name="photo" options={{ presentation: "fullScreenModal" }} />
      <Stack.Screen name="say" options={{ presentation: "modal" }} />
      <Stack.Screen name="add" options={{ presentation: "modal" }} />
      <Stack.Screen name="account" options={{ presentation: "modal" }} />
      <Stack.Screen name="edit-food" options={{ presentation: "modal" }} />
    </Stack>
  );
}

/** Keeps scheduled reminders in step with the log, and opens the right screen when one is tapped. */
function ReminderBridge() {
  const { ready, settings, t, lang, goals, rev, bump } = useApp();
  // Re-plan when settings or the log change, and whenever the app comes back to the foreground.
  useEffect(() => {
    if (!ready) return;
    syncReminders(settings.reminders, t, lang, goals.water).catch((e) => console.warn("Reminder sync failed", e));
  }, [ready, settings.reminders, lang, goals.water, rev]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active" && ready) syncReminders(settings.reminders, t, lang, goals.water).catch(() => {});
    });
    return () => sub.remove();
  }, [ready, settings.reminders, lang, goals.water]); // eslint-disable-line react-hooks/exhaustive-deps
  // Taps: one that launched the app (cold start), then any while it runs.
  useEffect(() => {
    if (!ready || !settings.onboarded) return;
    const go = async (res: Parameters<typeof routeForResponse>[0]) => {
      const url = await routeForResponse(res);
      clearLastResponse();
      bump();
      if (url) setTimeout(() => router.push(url as never), 50);
    };
    const first = lastResponse();
    if (first) go(first);
    const sub = onResponse(go);
    return () => sub.remove();
  }, [ready, settings.onboarded]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <ToastProvider>
          <StatusBar style="dark" />
          <Gate />
          <ReminderBridge />
        </ToastProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}
