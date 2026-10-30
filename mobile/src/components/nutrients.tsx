// The tracked-nutrients card on Today, plus small helpers for showing nutrient values.
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { fmtAmount, nutrientInfo, type Micros, type NutrientId } from "../lib/nutrients";
import type { Totals } from "../lib/store";
import { C, T } from "../lib/theme";
import { useApp } from "../state/app";
import { Card, SectionTitle } from "./ui";

/** "Sodium 820 mg · Vit C 12 mg" for the nutrients the user tracks; "" when none are known. */
export function useMicroLine() {
  const { t, profile } = useApp();
  return (micros: Micros | undefined, scale = 1) =>
    profile.nutrients
      .filter((id) => micros?.[id] != null)
      .map((id) => `${t(`nut.short.${id}`)} ${fmtAmount((micros![id] as number) * scale)} ${nutrientInfo(id).unit}`)
      .join(" · ");
}

export function NutrientCard({ tot }: { tot: Totals }) {
  const { t, profile } = useApp();
  if (!profile.nutrients.length) return null;
  const missing = tot.foods - tot.microFoods;
  return (
    <Card>
      <SectionTitle right={<Pressable onPress={() => router.push("/me")} accessibilityRole="button" hitSlop={8}><Text style={{ color: C.accent, fontWeight: "700", fontSize: 13 }}>{t("nut.edit")}</Text></Pressable>}>
        {t("nut.title")}
      </SectionTitle>
      {profile.nutrients.map((id) => (
        <NutrientBar key={id} id={id} value={tot.micros[id] ?? 0} target={profile.nutrientTargets[id] ?? nutrientInfo(id).dv} />
      ))}
      {missing > 0 ? <Text style={T.small}>{t("nut.coverage", { n: tot.microFoods, total: tot.foods })}</Text> : null}
      {!tot.foods ? <Text style={T.small}>{t("nut.empty")}</Text> : null}
    </Card>
  );
}

function NutrientBar({ id, value, target }: { id: NutrientId; value: number; target: number }) {
  const { t } = useApp();
  const n = nutrientInfo(id);
  const pct = target ? value / target : 0;
  const over = n.kind === "limit" && pct > 1;
  const met = n.kind === "goal" && pct >= 1;
  const color = over ? C.danger : met ? C.accent : n.kind === "limit" ? C.carb : C.water;
  return (
    <View style={{ gap: 3 }} accessible accessibilityLabel={`${t(`nut.${id}`)}: ${fmtAmount(value)} / ${fmtAmount(target)} ${n.unit}`}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
        <Text style={{ fontSize: 12.5, color: C.ink, flexShrink: 1 }} numberOfLines={1}>
          {t(`nut.${id}`)}
          <Text style={{ color: C.muted }}>{n.kind === "limit" ? `  ${t("nut.limit")}` : ""}</Text>
        </Text>
        <Text style={{ fontSize: 12.5, color: over ? C.danger : C.muted, fontWeight: over ? "700" : "400" }}>
          {fmtAmount(value)} / {fmtAmount(target)} {n.unit}
        </Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: C.sunk }}>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: color, width: `${Math.max(0, Math.min(100, pct * 100))}%` }} />
      </View>
    </View>
  );
}
