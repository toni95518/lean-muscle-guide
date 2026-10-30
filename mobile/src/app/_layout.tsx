import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ToastProvider } from "../components/toast";
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
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <ToastProvider>
          <StatusBar style="dark" />
          <Gate />
        </ToastProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}
