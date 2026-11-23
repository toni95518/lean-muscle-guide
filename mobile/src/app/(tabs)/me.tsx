import Constants from "expo-constants";
import { router } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { Linking, Pressable, Switch, Text, TextInput, View } from "react-native";
import { IconNext } from "../../components/icons";
import { useToast } from "../../components/toast";
import { Btn, Card, Chips, Field, Header, Screen, SectionTitle, Seg, Stepper, s } from "../../components/ui";
import { providerInfo } from "../../lib/ai/providers";
import { LANGS, LOCALE } from "../../lib/i18n";
import { askPermission, getPermission, remindersSupported, sendTest, shiftTime, syncReminders, withDefaults, type MealKey, type ReminderSettings, type TimeSetting } from "../../lib/reminders";
import { fmtAmount, NUTRIENTS, type NutrientId } from "../../lib/nutrients";
import { ACTIVITY_LEVELS, fromDisplayWeight, liters, PROTEIN_LEVELS, toDisplayWeight, WEIGHT_LABEL, type Goal, type Sex, type WeightUnit } from "../../lib/nutrition";
import * as store from "../../lib/store";
import type { Lang } from "../../lib/store";
import { C, T } from "../../lib/theme";
import { useApp } from "../../state/app";

const num = (v: string) => parseFloat(v.replace(",", "."));

