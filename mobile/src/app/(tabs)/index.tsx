import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { IconBack, IconCamera, IconChat, IconClose, IconMic, IconNext, IconSpark, IconStar } from "../../components/icons";
import { NutrientCard, useMicroLine } from "../../components/nutrients";
import { useToast } from "../../components/toast";
import { Btn, Card, IconButton, MacroBar, Notice, Ring, Screen, SectionTitle, Seg, Tag, s } from "../../components/ui";
import { providerInfo } from "../../lib/ai/providers";
import { parseKey, shift, today } from "../../lib/dates";
import { fromDisplayWeight, liters, toDisplayWeight, WEIGHT_LABEL, type WeightUnit } from "../../lib/nutrition";
import * as store from "../../lib/store";
import { MEALS, type Day, type ExerciseEntry, type FoodEntry } from "../../lib/store";
import { C, T } from "../../lib/theme";
import { useApp } from "../../state/app";

const MAX_AHEAD = 365;

export default function Today() {
  const app = useApp();
  const { t, f, goals, profile, settings, rev, bump } = app;
  const toast = useToast();
  const [date, setDate] = useState(today());
  const [day, setDay] = useState<Day | null>(null);
  const [weightText, setWeightText] = useState("");

  const load = useCallback(() => {
    store.getDay(date).then(setDay);
  }, [date]);
  useEffect(load, [load, rev]);
  useFocusEffect(load);

  const tk = today();
  const future = date > tk;
  const title = date === tk ? t("day.today") : date === shift(tk, -1) ? t("day.yesterday") : date === shift(tk, 1) ? t("day.tomorrow") : f.date(parseKey(date), { weekday: "long" });
  const tot = store.totals(day ?? { date, food: [], exercise: [], waterGlasses: 0, weightKg: null });
  const microLine = useMicroLine();
  const left = goals.kcal - (tot.kcal - tot.burned);
  const over = left < 0;
  const aiReady = app.hasAiKey && settings.ai;
  const proteinLeft = goals.protein - tot.protein;

  const removeFood = async (e: FoodEntry) => {
    await store.removeFood(date, e.id);
    bump();
    toast.show(t("toast.removed", { name: app.food(e.name, e.libraryName) }), { label: t("toast.undo"), run: async () => { await store.restoreFood(date, e); bump(); } });
  };
  const removeEx = async (e: ExerciseEntry) => {
    await store.removeExercise(date, e.id);
    bump();
    toast.show(t("toast.removed", { name: app.activity(e.name, e.activityName) }), { label: t("toast.undo"), run: async () => { await store.restoreExercise(date, e); bump(); } });
  };
  const toggleFavorite = async (e: FoodEntry) => {
    const exists = app.favorites.find((x) => x.name === e.name);
    if (exists) {
      await app.setFavorites(app.favorites.filter((x) => x !== exists));
      toast.show(t("fav.removed", { name: app.food(e.name, e.libraryName) }));
    } else {
      const { id: _i, meal: _m, source: _s, quantity: _q, createdAt: _c, ...rest } = e;
      await app.setFavorites([...app.favorites, { ...rest, id: store.uid() }]);
      toast.show(t("fav.added", { name: app.food(e.name, e.libraryName) }));
    }
  };
  const setWater = async (glasses: number) => {
    await store.setWater(date, glasses);
    bump();
  };
  const saveWeight = async () => {
    const v = parseFloat(weightText.replace(",", "."));
    const kg = fromDisplayWeight(v, profile.weightUnit);
    if (!(kg > 25 && kg < 400)) return toast.show(t("weight.invalid", { unit: WEIGHT_LABEL[profile.weightUnit] }));
    const latest = await store.setWeight(date, Math.round(kg * 100) / 100);
    if (latest != null) await app.updateProfile({ weightKg: latest });
    setWeightText("");
    bump();
    toast.show(t("weight.saved", { v: f.dec(v), unit: WEIGHT_LABEL[profile.weightUnit] }));
  };

  const go = (path: "/photo" | "/say" | "/add", params: Record<string, string> = {}) => router.push({ pathname: path, params: { date, ...params } });

  const actionBar = (
    <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.surface }}>
      <ActionButton primary label={t("action.photo")} icon={<IconCamera color="#fff" size={24} />} onPress={() => go("/photo")} />
      <ActionButton label={t("action.say")} icon={<IconMic size={24} />} onPress={() => go("/say")} />
      <ActionButton label={t("action.favorites")} icon={<IconStar size={24} />} onPress={() => go("/add", { tab: "fav" })} />
    </View>
  );

  return (
    <Screen footer={actionBar}>
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <Text style={{ fontSize: 20, fontWeight: "800", letterSpacing: 1, color: C.ink }}>{t("app.name")}</Text>
        <Pressable onPress={() => router.push("/connect-ai")} accessibilityRole="button" style={[s.row, { gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: aiReady ? C.accentSoft : C.sunk }]}>
          <IconSpark size={14} color={aiReady ? C.accentDark : C.muted} />
          <Text style={{ fontSize: 12.5, fontWeight: "700", color: aiReady ? C.accentDark : C.ink }}>
            {aiReady ? t("today.aiOn", { name: providerInfo(settings.ai!.provider).name }) : t("today.aiOff")}
          </Text>
        </Pressable>
      </View>

      <View style={[s.row, { justifyContent: "space-between" }]}>
        <IconButton label={t("a11y.prevDay")} onPress={() => setDate(shift(date, -1))}><IconBack size={18} /></IconButton>
        <View style={{ alignItems: "center", flex: 1 }}>
          <Text style={[T.display, { color: C.ink }]}>{title}</Text>
          <Text style={T.small}>{f.date(parseKey(date), { month: "long", day: "numeric", year: "numeric" })}</Text>
          {date !== tk ? <Btn kind="link" small label={t("day.backToday")} onPress={() => setDate(tk)} /> : null}
        </View>
        <IconButton label={t("a11y.nextDay")} disabled={date >= shift(tk, MAX_AHEAD)} onPress={() => setDate(shift(date, 1))}><IconNext size={18} /></IconButton>
      </View>

      {future ? <Notice kind="plan" text={t("day.planned")} /> : null}
      {!profile.setupComplete ? (
        <Notice text={t("banner.setup")}>
          <Btn small label={t("banner.setGoals")} onPress={() => router.push("/me")} style={{ alignSelf: "flex-start" }} />
        </Notice>
      ) : null}

      <Card style={{ gap: 14 }}>
        <View style={[s.row, { gap: 16 }]}>
          <Ring pct={(tot.kcal - tot.burned) / goals.kcal} over={over} big={f.int(Math.abs(left))} label={t(over ? "ring.over" : "ring.left")} />
          <View style={{ flex: 1, gap: 6 }}>
            <Eq label={t("eq.goal")} value={f.int(goals.kcal)} />
            <Eq label={t("eq.food")} value={"− " + f.int(tot.kcal)} />
            <Eq label={t("eq.exercise")} value={"+ " + f.int(tot.burned)} color={C.burn} />
            <View style={s.divider} />
            <Eq label={t(over ? "eq.over" : "eq.remaining")} value={f.int(Math.abs(left))} bold />
          </View>
        </View>
        <View style={{ gap: 8 }}>
          <MacroBar label={t("macro.protein")} value={tot.protein} goal={goals.protein} color={C.prot} />
          <MacroBar label={t("macro.carbs")} value={tot.carbs} goal={goals.carbs} color={C.carb} />
          <MacroBar label={t("macro.fat")} value={tot.fat} goal={goals.fat} color={C.fat} />
        </View>
      </Card>

      <NutrientCard tot={tot} />

      {date === tk && aiReady && new Date().getHours() >= 14 && proteinLeft > 20 ? (
        <Pressable onPress={() => router.push("/coach")} accessibilityRole="button" style={[s.row, { backgroundColor: C.accentSoft, borderRadius: 14, padding: 12, alignItems: "flex-start" }]}>
          <IconChat size={20} color={C.accent} />
          <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: C.ink }}>
            {t("today.tipProtein", { n: f.int(proteinLeft) })} <Text style={{ fontWeight: "800", color: C.accent }}>{t("today.askCoach")}</Text>
          </Text>
        </Pressable>
      ) : null}

      {MEALS.map((m) => {
        const items = day?.food.filter((x) => x.meal === m) ?? [];
        const sum = items.reduce((a, x) => a + x.kcal * x.quantity, 0);
        return (
          <Card key={m}>
            <SectionTitle right={items.length ? <Text style={[T.num, { color: C.muted }]}>{f.int(sum)} kcal</Text> : undefined}>{t(`meal.${m}`)}</SectionTitle>
            {items.length ? (
              items.map((e, i) => (
                <Pressable key={e.id} onLongPress={() => toggleFavorite(e)} delayLongPress={350} accessibilityHint={t("today.longPressHint")}
                  style={[s.row, { paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: C.sunk }]}>
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <View style={s.row}>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: C.ink, flexShrink: 1 }}>{app.food(e.name, e.libraryName)}</Text>
                      {app.favorites.some((x) => x.name === e.name) ? <IconStar size={13} color={C.carb} filled /> : null}
                    </View>
                    <Text style={T.small} numberOfLines={1}>
                      {e.source === "ai" || e.source === "coach" ? <Tag kind="ai" /> : e.source === "quick" ? <Tag kind="quick" /> : null}
                      {(e.quantity !== 1 ? f.dec(e.quantity, 2) + " × " : "") + app.serving(e.serving)} · {t("abbr.p")} {f.int(e.protein * e.quantity)} · {t("abbr.c")} {f.int(e.carbs * e.quantity)} · {t("abbr.f")} {f.int(e.fat * e.quantity)}
                    </Text>
                    {microLine(e.micros, e.quantity) ? <Text style={[T.small, { fontSize: 11.5 }]} numberOfLines={1}>{microLine(e.micros, e.quantity)}</Text> : null}
                  </View>
                  <Text style={[T.num, { fontSize: 18, color: C.ink }]}>{f.int(e.kcal * e.quantity)}</Text>
                  <IconButton label={t("a11y.remove", { name: app.food(e.name, e.libraryName) })} onPress={() => removeFood(e)} style={{ borderWidth: 0, width: 36, height: 36 }}>
                    <IconClose size={13} color={C.muted} />
                  </IconButton>
                </Pressable>
              ))
            ) : (
              <Text style={T.small}>{t(future ? "food.emptyPlan" : "food.empty")}</Text>
            )}
            <Btn kind="ghost" small label={t("food.add")} onPress={() => go("/add", { meal: m })} style={{ alignSelf: "flex-start" }} />
          </Card>
        );
      })}

      <Card>
        <SectionTitle right={day?.exercise.length ? <Text style={[T.num, { color: C.muted }]}>{tot.minutes ? `${f.int(tot.minutes)} ${t("unit.min")} · ` : ""}{f.int(tot.burned)} kcal</Text> : undefined}>{t("ex.title")}</SectionTitle>
        {day?.exercise.length ? (
          day.exercise.map((e, i) => (
            <View key={e.id} style={[s.row, { paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: C.sunk }]}>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: C.ink }}>{app.activity(e.name, e.activityName)}</Text>
                <Text style={T.small}>
                  {e.source === "ai" || e.source === "coach" ? <Tag kind="ai" /> : e.source === "quick" ? <Tag kind="quick" /> : null}
                  {e.minutes ? `${e.minutes} ${t("unit.min")}` : t("ex.caloriesOnly")}{e.note ? ` · ${e.note}` : ""}
                </Text>
              </View>
              <Text style={[T.num, { fontSize: 18, color: C.burn }]}>−{f.int(e.kcal)}</Text>
              <IconButton label={t("a11y.remove", { name: e.name })} onPress={() => removeEx(e)} style={{ borderWidth: 0, width: 36, height: 36 }}>
                <IconClose size={13} color={C.muted} />
              </IconButton>
            </View>
          ))
        ) : (
          <Text style={T.small}>{t(future ? "ex.emptyPlan" : "ex.empty")}</Text>
        )}
        <Btn kind="ghost" small label={t("ex.add")} onPress={() => go("/add", { tab: "exercise" })} style={{ alignSelf: "flex-start" }} />
      </Card>

      {!future && day ? (
        <>
          <Card>
            <SectionTitle right={<Text style={[T.num, { color: C.muted }]}>{f.dec(liters(day.waterGlasses), 2)} / {f.dec(liters(goals.water), 2)} L</Text>}>{t("water.title")}</SectionTitle>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {Array.from({ length: Math.max(goals.water, day.waterGlasses) }, (_, i) => {
                const full = i < day.waterGlasses;
                return (
                  <Pressable key={i} onPress={() => setWater(day.waterGlasses === i + 1 ? i : i + 1)} accessibilityRole="button" accessibilityLabel={t("water.aria", { n: i + 1 })}
                    style={{ width: 36, height: 46, borderRadius: 8, borderWidth: 1.5, borderColor: C.water, backgroundColor: full ? C.water : "transparent", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 11, fontWeight: "800", color: full ? C.waterSoft : C.water }}>{i + 1}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={T.small}>{t("water.hint")}</Text>
          </Card>

          <Card>
            <SectionTitle right={
              <View style={{ width: 150 }}>
                <Seg label={t("a11y.weightUnit")} options={(["kg", "lb", "jin"] as WeightUnit[]).map((u) => [u, WEIGHT_LABEL[u]] as [WeightUnit, string])} value={profile.weightUnit} onChange={(u) => app.updateProfile({ weightUnit: u })} />
              </View>
            }>{t("weight.title")}</SectionTitle>
            {day.weightKg != null ? (
              <Text style={T.small}>{t("weight.logged")} <Text style={[T.num, { fontSize: 18, color: C.ink }]}>{f.dec(toDisplayWeight(day.weightKg, profile.weightUnit))} {WEIGHT_LABEL[profile.weightUnit]}</Text></Text>
            ) : null}
            <View style={s.row}>
              <TextInput value={weightText} onChangeText={setWeightText} keyboardType="decimal-pad" placeholder={t("weight.placeholder")} placeholderTextColor="#8A988F"
                accessibilityLabel={t("weight.aria", { unit: WEIGHT_LABEL[profile.weightUnit] })} onSubmitEditing={saveWeight} returnKeyType="done"
                style={[s.input, { flex: 1 }]} />
              <Btn label={t(day.weightKg != null ? "weight.update" : "weight.log")} onPress={saveWeight} disabled={!weightText.trim()} />
            </View>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function Eq({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ fontSize: 13.5, color: C.muted }}>{label}</Text>
      <Text style={[T.num, { fontSize: bold ? 18 : 16, color: color ?? C.ink }]}>{value}</Text>
    </View>
  );
}

function ActionButton({ label, icon, onPress, primary }: { label: string; icon: ReactNode; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => [{ flex: 1, alignItems: "center", gap: 4, paddingVertical: 12, borderRadius: 16, backgroundColor: primary ? C.accent : C.sunk }, pressed && { opacity: 0.8 }]}>
      {icon}
      <Text style={{ fontWeight: "800", fontSize: 14, color: primary ? "#fff" : C.ink }}>{label}</Text>
    </Pressable>
  );
}
