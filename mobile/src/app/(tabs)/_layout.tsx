import { router } from "expo-router";
import { Tabs } from "expo-router/tabs";
import { useEffect } from "react";
import { IconBars, IconChat, IconClock, IconUser } from "../../components/icons";
import { C } from "../../lib/theme";
import { useApp } from "../../state/app";

export default function TabsLayout() {
  const { t, settings } = useApp();

  // First launch: show the welcome screen.
  useEffect(() => {
    if (!settings.onboarded) {
      const id = setTimeout(() => router.replace("/welcome"), 0);
      return () => clearTimeout(id);
    }
  }, [settings.onboarded]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.muted,
        tabBarStyle: { backgroundColor: C.surface, borderTopColor: C.line },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t("tab.today"), tabBarIcon: ({ color }) => <IconClock color={color as string} /> }} />
      <Tabs.Screen name="coach" options={{ title: t("tab.coach"), tabBarIcon: ({ color }) => <IconChat color={color as string} /> }} />
      <Tabs.Screen name="trends" options={{ title: t("tab.trends"), tabBarIcon: ({ color }) => <IconBars color={color as string} /> }} />
      <Tabs.Screen name="me" options={{ title: t("tab.me"), tabBarIcon: ({ color }) => <IconUser color={color as string} /> }} />
    </Tabs>
  );
}