export default function Me() {
  const app = useApp();
  const { t, f, profile, goals, settings } = app;
  const toast = useToast();
  const unit = profile.weightUnit;
  const [age, setAge] = useState(String(profile.age));
  const [height, setHeight] = useState(String(profile.heightCm));
  const [weight, setWeight] = useState(String(toDisplayWeight(profile.weightKg, unit)));
  const [water, setWater] = useState(String(liters(profile.waterGoal)));
  const [kcal, setKcal] = useState(profile.calorieOverride ? String(profile.calorieOverride) : "");
  const [confirmErase, setConfirmErase] = useState(false);

  // Keep the text fields in step when the profile changes elsewhere (weigh-in, restore).
  useEffect(() => {
    setAge(String(profile.age));
    setHeight(String(profile.heightCm));
    setWeight(String(toDisplayWeight(profile.weightKg, profile.weightUnit)));
    setWater(String(liters(profile.waterGoal)));
    setKcal(profile.calorieOverride ? String(profile.calorieOverride) : "");
  }, [profile.age, profile.heightCm, profile.weightKg, profile.weightUnit, profile.waterGoal, profile.calorieOverride]);

  const save = async () => {
    const a = Math.round(num(age));
    const h = num(height);
    const kg = fromDisplayWeight(num(weight), unit);
    const l = num(water);
    const k = kcal.trim() ? Math.round(num(kcal)) : null;
    if (!(a >= 13 && a <= 100)) return toast.show(t("me.err.age"));
    if (!(h >= 100 && h <= 250)) return toast.show(t("me.err.height"));
    if (!(kg > 25 && kg < 400)) return toast.show(t("weight.invalid", { unit: WEIGHT_LABEL[unit] }));
    if (!(l >= 0.5 && l <= 6)) return toast.show(t("me.err.water"));
    if (k != null && !(k >= 1000 && k <= 6000)) return toast.show(t("me.err.kcal"));
    await app.updateProfile({ age: a, heightCm: Math.round(h), weightKg: Math.round(kg * 100) / 100, waterGoal: Math.round((l * 1000) / 250), calorieOverride: k, setupComplete: true });
    toast.show(t("me.saved"));
  };

  const erase = async () => {
    await store.clearAll();
    await app.setAiKey(null);
    await app.reload();
    setConfirmErase(false);
    router.replace("/welcome");
  };

  const ai = settings.ai ? providerInfo(settings.ai.provider) : null;
  const langOptions: [Lang | "auto", string][] = [["auto", t("lang.device")], ...LANGS];
  const version = Constants.expoConfig?.version ?? "0.99.0";

  return (
    <Screen>
      <Header title={t("me.title")} back="none" />

      <Card>
        <SectionTitle>{t("me.goals")}</SectionTitle>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
          <Text style={[T.num, { fontSize: 32, color: C.ink }]}>{f.int(goals.kcal)}</Text>
          <Text style={T.small}>{t("me.kcalDay", { p: goals.protein, c: goals.carbs, fat: goals.fat })}</Text>
        </View>
        <Text style={T.small}>{t("me.formula", { bmr: f.int(goals.bmr), tdee: f.int(goals.tdee) })}</Text>

        <Text style={T.label}>{t("me.sex")}</Text>
        <Seg label={t("me.sex")} options={[["female", t("me.female")], ["male", t("me.male")]] as [Sex, string][]} value={profile.sex} onChange={(v) => app.updateProfile({ sex: v })} />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Field label={t("me.age")} value={age} onChangeText={setAge} keyboardType="number-pad" onEndEditing={save} />
          <Field label={t("me.height")} value={height} onChangeText={setHeight} keyboardType="decimal-pad" suffix="cm" onEndEditing={save} />
        </View>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-end" }}>
          <Field label={t("me.weight")} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" suffix={WEIGHT_LABEL[unit]} onEndEditing={save} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={T.label}>{t("me.unit")}</Text>
            <Seg label={t("me.unit")} options={(["kg", "lb", "jin"] as WeightUnit[]).map((u) => [u, WEIGHT_LABEL[u]] as [WeightUnit, string])} value={unit} onChange={(u) => app.updateProfile({ weightUnit: u })} />
          </View>
        </View>

        <Text style={T.label}>{t("me.activity")}</Text>
        <Chips label={t("me.activity")} options={ACTIVITY_LEVELS.map((a, i) => [a, t(`me.act${i}`)] as [number, string])} value={profile.activity} onChange={(v) => app.updateProfile({ activity: v })} />
        <Text style={T.label}>{t("me.goal")}</Text>
        <Chips label={t("me.goal")} options={(["lose1", "lose05", "maintain", "gain05"] as Goal[]).map((g) => [g, t(`me.goal.${g}`)] as [Goal, string])} value={profile.goal} onChange={(v) => app.updateProfile({ goal: v })} />
        <Text style={T.label}>{t("me.protein")}</Text>
        <Seg label={t("me.protein")} options={PROTEIN_LEVELS.map(([v, k]) => [v, `${t(`me.protein.${k}`)} ${v}`] as [number, string])} value={profile.proteinPerKg} onChange={(v) => app.updateProfile({ proteinPerKg: v })} />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Field label={t("me.water")} value={water} onChangeText={setWater} keyboardType="decimal-pad" suffix="L" onEndEditing={save} />
          <Field label={t("me.customKcal")} value={kcal} onChangeText={setKcal} keyboardType="number-pad" placeholder={String(goals.auto)} onEndEditing={save} />
        </View>
        <Text style={T.small}>{t("me.customHint")}</Text>
        <Btn label={t("me.save")} onPress={save} />
      </Card>

      <ReminderSettingsCard />

      <NutrientSettings />

      <Card>
        <SectionTitle>{t("lang.label")}</SectionTitle>
        <Chips label={t("lang.label")} options={langOptions} value={settings.language ?? "auto"} onChange={(v) => app.updateSettings({ language: v === "auto" ? null : v })} />
      </Card>

      <Card style={{ gap: 0, paddingVertical: 4 }}>
        <Row title={t("me.ai")} value={ai && app.hasAiKey ? `${ai.id === "custom" ? t("connect.other") : ai.name} · ${settings.ai?.model}` : t("me.aiOff")} onPress={() => router.push("/connect-ai")} />
        <Row title={t("me.account")} value={settings.account ? settings.account.email : t("me.accountOff")} onPress={() => router.push("/account")} border />
      </Card>

      <Card>
        <SectionTitle>{t("me.about")}</SectionTitle>
        <Text style={T.body}>薄肌理论指南 · Lean Muscle Theory Guide</Text>
        <Text style={T.small}>{t("me.version", { v: version })}</Text>
        <Text style={T.small}>{t("me.privacy")}</Text>
        <Text style={T.small}>{t("me.disclaimer")}</Text>
        <Btn kind="link" small label={t("me.privacyPolicy")} onPress={() => router.push("/privacy")} style={{ alignSelf: "flex-start" }} />
        {confirmErase ? (
          <View style={{ gap: 8 }}>
            <Text style={{ color: C.danger }}>{t("me.eraseConfirm")}</Text>
            <View style={s.row}>
              <Btn kind="danger" small label={t("me.eraseYes")} onPress={erase} />
              <Btn kind="ghost" small label={t("common.cancel")} onPress={() => setConfirmErase(false)} />
            </View>
          </View>
        ) : (
          <Btn kind="link" small label={t("me.erase")} onPress={() => setConfirmErase(true)} style={{ alignSelf: "flex-start" }} />
        )}
      </Card>
    </Screen>
  );
}

