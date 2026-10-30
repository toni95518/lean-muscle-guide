import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { IconCheck, IconLock, IconClock } from "../components/icons";
import { Btn, Card, Field, Header, Notice, Screen, s } from "../components/ui";
import { listModels, testConnection } from "../lib/ai/client";
import { PROVIDERS, providerInfo } from "../lib/ai/providers";
import { aiErrorText } from "../lib/ai/run";
import { getSecret, SECRET } from "../lib/secrets";
import type { ProviderId } from "../lib/store";
import { C, T } from "../lib/theme";
import { useApp } from "../state/app";

export default function ConnectAI() {
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const app = useApp();
  const { t, settings } = app;
  const [provider, setProvider] = useState<ProviderId>(settings.ai?.provider ?? "anthropic");
  const [baseUrl, setBaseUrl] = useState(settings.ai?.baseUrl ?? providerInfo("anthropic").baseUrl);
  const [model, setModel] = useState(settings.ai?.model ?? providerInfo("anthropic").defaultModel);
  const [key, setKey] = useState("");
  const [savedKey, setSavedKey] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [modelFilter, setModelFilter] = useState("");
  const [busy, setBusy] = useState<"" | "models" | "test">("");
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const info = providerInfo(provider);

  useEffect(() => {
    getSecret(SECRET.aiKey).then((k) => setSavedKey(!!k));
  }, []);

  const choose = (id: ProviderId) => {
    const p = providerInfo(id);
    setProvider(id);
    setBaseUrl(p.baseUrl);
    setModel(p.defaultModel);
    setModels([]);
    setStatus(null);
    setAdvanced(id === "custom");
  };
  const cfg = () => ({ provider, baseUrl: baseUrl.trim(), model: model.trim() });
  const currentKey = async () => key.trim() || (savedKey && settings.ai?.provider === provider ? await getSecret(SECRET.aiKey) : null);

  const loadModels = async () => {
    const k = await currentKey();
    if (!k) return setStatus({ kind: "error", text: t("ai.err.noKey") });
    setBusy("models");
    setStatus(null);
    try {
      const list = await listModels(cfg(), k);
      setModels(list);
      setModelFilter(""); // show the whole list, not just names matching what's typed
      if (!list.length) setStatus({ kind: "error", text: t("connect.noModels") });
    } catch (e) {
      setStatus({ kind: "error", text: `${aiErrorText(e, t)} ${t("connect.typeModel")}` });
    } finally {
      setBusy("");
    }
  };
  const test = async () => {
    const k = await currentKey();
    if (!k) return setStatus({ kind: "error", text: t("ai.err.noKey") });
    if (!model.trim()) return setStatus({ kind: "error", text: t("connect.pickModel") });
    setBusy("test");
    setStatus(null);
    try {
      await testConnection(cfg(), k);
      setStatus({ kind: "ok", text: info.images ? t("connect.okPhotos") : t("connect.okText") });
    } catch (e) {
      setStatus({ kind: "error", text: aiErrorText(e, t) });
    } finally {
      setBusy("");
    }
  };
  const save = async () => {
    if (!model.trim() || !baseUrl.trim()) return setStatus({ kind: "error", text: t("connect.pickModel") });
    if (key.trim()) await app.setAiKey(key.trim());
    else if (!savedKey) return setStatus({ kind: "error", text: t("ai.err.noKey") });
    await app.updateSettings({ ai: cfg() });
    onboarding ? router.replace("/") : router.back();
  };
  const disconnect = async () => {
    await app.setAiKey(null);
    await app.updateSettings({ ai: null });
    setSavedKey(false);
    setKey("");
    setStatus(null);
  };
  const paste = async () => {
    try {
      const v = await Clipboard.getStringAsync();
      if (v) setKey(v.trim());
    } catch {
      /* clipboard unavailable */
    }
  };

  const shownModels = models.filter((m) => !modelFilter.trim() || m.toLowerCase().includes(modelFilter.trim().toLowerCase())).slice(0, 40);

  return (
    <Screen
      footer={
        <View style={{ padding: 16, gap: 8 }}>
          <Btn label={t("connect.save")} onPress={save} />
          {onboarding ? <Btn kind="link" label={t("connect.skip")} onPress={() => router.replace("/")} /> : null}
        </View>
      }
    >
      <Header title={t("connect.title")} back={onboarding ? "none" : "close"} />
      <Text style={[T.body, { color: C.ink2, lineHeight: 21 }]}>{t("connect.lede")}</Text>

      <Text style={T.label}>{t("connect.provider")}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {PROVIDERS.map((p) => {
          const on = p.id === provider;
          return (
            <Pressable key={p.id} onPress={() => choose(p.id)} accessibilityRole="radio" accessibilityState={{ checked: on }}
              style={{ width: "48%", flexGrow: 1, padding: 11, borderRadius: 12, borderWidth: on ? 2 : 1, borderColor: on ? C.accent : C.line, backgroundColor: C.surface, gap: 2 }}>
              <Text style={{ fontWeight: "800", fontSize: 14.5, color: C.ink }}>{p.id === "custom" ? t("connect.other") : p.name}</Text>
              <Text style={{ fontSize: 11.5, color: C.muted }}>{p.id === "custom" ? t("connect.otherSub") : p.images ? t("connect.photosVoice") : t("connect.textOnly")}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: 6 }}>
        <Text style={T.label}>{t("connect.key")}</Text>
        <View style={s.row}>
          <TextInput value={key} onChangeText={setKey} secureTextEntry autoCapitalize="none" autoCorrect={false}
            placeholder={savedKey && settings.ai?.provider === provider ? t("connect.keySaved") : t("connect.keyPh")} placeholderTextColor="#8A988F"
            accessibilityLabel={t("connect.key")} style={[s.input, { flex: 1 }]} />
          <Btn kind="soft" small label={t("connect.paste")} onPress={paste} />
        </View>
        {info.keySite ? <Text style={T.small}>{t("connect.keyWhere", { site: info.keySite })}</Text> : null}
      </View>

      <View style={{ gap: 6 }}>
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <Text style={T.label}>{t("connect.model")}</Text>
          <Btn kind="link" small label={t("connect.loadModels")} loading={busy === "models"} onPress={loadModels} />
        </View>
        <TextInput value={model} onChangeText={(v) => { setModel(v); setModelFilter(v); }} autoCapitalize="none" autoCorrect={false}
          placeholder={t("connect.modelPh")} placeholderTextColor="#8A988F" accessibilityLabel={t("connect.model")} style={s.input} />
        {models.length ? (
          <Card style={{ paddingVertical: 4, gap: 0 }}>
            {shownModels.map((m, i) => (
              <Pressable key={m} onPress={() => { setModel(m); setModelFilter(""); setModels([]); }} accessibilityRole="button"
                style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: C.sunk }}>
                <Text style={{ color: C.ink, fontWeight: m === model ? "800" : "400" }}>{m}</Text>
              </Pressable>
            ))}
          </Card>
        ) : null}
        <Text style={T.small}>{info.images ? t("connect.modelHintPhotos") : t("connect.modelHintText")}</Text>
      </View>

      <Btn kind="link" small label={advanced ? t("connect.hideAdvanced") : t("connect.advanced")} onPress={() => setAdvanced(!advanced)} style={{ alignSelf: "flex-start" }} />
      {advanced ? <Field label={t("connect.baseUrl")} value={baseUrl} onChangeText={setBaseUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://…/v1" hint={t("connect.baseUrlHint")} /> : null}

      <Btn kind="ghost" label={t("connect.test")} loading={busy === "test"} onPress={test} />
      {status ? (
        status.kind === "ok" ? (
          <View style={[s.row, { backgroundColor: C.accentSoft, borderRadius: 14, padding: 12 }]}>
            <IconCheck color={C.accentDark} />
            <Text style={{ flex: 1, color: C.accentDark, fontSize: 14 }}>{status.text}</Text>
          </View>
        ) : (
          <Notice kind="error" text={status.text} />
        )
      ) : null}

      <View style={{ gap: 8 }}>
        <View style={[s.row, { alignItems: "flex-start" }]}><IconLock size={16} color={C.accent} /><Text style={[T.small, { flex: 1, color: C.ink2 }]}>{t("connect.privacy1")}</Text></View>
        <View style={[s.row, { alignItems: "flex-start" }]}><IconClock size={16} color={C.accent} /><Text style={[T.small, { flex: 1, color: C.ink2 }]}>{t("connect.privacy2")}</Text></View>
      </View>
      {savedKey ? <Btn kind="danger" small label={t("connect.disconnect")} onPress={disconnect} style={{ alignSelf: "flex-start" }} /> : null}
    </Screen>
  );
}
