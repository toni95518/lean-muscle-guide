import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { IconCamera, IconImage, IconMic } from "../components/icons";
import { NeedsAi, ReviewStep, Thinking } from "../components/logflow";
import { toRows, type ReviewRow } from "../components/review";
import { Btn, Field, Header, MealPicker, Notice, Screen } from "../components/ui";
import { providerInfo } from "../lib/ai/providers";
import { aiErrorText, analyzeLog } from "../lib/ai/run";
import { isDateKey, today } from "../lib/dates";
import { getMealPhoto, PhotoError, type Photo } from "../lib/photo";
import { MEALS, type Meal } from "../lib/store";
import { C, T } from "../lib/theme";
import { useApp } from "../state/app";

function guessMeal(): Meal {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  return h < 10.5 ? "breakfast" : h < 14.5 ? "lunch" : h < 17 ? "snack" : h < 21 ? "dinner" : "snack";
}

export default function PhotoLog() {
  const params = useLocalSearchParams<{ date?: string; meal?: string }>();
  const app = useApp();
  const { t, settings, lang, profile } = app;
  const date = isDateKey(params.date) ? params.date : today();
  const [meal, setMeal] = useState<Meal>(MEALS.includes(params.meal as Meal) ? (params.meal as Meal) : guessMeal());
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [phase, setPhase] = useState<"pick" | "thinking" | "review">("pick");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [notes, setNotes] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ready = app.hasAiKey && !!settings.ai;
  const info = settings.ai ? providerInfo(settings.ai.provider) : null;

  const analyze = async (p: Photo) => {
    if (!settings.ai) return;
    setPhase("thinking");
    setError(null);
    try {
      const r = await analyzeLog(settings.ai, lang, profile.weightKg, { meal, note: note.trim() || undefined, photoBase64: p.base64 });
      setRows(toRows(r.foods, r.exercises));
      setNotes(r.notes);
      setPhase("review");
    } catch (e) {
      setError(aiErrorText(e, t));
      setPhase("pick");
    }
  };
  const take = async (from: "camera" | "library") => {
    setError(null);
    try {
      const p = await getMealPhoto(from);
      if (!p) return;
      setPhoto(p);
      await analyze(p);
    } catch (e) {
      setError(e instanceof PhotoError && e.code === "permission" ? t("photo.permission") : t("photo.failed"));
    }
  };

  return (
    <Screen>
      <Header title={t("photo.title")} sub={t(`meal.${meal}`)} back="close" />
      {!ready ? <NeedsAi /> : null}
      {ready && info && !info.images && settings.ai?.provider !== "custom" ? <Notice kind="error" text={t("ai.err.noImage")} /> : null}
      {error ? <Notice kind="error" text={error} /> : null}

      {phase === "pick" ? (
        <>
          <MealPicker value={meal} onChange={setMeal} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <BigButton primary label={t("photo.take")} icon={<IconCamera color="#fff" size={30} />} onPress={() => take("camera")} disabled={!ready} />
            <BigButton label={t("photo.choose")} icon={<IconImage size={30} />} onPress={() => take("library")} disabled={!ready} />
          </View>
          <Field label={t("photo.note")} value={note} onChangeText={setNote} placeholder={t("photo.notePh")} />
          {photo && error ? <Btn kind="soft" label={t("photo.retry")} onPress={() => analyze(photo)} /> : null}
          <Btn kind="ghost" label={t("photo.sayInstead")} icon={<IconMic size={18} />} onPress={() => router.replace({ pathname: "/say", params: { date, meal } })} />
          <Text style={[T.small, { textAlign: "center" }]}>{t("photo.privacy", { name: info?.name ?? "AI" })}</Text>
        </>
      ) : null}
      {phase === "thinking" ? <Thinking photoUri={photo?.uri} /> : null}
      {phase === "review" ? <ReviewStep rows={rows} setRows={setRows} notes={notes} meal={meal} setMeal={setMeal} date={date} photoUri={photo?.uri} /> : null}
    </Screen>
  );
}

function BigButton({ label, icon, onPress, primary, disabled }: { label: string; icon: ReactNode; onPress: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => [{ flex: 1, aspectRatio: 1, maxHeight: 180, borderRadius: 20, backgroundColor: primary ? C.accent : C.sunk, alignItems: "center", justifyContent: "center", gap: 10 }, disabled && { opacity: 0.4 }, pressed && { opacity: 0.8 }]}>
      {icon}
      <Text style={{ fontWeight: "800", fontSize: 16, color: primary ? "#fff" : C.ink, textAlign: "center", paddingHorizontal: 8 }}>{label}</Text>
    </Pressable>
  );
}