/** Pick which extra nutrients to track, and their daily targets. */
function NutrientSettings() {
  const app = useApp();
  const { t, profile } = app;
  const toast = useToast();
  const tracked = profile.nutrients;
  const toggle = (id: NutrientId) =>
    app.updateProfile({ nutrients: tracked.includes(id) ? tracked.filter((x) => x !== id) : NUTRIENTS.map((n) => n.id).filter((x) => x === id || tracked.includes(x)) });
  const setTarget = (id: NutrientId, text: string) => {
    const next = { ...profile.nutrientTargets };
    const v = parseFloat(text.replace(",", "."));
    if (!text.trim()) delete next[id];
    else if (v > 0 && v < 100000) next[id] = v;
    else return toast.show(t("nut.err.target"));
    app.updateProfile({ nutrientTargets: next });
  };
  return (
    <Card>
      <SectionTitle>{t("nut.track")}</SectionTitle>
      <Text style={T.small}>{t("nut.trackHint")}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }} accessibilityLabel={t("nut.track")}>
        {NUTRIENTS.map((n) => {
          const on = tracked.includes(n.id);
          return (
            <Pressable key={n.id} onPress={() => toggle(n.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
              style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: on ? 2 : 1, borderColor: on ? C.accent : C.line, backgroundColor: on ? C.accentSoft : C.surface, minHeight: 38, justifyContent: "center" }}>
              <Text style={{ fontSize: 13.5, fontWeight: on ? "700" : "500", color: C.ink }}>{on ? "✓ " : ""}{t(`nut.${n.id}`)}</Text>
            </Pressable>
          );
        })}
      </View>
      {tracked.length ? <Text style={T.label}>{t("nut.targets")}</Text> : null}
      {NUTRIENTS.filter((n) => tracked.includes(n.id)).map((n) => (
        <NutrientTarget key={`${n.id}:${profile.nutrientTargets[n.id] ?? ""}`} label={`${t(`nut.${n.id}`)}${n.kind === "limit" ? ` (${t("nut.limit")})` : ""}`}
          unit={n.unit} initial={profile.nutrientTargets[n.id]} placeholder={String(fmtAmount(n.dv))} onSave={(v) => setTarget(n.id, v)} />
      ))}
      {tracked.length ? <Text style={T.small}>{t("nut.targetHint")}</Text> : null}
    </Card>
  );
}

