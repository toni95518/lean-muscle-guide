import { useEffect, useRef, useState, type ComponentRef } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconCamera, IconClose, IconImage, IconSend } from "../../components/icons";
import { NeedsAi } from "../../components/logflow";
import { useToast } from "../../components/toast";
import { Btn, Header, s } from "../../components/ui";
import { aiErrorText, coachTurn } from "../../lib/ai/run";
import { parseKey, shift, today } from "../../lib/dates";
import { getMealPhoto, PhotoError, type Photo } from "../../lib/photo";
import * as store from "../../lib/store";
import type { ChatMessage, CoachAction } from "../../lib/store";
import { C, T } from "../../lib/theme";
import { useApp } from "../../state/app";

export default function Coach() {
  const app = useApp();
  const { t, f, settings, lang, profile, goals } = app;
  const toast = useToast();
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const ready = app.hasAiKey && !!settings.ai;

  useEffect(() => {
    store.loadCoach().then(setMsgs);
  }, []);
  const persist = (m: ChatMessage[]) => {
    setMsgs(m);
    // Web photos are inline data URLs (hundreds of KB each): keep them on screen, not in storage.
    store.saveCoach(m.map((x) => (x.photos?.some((u) => u.startsWith("data:")) ? { ...x, photos: x.photos.filter((u) => !u.startsWith("data:")) } : x)));
  };

  const MAX_PHOTOS = 3;
  const addPhoto = async (from: "camera" | "library") => {
    setError(null);
    try {
      const p = await getMealPhoto(from);
      if (p) setPhotos((cur) => [...cur, p].slice(0, MAX_PHOTOS));
    } catch (e) {
      setError(e instanceof PhotoError && e.code === "permission" ? t("photo.permission") : t("photo.failed"));
    }
  };

  const send = async (message: string) => {
    const attached = photos;
    const msg = message.trim() || (attached.length ? t("coach.photoOnly") : "");
    if (!msg || !settings.ai || busy) return;
    setText("");
    setPhotos([]);
    setError(null);
    const mine: ChatMessage = { id: store.uid(), role: "user", text: msg, photos: attached.length ? attached.map((p) => p.uri) : undefined, at: Date.now() };
    const history = msgs;
    persist([...history, mine]);
    setBusy(true);
    try {
      const tk = today();
      const week = await store.getDays(shift(tk, -6), tk);
      const r = await coachTurn(settings.ai, lang, { today: tk, profile, targets: goals, week, favorites: app.favorites }, history, msg, attached.map((p) => p.base64));
      persist([...history, mine, { id: store.uid(), role: "assistant", text: r.reply, actions: r.actions, at: Date.now() }]);
    } catch (e) {
      setError(aiErrorText(e, t));
    } finally {
      setBusy(false);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  const apply = async (m: ChatMessage, i: number, a: CoachAction) => {
    if (a.type === "add_food") await store.addFoods(a.date, a.meal, "coach", a.items.map(({ confidence: _c, ...x }: any) => x));
    else await store.addExercises(a.date, "coach", a.items);
    app.bump();
    persist(msgs.map((x) => (x.id === m.id ? { ...x, doneActions: [...(x.doneActions ?? []), i] } : x)));
    toast.show(t("coach.added", { date: dayName(a.date) }));
  };
  const dayName = (k: string) => (k === today() ? t("day.today") : k === shift(today(), 1) ? t("day.tomorrow") : f.date(parseKey(k), { weekday: "short", month: "short", day: "numeric" }));

  const chips = [t("coach.chip1"), t("coach.chip2"), t("coach.chip3")];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ padding: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.line, gap: 4 }}>
          <Header title={t("coach.title")} back="none" right={msgs.length ? <Btn kind="link" small label={t("coach.clear")} onPress={() => persist([])} /> : undefined} />
          <Text style={T.small}>{t("coach.sub")}</Text>
        </View>
        <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, gap: 10 }} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })} keyboardShouldPersistTaps="handled">
          {!ready ? <NeedsAi /> : null}
          {!msgs.length && ready ? <Text style={[T.body, { color: C.ink2, lineHeight: 22 }]}>{t("coach.empty")}</Text> : null}
          {msgs.map((m) =>
            m.role === "user" ? (
              <View key={m.id} style={{ alignSelf: "flex-end", maxWidth: "82%", backgroundColor: C.accent, borderRadius: 18, borderBottomRightRadius: 6, paddingVertical: 10, paddingHorizontal: 14 }}>
                {m.photos?.length ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                    {m.photos.map((uri) => (
                      <Image key={uri} source={{ uri }} style={{ width: 84, height: 84, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.2)" }} accessibilityIgnoresInvertColors accessibilityLabel={t("coach.photoA11y")} />
                    ))}
                  </View>
                ) : null}
                <Text style={{ color: "#fff", fontSize: 15, lineHeight: 21 }}>{m.text}</Text>
              </View>
            ) : (
              <View key={m.id} style={{ alignSelf: "flex-start", maxWidth: "92%", gap: 8 }}>
                <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 18, borderBottomLeftRadius: 6, paddingVertical: 10, paddingHorizontal: 14 }}>
                  <Text style={{ color: C.ink, fontSize: 15, lineHeight: 21 }}>{m.text}</Text>
                </View>
                {!m.actions?.length && m.text !== "…" ? (
                  // The AI answered without addable items (common with fast "lite" models):
                  // send this exchange through the Say it reader instead.
                  <Pressable accessibilityRole="button" hitSlop={8} style={{ alignSelf: "flex-start", paddingHorizontal: 6 }}
                    onPress={() => {
                      const asked = [...msgs.slice(0, msgs.indexOf(m))].reverse().find((x) => x.role === "user")?.text ?? "";
                      router.push({ pathname: "/say", params: { text: `${asked}\n${m.text}`.trim(), auto: "1" } });
                    }}>
                    <Text style={{ color: C.accent, fontWeight: "700", fontSize: 13.5 }}>{t("coach.toLog")}</Text>
                  </Pressable>
                ) : null}
                {(m.actions ?? []).map((a, i) => {
                  const done = m.doneActions?.includes(i);
                  const total = a.type === "add_food" ? a.items.reduce((x, it) => x + it.kcal * (it.quantity || 1), 0) : a.items.reduce((x, it) => x + it.kcal, 0);
                  return (
                    <View key={i} style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, gap: 8 }}>
                      <Text style={T.label}>
                        {a.type === "add_food" ? t("coach.suggestFood", { meal: t(`meal.${a.meal}`), date: dayName(a.date) }) : t("coach.suggestEx", { date: dayName(a.date) })}
                      </Text>
                      {a.items.map((it, j) => (
                        <View key={j} style={[s.row, { justifyContent: "space-between" }]}>
                          <Text style={{ flex: 1, color: C.ink, fontSize: 14 }}>
                            {"quantity" in it && it.quantity && it.quantity !== 1 ? `${f.dec(it.quantity, 2)} × ` : ""}{it.name}{"serving" in it && it.serving ? ` · ${app.serving(it.serving)}` : ""}{"minutes" in it && it.minutes ? ` · ${it.minutes} ${t("unit.min")}` : ""}
                          </Text>
                          <Text style={[T.num, { color: a.type === "add_exercise" ? C.burn : C.ink }]}>{f.int(it.kcal * ("quantity" in it && it.quantity ? it.quantity : 1))}</Text>
                        </View>
                      ))}
                      <View style={[s.row, { justifyContent: "space-between", borderTopWidth: 1, borderTopColor: C.sunk, paddingTop: 8 }]}>
                        <Text style={[T.small, { color: C.ink2 }]}>{f.int(total)} kcal</Text>
                        <Btn small kind={done ? "soft" : "primary"} disabled={done} label={done ? t("coach.addedShort") : t("coach.add")} onPress={() => apply(m, i, a)} />
                      </View>
                    </View>
                  );
                })}
              </View>
            ),
          )}
          {busy ? <View style={[s.row, { alignSelf: "flex-start" }]}><ActivityIndicator color={C.accent} /><Text style={T.small}>{t("coach.thinking")}</Text></View> : null}
          {error ? <Text style={{ color: C.danger }}>{error}</Text> : null}
        </ScrollView>
        <View style={{ padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} keyboardShouldPersistTaps="handled">
            {chips.map((c) => (
              <Pressable key={c} onPress={() => send(c)} disabled={!ready || busy} accessibilityRole="button"
                style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, opacity: ready ? 1 : 0.5 }}>
                <Text style={{ fontSize: 13, color: C.ink }}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {photos.length ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              {photos.map((p, i) => (
                <View key={p.uri}>
                  <Image source={{ uri: p.uri }} style={{ width: 64, height: 64, borderRadius: 10 }} accessibilityIgnoresInvertColors accessibilityLabel={t("coach.photoA11y")} />
                  <Pressable onPress={() => setPhotos(photos.filter((_, j) => j !== i))} accessibilityRole="button" accessibilityLabel={t("coach.photoRemove")} hitSlop={8}
                    style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: C.ink, alignItems: "center", justifyContent: "center" }}>
                    <IconClose size={10} color="#fff" />
                  </Pressable>
                </View>
              ))}
              <Text style={[T.small, { alignSelf: "center", flex: 1 }]}>{t("coach.photoHint")}</Text>
            </View>
          ) : null}
          <View style={s.row}>
            <Pressable onPress={() => addPhoto("camera")} disabled={!ready || busy || photos.length >= MAX_PHOTOS} accessibilityRole="button" accessibilityLabel={t("photo.take")} hitSlop={4}
              style={{ width: 40, height: 46, alignItems: "center", justifyContent: "center", opacity: !ready || busy || photos.length >= MAX_PHOTOS ? 0.4 : 1 }}>
              <IconCamera size={22} />
            </Pressable>
            <Pressable onPress={() => addPhoto("library")} disabled={!ready || busy || photos.length >= MAX_PHOTOS} accessibilityRole="button" accessibilityLabel={t("photo.choose")} hitSlop={4}
              style={{ width: 40, height: 46, alignItems: "center", justifyContent: "center", opacity: !ready || busy || photos.length >= MAX_PHOTOS ? 0.4 : 1 }}>
              <IconImage size={22} />
            </Pressable>
            <TextInput value={text} onChangeText={setText} placeholder={t("coach.placeholder")} placeholderTextColor="#8A988F" editable={ready}
              accessibilityLabel={t("coach.placeholder")} onSubmitEditing={() => send(text)} returnKeyType="send"
              style={[s.input, { flex: 1, borderRadius: 999, paddingHorizontal: 16 }]} />
            <Pressable onPress={() => send(text)} disabled={!ready || busy || (!text.trim() && !photos.length)} accessibilityRole="button" accessibilityLabel={t("coach.send")}
              style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: C.ink, alignItems: "center", justifyContent: "center", opacity: !ready || busy || (!text.trim() && !photos.length) ? 0.4 : 1 }}>
              <IconSend size={20} color="#fff" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
