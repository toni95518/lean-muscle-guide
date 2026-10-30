import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { router } from "expo-router";
import { C, R, T } from "../lib/theme";
import { MEALS, type Meal } from "../lib/store";
import { useApp } from "../state/app";
import { IconBack, IconCheck, IconClose } from "./icons";

export function Screen({ children, scroll = true, bg = C.bg, footer }: { children: ReactNode; scroll?: boolean; bg?: string; footer?: ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: footer ? 16 : 40 }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, padding: 16, gap: 12 }}>{children}</View>
      )}
      {footer ? <SafeAreaView edges={["bottom"]} style={{ backgroundColor: bg }}>{footer}</SafeAreaView> : null}
    </SafeAreaView>
  );
}

export function Header({ title, sub, back = "back", right }: { title: string; sub?: string; back?: "back" | "close" | "none"; right?: ReactNode }) {
  const { t } = useApp();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      {back !== "none" ? (
        <IconButton label={t(back === "close" ? "a11y.close" : "a11y.back")} onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}>
          {back === "close" ? <IconClose size={16} /> : <IconBack size={18} />}
        </IconButton>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[T.display, { fontSize: 26, color: C.ink }]} numberOfLines={1}>{title}</Text>
        {sub ? <Text style={T.small}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function IconButton({ children, onPress, label, style, disabled }: { children: ReactNode; onPress: () => void; label: string; style?: StyleProp<ViewStyle>; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [s.iconBtn, disabled && { opacity: 0.35 }, pressed && { opacity: 0.6 }, style]}
    >
      {children}
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function SectionTitle({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
      <Text style={[T.h2, { color: C.ink }]}>{children}</Text>
      {right}
    </View>
  );
}

type BtnKind = "primary" | "soft" | "ghost" | "danger" | "link";
export function Btn({ label, onPress, kind = "primary", disabled, loading, icon, style, small }: { label: string; onPress: () => void; kind?: BtnKind; disabled?: boolean; loading?: boolean; icon?: ReactNode; style?: StyleProp<ViewStyle>; small?: boolean }) {
  const bg = { primary: C.accent, soft: C.sunk, ghost: "transparent", danger: C.dangerSoft, link: "transparent" }[kind];
  const fg = { primary: C.onAccent, soft: C.ink, ghost: C.ink, danger: C.danger, link: C.accent }[kind];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || loading) }}
      style={({ pressed }) => [
        { backgroundColor: bg, borderRadius: R.control, paddingVertical: kind === "link" ? 6 : small ? 9 : 14, paddingHorizontal: small ? 12 : 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: kind === "link" ? 32 : 44 },
        kind === "ghost" && { borderWidth: 1, borderColor: C.line },
        (disabled || loading) && { opacity: 0.45 },
        pressed && { opacity: 0.75 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon}
      <Text style={{ color: fg, fontWeight: "700", fontSize: small ? 14 : 16 }}>{label}</Text>
    </Pressable>
  );
}

export function Seg<V extends string | number>({ options, value, onChange, label }: { options: [V, string][]; value: V; onChange: (v: V) => void; label?: string }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={s.seg}>
      {options.map(([v, l]) => {
        const on = v === value;
        return (
          <Pressable key={String(v)} onPress={() => onChange(v)} accessibilityRole="radio" accessibilityState={{ checked: on }} style={[s.segItem, on && s.segOn]}>
            <Text style={{ fontWeight: "600", fontSize: 13.5, color: on ? C.ink : C.muted }} numberOfLines={1}>{l}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Wrapping choice chips, for option lists that don't fit one row. */
export function Chips<V extends string | number>({ options, value, onChange, label }: { options: [V, string][]; value: V; onChange: (v: V) => void; label?: string }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map(([v, l]) => {
        const on = v === value;
        return (
          <Pressable key={String(v)} onPress={() => onChange(v)} accessibilityRole="radio" accessibilityState={{ checked: on }}
            style={{ paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, borderWidth: on ? 2 : 1, borderColor: on ? C.accent : C.line, backgroundColor: on ? C.accentSoft : C.surface, minHeight: 40, justifyContent: "center" }}>
            <Text style={{ fontWeight: on ? "700" : "500", fontSize: 14, color: C.ink }}>{l}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function MealPicker({ value, onChange }: { value: Meal; onChange: (m: Meal) => void }) {
  const { t } = useApp();
  return (
    <View style={{ gap: 6 }}>
      <Text style={T.label}>{t("field.meal")}</Text>
      <Seg label={t("field.meal")} options={MEALS.map((m) => [m, t(`meal.${m}`)] as [Meal, string])} value={value} onChange={onChange} />
    </View>
  );
}

export function Field({ label, suffix, hint, style, ...input }: TextInputProps & { label: string; suffix?: string; hint?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap: 6, flex: 1, minWidth: 0 }, style]}>
      <Text style={T.label}>{label}</Text>
      <View style={{ justifyContent: "center" }}>
        <TextInput placeholderTextColor="#8A988F" accessibilityLabel={label} {...input} style={[s.input, suffix ? { paddingRight: 50 } : null]} />
        {suffix ? <Text style={s.suffix} pointerEvents="none">{suffix}</Text> : null}
      </View>
      {hint ? <Text style={T.small}>{hint}</Text> : null}
    </View>
  );
}

export function Notice({ kind = "info", text, children }: { kind?: "info" | "ok" | "error" | "plan"; text?: string; children?: ReactNode }) {
  const bg = { info: C.accentSoft, ok: C.accentSoft, error: C.dangerSoft, plan: C.waterSoft }[kind];
  const fg = { info: C.ink, ok: C.accentDark, error: C.danger, plan: C.ink }[kind];
  return (
    <View style={{ backgroundColor: bg, borderRadius: 14, padding: 12, gap: 8 }}>
      {text ? <Text style={{ color: fg, fontSize: 14, lineHeight: 20 }}>{text}</Text> : null}
      {children}
    </View>
  );
}

export function Tag({ kind }: { kind: "ai" | "quick" }) {
  const { t } = useApp();
  return (
    <Text style={[s.tag, kind === "ai" ? { backgroundColor: C.accentSoft, color: C.accent } : { backgroundColor: C.sunk, color: C.muted }]}>
      {t(kind === "ai" ? "tag.ai" : "tag.quick")}
    </Text>
  );
}

export function Checkbox({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <Pressable onPress={onToggle} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={label} hitSlop={8}
      style={[s.check, on ? { backgroundColor: C.accent, borderColor: C.accent } : null]}>
      {on ? <IconCheck size={16} color="#fff" /> : null}
    </Pressable>
  );
}

export function Stepper({ value, onMinus, onPlus, labelMinus, labelPlus }: { value: string; onMinus: () => void; onPlus: () => void; labelMinus: string; labelPlus: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Pressable onPress={onMinus} accessibilityRole="button" accessibilityLabel={labelMinus} style={s.step}><Text style={s.stepTxt}>−</Text></Pressable>
      <Text style={[T.num, { minWidth: 52, textAlign: "center", fontSize: 18 }]}>{value}</Text>
      <Pressable onPress={onPlus} accessibilityRole="button" accessibilityLabel={labelPlus} style={s.step}><Text style={s.stepTxt}>+</Text></Pressable>
    </View>
  );
}

export function Ring({ size = 112, pct, over, big, label }: { size?: number; pct: number; over: boolean; big: string; label: string }) {
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.sunk} strokeWidth={10} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={over ? C.danger : C.accent} strokeWidth={10} fill="none" strokeLinecap="round"
          strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, pct)))} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={[T.num, { fontSize: 28, color: over ? C.danger : C.ink }]}>{big}</Text>
        <Text style={{ fontSize: 10.5, letterSpacing: 0.8, textTransform: "uppercase", color: C.muted }}>{label}</Text>
      </View>
    </View>
  );
}

export function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const { f } = useApp();
  return (
    <View style={{ gap: 3 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 12.5, color: C.ink }}>{label}</Text>
        <Text style={{ fontSize: 12.5, color: C.muted }}>{f.int(value)} / {f.int(goal)} g</Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: C.sunk }}>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: color, width: `${Math.max(0, Math.min(100, goal ? (value / goal) * 100 : 0))}%` }} />
      </View>
    </View>
  );
}

export const s = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: R.card, borderWidth: 1, borderColor: C.line, padding: 14, gap: 10 },
  iconBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  seg: { flexDirection: "row", backgroundColor: C.sunk, borderRadius: 12, padding: 3, gap: 2 },
  segItem: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 9, paddingHorizontal: 4, borderRadius: 9, minHeight: 40 },
  segOn: { backgroundColor: C.surface, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  input: { fontSize: 16, paddingVertical: 11, paddingHorizontal: 12, borderWidth: 1, borderColor: C.line, borderRadius: 12, backgroundColor: C.surface, color: C.ink, minHeight: 46 },
  suffix: { position: "absolute", right: 12, color: C.muted, fontSize: 14 },
  tag: { fontSize: 10, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase", borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1, overflow: "hidden", marginRight: 6 },
  check: { width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: C.line, alignItems: "center", justifyContent: "center", backgroundColor: C.surface },
  step: { width: 44, height: 38, borderRadius: 10, borderWidth: 1, borderColor: C.line, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  stepTxt: { fontSize: 20, fontWeight: "600", color: C.ink },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  divider: { height: 1, backgroundColor: C.sunk },
});