function NutrientTarget({ label, unit, initial, placeholder, onSave }: { label: string; unit: string; initial?: number; placeholder: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(initial != null ? String(initial) : "");
  return (
    <View style={[s.row, { justifyContent: "space-between" }]}>
      <Text style={{ flex: 1, fontSize: 14, color: C.ink }}>{label}</Text>
      <View style={{ width: 130, justifyContent: "center" }}>
        <TextInput value={v} onChangeText={setV} onEndEditing={() => onSave(v)} onBlur={() => onSave(v)} keyboardType="decimal-pad" placeholder={placeholder} placeholderTextColor="#8A988F"
          accessibilityLabel={label} style={[s.input, { paddingRight: 44 }]} />
        <Text style={s.suffix} pointerEvents="none">{unit}</Text>
      </View>
    </View>
  );
}

/** Reminders: local notifications that open the right screen when tapped. */
function ReminderSettingsCard() {
  const app = useApp();
  const { t, lang, settings, goals, rev } = app;
  const toast = useToast();
  const r = withDefaults(settings.reminders);
  const [perm, setPerm] = useState<"granted" | "denied" | "undetermined">("undetermined");
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (remindersSupported) getPermission().then(setPerm);
  }, []);
  useEffect(() => {
    if (remindersSupported && r.enabled && perm === "granted") syncReminders(settings.reminders, t, lang, goals.water).then(setCount).catch(() => setCount(null));
  }, [settings.reminders, perm, rev]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!remindersSupported) {
    return (
      <Card>
        <SectionTitle>{t("rem.title")}</SectionTitle>
        <Text style={T.small}>{t("rem.webOnly")}</Text>
      </Card>
    );
  }

  const save = (next: ReminderSettings) => app.updateSettings({ reminders: next });
  const toggleAll = async (on: boolean) => {
    if (on) {
      const p = perm === "granted" ? "granted" : await askPermission();
      setPerm(p);
      if (p !== "granted") return;
    }
    await save({ ...r, enabled: on });
  };
  const time = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return new Intl.DateTimeFormat(LOCALE[lang], { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, h, m));
  };
  const timeRow = (label: string, v: TimeSetting, set: (v: TimeSetting) => void, extra?: ReactNode) => (
    <View style={{ gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.sunk }}>
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: C.ink, flex: 1 }}>{label}</Text>
        <Switch value={v.on} onValueChange={(on) => set({ ...v, on })} accessibilityLabel={label} trackColor={{ true: C.accent }} />
      </View>
      {v.on ? (
        <View style={[s.row, { justifyContent: "space-between" }]}>
          {extra ?? <View />}
          <Stepper value={time(v.time)} labelMinus={t("rem.earlier")} labelPlus={t("rem.later")}
            onMinus={() => set({ ...v, time: shiftTime(v.time, -15) })} onPlus={() => set({ ...v, time: shiftTime(v.time, 15) })} />
        </View>
      ) : null}
    </View>
  );
  const meal = (m: MealKey) => timeRow(t(`meal.${m}`), r.meals[m], (v) => save({ ...r, meals: { ...r.meals, [m]: v } }));
  const weekdays = [1, 2, 3, 4, 5, 6, 0].map((d) => [d, new Intl.DateTimeFormat(LOCALE[lang], { weekday: "short" }).format(new Date(2024, 0, 7 + d))] as [number, string]);

  return (
    <Card>
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <View style={{ flex: 1, gap: 2 }}>
          <SectionTitle>{t("rem.title")}</SectionTitle>
          <Text style={T.small}>{t("rem.sub")}</Text>
        </View>
        <Switch value={r.enabled && perm === "granted"} onValueChange={toggleAll} accessibilityLabel={t("rem.title")} trackColor={{ true: C.accent }} />
      </View>
      {perm === "denied" ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: C.danger }}>{t("rem.denied")}</Text>
          <Btn kind="soft" small label={t("rem.openSettings")} onPress={() => Linking.openSettings()} style={{ alignSelf: "flex-start" }} />
        </View>
      ) : null}
      {r.enabled && perm === "granted" ? (
        <View>
          {meal("breakfast")}
          {meal("lunch")}
          {meal("dinner")}
          <View style={{ gap: 4, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.sunk }}>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: C.ink, flex: 1 }}>{t("rem.water")}</Text>
              <Switch value={r.water.on} onValueChange={(on) => save({ ...r, water: { ...r.water, on } })} accessibilityLabel={t("rem.water")} trackColor={{ true: C.accent }} />
            </View>
            {r.water.on ? <Text style={T.small}>{r.water.times.map(time).join(" · ")} · {t("rem.waterSkip")}</Text> : null}
          </View>
          {timeRow(t("rem.evening"), r.evening, (v) => save({ ...r, evening: v }))}
          {timeRow(t("rem.weighIn"), r.weighIn, (v) => save({ ...r, weighIn: { ...r.weighIn, ...v } }),
            <Seg label={t("rem.weighIn")} options={weekdays} value={r.weighIn.weekday} onChange={(d) => save({ ...r, weighIn: { ...r.weighIn, weekday: d } })} />)}
          <Text style={T.small}>{count != null ? t("rem.planned", { n: count }) : ""} {t("rem.skipNote")}</Text>
          <Btn kind="link" small label={t("rem.test")} onPress={async () => { await sendTest(t); toast.show(t("rem.testSent")); }} style={{ alignSelf: "flex-start" }} />
        </View>
      ) : null}
    </Card>
  );
}

function Row({ title, value, onPress, border }: { title: string; value: string; onPress: () => void; border?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}: ${value}`}
      style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14, borderTopWidth: border ? 1 : 0, borderTopColor: C.sunk }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontWeight: "700", fontSize: 15, color: C.ink }}>{title}</Text>
        <Text style={T.small} numberOfLines={1}>{value}</Text>
      </View>
      <IconNext size={18} color={C.muted} />
    </Pressable>
  );
}
