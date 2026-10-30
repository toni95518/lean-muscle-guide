import Constants from "expo-constants";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { IconNext } from "../../components/icons";
import { useToast } from "../../components/toast";
import { Btn, Card, Chips, Field, Header, Screen, SectionTitle, Seg, s } from "../../components/ui";
import { providerInfo } from "../../lib/ai/providers";
import { LANGS } from "../../lib/i18n";
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
