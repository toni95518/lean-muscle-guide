// Fix a food that's already in the log: name, portion, how many, meal, calories, macros
// and tracked nutrients. Opened by tapping a food on Today.
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useToast } from "../components/toast";
import { Btn, Card, Field, Header, MealPicker, Notice, Screen, Stepper, s } from "../components/ui";
import { isDateKey } from "../lib/dates";
import { nutrientInfo, type Micros, type NutrientId } from "../lib/nutrients";
import * as store from "../lib/store";
import type { FoodEntry, Meal } from "../lib/store";
import { C, T } from "../lib/theme";
import { useApp } from "../state/app";

const num = (v: string) => (v.trim() === "" ? NaN : Number(v.replace(",", ".")));
const show = (n: number) => String(Math.round(n * 10) / 10);
const QTY_STEP = 0.25;

export default function EditFood() {
  const params = useLocalSearchParams<{ date?: string; id?: string }>();
  const app = useApp();
  const { t, f, profile } = app;
  const toast = useToast();
  const date = isDateKey(params.date) ? params.date : null;
  const [entry, setEntry] = useState<FoodEntry | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [serving, setServing] = useState("");
  const [qty, setQty] = useState(1);
  const [meal, setMeal] = useState<Meal>("snack");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [micro, setMicro] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!date || !params.id) return setEntry(null);
    store.getDay(date).then((d) => {
      const e = d.food.find((x) => x.id === params.id) ?? null;
      setEntry(e);
      if (!e) return;
      setName(app.food(e.name, e.libraryName));
      setServing(app.serving(e.serving));
      setQty(e.quantity);
      setMeal(e.meal);
      setKcal(show(e.kcal));
      setProtein(show(e.protein));
      setCarbs(show(e.carbs));
      setFat(show(e.fat));
      setMicro(Object.fromEntries(Object.entries(e.micros ?? {}).map(([k, v]) => [k, show(v as number)])));
    });
  }, [date, params.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (entry === undefined) return <Screen><Header title={t("edit.title")} back="close" /></Screen>;
  if (!entry || !date)
    return (
      <Screen>
        <Header title={t("edit.title")} back="close" />
        <Notice kind="error" text={t("edit.missing")} />
      </Screen>
    );

  // Nutrients shown: the ones the user tracks, plus any this food already has values for.
  const microIds = [...new Set([...profile.nutrients, ...(Object.keys(entry.micros ?? {}) as NutrientId[])])];
  const k = num(kcal), p = num(protein), c = num(carbs), ft = num(fat);
  const valid = name.trim() && k >= 0 && k <= 5000 && [p, c, ft].every((v) => Number.isNaN(v) || (v >= 0 && v <= 1000));
  const z = (v: number) => (Number.isNaN(v) ? 0 : v);

  const save = async () => {
    if (!valid) return setError(t("edit.err"));
    const micros: Micros = {};
    for (const id of microIds) {
      const v = num(micro[id] ?? "");
      if (!Number.isNaN(v) && v >= 0) micros[id] = v;
    }
    // Library names and serving words are shown translated; keep the stored key when unchanged.
    const sameName = name.trim() === app.food(entry.name, entry.libraryName);
    const sameServing = serving.trim() === app.serving(entry.serving);
    await store.updateFood(date, entry.id, {
      name: sameName ? entry.name : name.trim().slice(0, 120),
      serving: sameServing ? entry.serving : serving.trim().slice(0, 60) || "1 serving",
      quantity: qty,
      meal,
      kcal: Math.round(k),
      protein: z(p),
      carbs: z(c),
      fat: z(ft),
      micros: Object.keys(micros).length ? micros : undefined,
    });
    app.bump();
    toast.show(t("edit.saved"));
    router.back();
  };

  const remove = async () => {
    await store.removeFood(date, entry.id);
    app.bump();
    toast.show(t("toast.removed", { name: app.food(entry.name, entry.libraryName) }), {
      label: t("toast.undo"),
      run: async () => {
        await store.restoreFood(date, entry);
        app.bump();
      },
    });
    router.back();
  };

  return (
    <Screen
      footer={
        <View style={{ padding: 16, gap: 8 }}>
          <Btn label={t("edit.save")} disabled={!valid} onPress={save} />
          <Btn kind="link" label={t("edit.delete")} onPress={remove} />
        </View>
      }
    >
      <Header title={t("edit.title")} back="close" />
      {error ? <Notice kind="error" text={error} /> : null}
      <Card>
        <Field label={t("edit.name")} value={name} onChangeText={setName} style={{ flexGrow: 0, flexBasis: "auto" }} />
        <Field label={t("edit.portion")} value={serving} onChangeText={setServing} placeholder={t("unit.serving")} style={{ flexGrow: 0, flexBasis: "auto" }} />
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <Text style={T.label}>{t("edit.quantity")}</Text>
          <Stepper value={`×${f.dec(qty, 2)}`} labelMinus={t("review.smaller")} labelPlus={t("review.bigger")}
            onMinus={() => setQty((q) => Math.max(QTY_STEP, Math.round((q - QTY_STEP) * 100) / 100))}
            onPlus={() => setQty((q) => Math.min(20, Math.round((q + QTY_STEP) * 100) / 100))} />
        </View>
        <MealPicker value={meal} onChange={setMeal} />
      </Card>

      <Card>
        <Text style={T.label}>{t("edit.perPortion")}</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Field label="kcal" value={kcal} onChangeText={setKcal} keyboardType="decimal-pad" />
          <Field label={t("macro.protein")} value={protein} onChangeText={setProtein} keyboardType="decimal-pad" suffix="g" />
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Field label={t("macro.carbs")} value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" suffix="g" />
          <Field label={t("macro.fat")} value={fat} onChangeText={setFat} keyboardType="decimal-pad" suffix="g" />
        </View>
        {microIds.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {microIds.map((id) => (
              <Field key={id} label={t(`nut.${id}`)} value={micro[id] ?? ""} onChangeText={(v) => setMicro({ ...micro, [id]: v })}
                keyboardType="decimal-pad" suffix={nutrientInfo(id).unit} style={{ flexBasis: "45%", flexGrow: 1 }} />
            ))}
          </View>
        ) : null}
        <View style={{ borderTopWidth: 1, borderTopColor: C.sunk, paddingTop: 10 }}>
          <Text style={[T.body, { fontWeight: "700" }]} accessibilityLiveRegion="polite">
            {t("edit.total", { kcal: f.int(z(k) * qty), p: f.int(z(p) * qty), c: f.int(z(c) * qty), fat: f.int(z(ft) * qty) })}
          </Text>
        </View>
      </Card>
    </Screen>
  );
}
