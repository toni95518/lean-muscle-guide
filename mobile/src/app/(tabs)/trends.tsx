import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";
import { Card, Header, Screen, SectionTitle, Seg } from "../../components/ui";
import { parseKey, range, shift, today } from "../../lib/dates";
import { toDisplayWeight, WEIGHT_LABEL } from "../../lib/nutrition";
import * as store from "../../lib/store";
import type { Day } from "../../lib/store";
import { C, T } from "../../lib/theme";
import { useApp } from "../../state/app";

export default function Trends() {
  const { t, f, goals, profile, rev } = useApp();
  const [span, setSpan] = useState<7 | 30>(7);
  const [days, setDays] = useState<Day[]>([]);
  const [weights, setWeights] = useState<{ date: string; kg: number }[]>([]);
  const [streak, setStreak] = useState(0);

  const load = useCallback(() => {
    const tk = today();
    store.getDays(shift(tk, -(span - 1)), tk).then(setDays);
    // Weigh-ins and streak look further back (90 days).
    store.getDays(shift(tk, -89), tk).then((all) => {
      setWeights(all.filter((d) => d.weightKg != null).map((d) => ({ date: d.date, kg: d.weightKg as number })));
      const logged = new Set(all.filter((d) => d.food.length || d.exercise.length).map((d) => d.date));
      let n = 0;
      let k = logged.has(tk) ? tk : shift(tk, -1); // today not logged yet doesn't break the streak
      while (logged.has(k)) {
        n++;
        k = shift(k, -1);
      }
      setStreak(n);
    });
  }, [span]);
  useEffect(load, [load, rev]);
  useFocusEffect(load);

  const tk = today();
  const keys = range(shift(tk, -(span - 1)), tk);
  const byDate = new Map(days.map((d) => [d.date, d]));
  const rows = keys.map((k) => {
    const d = byDate.get(k);
    const tot = d ? store.totals(d) : null;
    return { date: k, eaten: tot?.kcal ?? 0, burned: tot?.burned ?? 0, protein: tot?.protein ?? 0, water: d?.waterGlasses ?? 0, logged: !!d && (d.food.length > 0 || d.exercise.length > 0) };
  });
  const logged = rows.filter((r) => r.logged);
  const avg = (fn: (r: (typeof rows)[number]) => number) => (logged.length ? logged.reduce((a, r) => a + fn(r), 0) / logged.length : 0);
  const onTarget = logged.filter((r) => Math.abs(r.eaten - r.burned - goals.kcal) <= goals.kcal * 0.1).length;
  const maxBar = Math.max(goals.kcal, ...rows.map((r) => Math.max(r.eaten, r.burned)), 1);
  const barH = 140;
  const unit = profile.weightUnit;

  return (
    <Screen>
      <Header title={t("trends.title")} back="none" />
      <Seg label={t("trends.span")} options={[[7, t("trends.week")], [30, t("trends.month")]]} value={span} onChange={setSpan} />

      <Card>
        <SectionTitle>{t("trends.eatenBurned")}</SectionTitle>
        <View style={{ height: barH + 20, flexDirection: "row", alignItems: "flex-end", gap: span === 7 ? 8 : 2 }} accessibilityLabel={t("trends.chartA11y", { avg: f.int(avg((r) => r.eaten)) })}>
          <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 20 + (goals.kcal / maxBar) * barH, borderTopWidth: 1, borderStyle: "dashed", borderColor: C.muted }} />
          {rows.map((r) => (
            <View key={r.date} style={{ flex: 1, alignItems: "center", gap: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2, height: barH }}>
                <View style={{ width: span === 7 ? 12 : 4, height: Math.max(r.eaten ? 3 : 0, (r.eaten / maxBar) * barH), backgroundColor: C.accent, borderRadius: 3 }} />
                <View style={{ width: span === 7 ? 12 : 4, height: Math.max(r.burned ? 3 : 0, (r.burned / maxBar) * barH), backgroundColor: C.burn, borderRadius: 3 }} />
              </View>
              {span === 7 ? <Text style={{ fontSize: 11, color: r.date === tk ? C.ink : C.muted, fontWeight: r.date === tk ? "800" : "500" }}>{f.date(parseKey(r.date), { weekday: "narrow" })}</Text> : <View style={{ height: 16 }} />}
            </View>
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
          <Legend color={C.accent} label={t("trends.eaten")} />
          <Legend color={C.burn} label={t("trends.burned")} />
          <Legend color={C.muted} label={t("trends.goalLine", { kcal: f.int(goals.kcal) })} dashed />
        </View>
      </Card>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <Stat label={t("trends.avgEaten")} value={`${f.int(avg((r) => r.eaten))}`} unit="kcal" />
        <Stat label={t("trends.avgBurned")} value={`${f.int(avg((r) => r.burned))}`} unit="kcal" />
        <Stat label={t("trends.avgProtein")} value={`${f.int(avg((r) => r.protein))}`} unit="g" />
        <Stat label={t("trends.onTarget")} value={`${onTarget}/${logged.length}`} unit={t("trends.days")} />
        <Stat label={t("trends.streak")} value={`${streak}`} unit={t("trends.days")} />
        <Stat label={t("trends.avgWater")} value={f.dec((avg((r) => r.water) * 250) / 1000)} unit="L" />
      </View>

      <Card>
        <SectionTitle>{t("trends.weight")}</SectionTitle>
        {weights.length >= 2 ? (
          <WeightLine points={weights.map((w) => toDisplayWeight(w.kg, unit))} />
        ) : (
          <Text style={T.small}>{t("trends.weightEmpty")}</Text>
        )}
        {weights.length ? (
          <Text style={T.small}>
            {t("trends.weightLatest", { v: f.dec(toDisplayWeight(weights[weights.length - 1].kg, unit)), unit: WEIGHT_LABEL[unit] })}
            {weights.length >= 2 ? `  ·  ${t("trends.weightChange", { v: (weights[weights.length - 1].kg - weights[0].kg >= 0 ? "+" : "") + f.dec(toDisplayWeight(weights[weights.length - 1].kg - weights[0].kg, unit)), unit: WEIGHT_LABEL[unit] })}` : ""}
          </Text>
        ) : null}
      </Card>
      {!logged.length ? <Text style={[T.small, { textAlign: "center" }]}>{t("trends.empty")}</Text> : null}
    </Screen>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={dashed ? { width: 14, borderTopWidth: 1, borderStyle: "dashed", borderColor: color } : { width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <Text style={T.small}>{label}</Text>
    </View>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={{ width: "31%", flexGrow: 1, minWidth: 100, backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 12, gap: 4 }}>
      <Text style={[T.label, { fontSize: 10.5 }]} numberOfLines={2}>{label}</Text>
      <Text style={[T.num, { fontSize: 22, color: C.ink }]}>
        {value} <Text style={{ fontSize: 12, color: C.muted, fontWeight: "600" }}>{unit}</Text>
      </Text>
    </View>
  );
}

function WeightLine({ points }: { points: number[] }) {
  const [w, setW] = useState(300);
  const h = 90;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const pad = Math.max(0.5, (max - min) * 0.15);
  const y = (v: number) => h - 6 - ((v - (min - pad)) / (max + pad - (min - pad))) * (h - 12);
  const x = (i: number) => 6 + (i / (points.length - 1)) * (w - 12);
  const pts = points.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <Svg width={w} height={h}>
        <Polyline points={pts} fill="none" stroke={C.ink} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <Circle cx={x(points.length - 1)} cy={y(points[points.length - 1])} r={4} fill={C.accent} />
      </Svg>
    </View>
  );
}
