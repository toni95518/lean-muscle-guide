import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "../lib/theme";

interface ToastState {
  show: (msg: string, undo?: { label: string; run: () => void }) => void;
}
const Ctx = createContext<ToastState>({ show: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<{ text: string; undo?: { label: string; run: () => void } } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const show = useCallback<ToastState["show"]>((text, undo) => {
    if (timer.current) clearTimeout(timer.current);
    setMsg({ text, undo });
    timer.current = setTimeout(() => setMsg(null), 4500);
  }, []);
  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {msg ? (
        <View pointerEvents="box-none" style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 150, alignItems: "center" }}>
          <View accessibilityLiveRegion="polite" style={{ backgroundColor: C.ink, borderRadius: 12, paddingVertical: 10, paddingLeft: 16, paddingRight: msg.undo ? 6 : 16, flexDirection: "row", alignItems: "center", gap: 10, maxWidth: 480 }}>
            <Text style={{ color: C.bg, fontSize: 14, flexShrink: 1 }}>{msg.text}</Text>
            {msg.undo ? (
              <Pressable accessibilityRole="button" onPress={() => { msg.undo?.run(); setMsg(null); }} style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
                <Text style={{ color: C.accentSoft, fontWeight: "800" }}>{msg.undo.label}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </Ctx.Provider>
  );
}
export const useToast = () => useContext(Ctx);
