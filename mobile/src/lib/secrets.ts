// API keys and login tokens live in the phone's secure storage (Keychain / Keystore).
// The web build (used only for testing) falls back to browser storage.
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const web = Platform.OS === "web";
export const SECRET = { aiKey: "lmtg_ai_key", accountToken: "lmtg_account_token" };

export async function getSecret(key: string): Promise<string | null> {
  try {
    return web ? await AsyncStorage.getItem("secret:" + key) : await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}
export async function setSecret(key: string, value: string | null) {
  if (web) {
    if (value == null) await AsyncStorage.removeItem("secret:" + key);
    else await AsyncStorage.setItem("secret:" + key, value);
    return;
  }
  if (value == null) await SecureStore.deleteItemAsync(key);
  else await SecureStore.setItemAsync(key, value);
}
