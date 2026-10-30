// Shared "review what the AI found, then add it" step for Photo and Say it.
import { router } from "expo-router";
import { ActivityIndicator, Image, Text, View } from "react-native";
import { providerInfo } from "../lib/ai/providers";
import * as store from "../lib/store";
import type { Meal } from "../lib/store";
import { C, T } from "../lib/theme";
import { useApp } from "../state/app";
import { ReviewList, rowsTotal, type ReviewRow } from "./review";
import { useToast } from "./toast";
import { Btn, Card, MealPicker, Notice, s } from "./ui";

export async function saveRows(date: string, meal: Meal, rows: ReviewRow[]) {
  const on = rows.filter((r) => r.on);
  const foods = on.flatMap((r) => (r.kind === "food" ? [{ ...r.food, quantity: r.scale, meal: r.food.meal ?? meal }] : []));
  const ex = on.flatMap((r) => (r.kind === "ex" ? [r.ex] : []));
  if (foods.length) await store.addFoods(date, meal, "ai", foods.map(({ confidence: _c, ...f }) => f));
  if (ex.length) await store.addExercises(date, "ai", ex);
  return { foods: foods.length, ex: ex.length };
}

export function Thinking({ photoUri }: { photoUri?: string }) {
  const { t, settings } = useApp();
  return (
    <View style={{ alignItems: "center", gap: 16, paddingVertical: 40 }}>
      {photoUri ? <Image source={{ uri: photoUri }} style={{ width: 200, height: 200, borderRadius: 16 }} accessibilityIgnoresInvertColors /> : null}
      <ActivityIndicator size="large" color={C.accent} />
      <Text style={[T.body, { textAlign: "center" }]}>{t("ai.thinking", { name: settings.ai ? providerInfo(settings.ai.provider).name : "AI" })}</Text>
    </View>
  );
}

export function ReviewStep({ rows, setRows, notes, meal, setMeal, date, photoUri }: {
  rows: ReviewRow[];
  setRows: (r: ReviewRow[]) => void;
  notes: string | null;
  meal: Meal;
  setMeal: (m: Meal) => void;
  date: string;
  photoUri?: string;
}) {
  const app = useApp();
  const { t, f } = app;
  const toast = useToast();
  const tot = rowsTotal(rows);
  const hasFood = rows.some((r) => r.kind === "food");
  const save = async () => {
    const n = await saveRows(date, meal, rows);
    app.bump();
    toast.show(t("toast.addedAi", { n: n.foods + n.ex, kcal: f.int(tot.eaten) }));
    router.back();
  };
  return (
    <>
      <Card style={[s.row, { alignItems: "center" }]}>
        {photoUri ? <Image source={{ uri: photoUri }} style={{ width: 84, height: 84, borderRadius: 12 }} accessibilityIgnoresInvertColors /> : null}
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[T.num, { fontSize: 30, color: C.ink }]}>{f.int(tot.eaten)} kcal</Text>
          <Text style={T.small}>{t("review.summary", { p: f.int(tot.protein), burned: f.int(tot.burned) })}</Text>
        </View>
      </Card>
      {notes ? <Notice text={t("review.note", { s: notes })} /> : null}
      <Text style={T.small}>{t("review.hint")}</Text>
      <ReviewList rows={rows} onChange={setRows} />
      {hasFood ? <MealPicker value={meal} onChange={setMeal} /> : null}
      <Btn label={t("review.add", { n: tot.count })} disabled={!tot.count} onPress={save} />
      <Text style={[T.small, { textAlign: "center" }]}>{t("review.estimate")}</Text>
    </>
  );
}

export function NeedsAi() {
  const { t } = useApp();
  return (
    <Notice text={t("ai.needKey")}>
      <Btn small label={t("ai.connect")} onPress={() => router.push("/connect-ai")} style={{ alignSelf: "flex-start" }} />
    </Notice>
  );
}
