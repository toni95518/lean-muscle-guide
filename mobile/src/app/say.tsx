import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { IconMic } from "../components/icons";
import { NeedsAi, ReviewStep, Thinking } from "../components/logflow";
import { toRows, type ReviewRow } from "../components/review";
import { Btn, Card, Header, MealPicker, Notice, Screen, s } from "../components/ui";
import { aiErrorText, analyzeLog } from "../lib/ai/run";
import { isDateKey, today } from "../lib/dates";
import { MEALS, type Meal } from "../lib/store";
import { C, T } from "../lib/theme";
import { useApp } from "../state/app";

function guessMeal(): Meal {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  return h < 10.5 ? "breakfast" : h < 14.5 ? "lunch" : h < 17 ? "snack" : h < 21 ? "dinner" : "snack";
}

export default function SayIt() {
  const params = useLocalSearchParams<{ date?: string; meal?: string }>();
  const app = useApp();
  const { t, settings, lang, profile } = app;
  const date = isDateKey(params.date) ? params.date : today();
  const [meal, setMeal] = useState<Meal>(MEALS.includes(params.meal as Meal) ? (params.meal as Meal) : guessMeal());
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"write" | "thinking" | "review">("write");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [notes, setNotes] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ready = app.hasAiKey && !!settings.ai;

  const read = async () => {
    if (!settings.ai || !text.trim()) return;
    setPhase("thinking");
    setError(null);
    try {
      const r = await analyzeLog(settings.ai, lang, profile.weightKg, { meal, text: text.trim() });
      setRows(toRows(r.foods, r.exercises));
      setNotes(r.notes);
      setPhase("review");
    } catch (e) {
      setError(aiErrorText(e, t));
      setPhase("write");
    }
  };

  return (
    <Screen>
      <Header title={t("say.title")} back="close" />
      {!ready ? <NeedsAi /> : null}
      {error ? <Notice kind="error" text={error} /> : null}
      {phase === "write" ? (
        <>
          <Card style={{ gap: 8 }}>
            <Text style={T.label}>{t("say.label")}</Text>
            <TextInput
              value={text}
              onChangeText={setText}
              multiline
              autoFocus
              placeholder={t("say.placeholder")}
              placeholderTextColor="#8A988F"
              accessibilityLabel={t("say.label")}
              style={{ minHeight: 130, fontSize: 17, lineHeight: 24, color: C.ink, textAlignVertical: "top" }}
            />
          </Card>
          <View style={[s.row, { backgroundColor: C.accentSoft, borderRadius: 12, padding: 12, alignItems: "flex-start" }]}>
            <IconMic size={18} color={C.accent} />
            <Text style={{ flex: 1, fontSize: 13.5, lineHeight: 19, color: C.ink }}>{t("say.dictate")}</Text>
          </View>
          <MealPicker value={meal} onChange={setMeal} />
          <Btn label={t("say.read")} disabled={!ready || !text.trim()} onPress={read} />
        </>
      ) : null}
      {phase === "thinking" ? <Thinking /> : null}
      {phase === "review" ? (
        <>
          <Card><Text style={[T.body, { fontStyle: "italic" }]}>“{text.trim()}”</Text></Card>
          <ReviewStep rows={rows} setRows={setRows} notes={notes} meal={meal} setMeal={setMeal} date={date} />
          <Btn kind="link" label={t("say.edit")} onPress={() => setPhase("write")} />
        </>
      ) : null}
    </Screen>
  );
}
