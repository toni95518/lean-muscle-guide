import { router } from "expo-router";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { IconCamera, IconLock, IconSpark } from "../components/icons";
import { Btn, Chips, Screen } from "../components/ui";
import { LANGS } from "../lib/i18n";
import type { Lang } from "../lib/store";
import { C, T } from "../lib/theme";
import { useApp } from "../state/app";

function Promise_({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
      <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: C.accentSoft, alignItems: "center", justifyContent: "center" }}>{icon}</View>
      <Text style={{ flex: 1, fontSize: 15, lineHeight: 21, color: C.ink }}>
        <Text style={{ fontWeight: "800" }}>{title} </Text>
        {text}
      </Text>
    </View>
  );
}

export default function Welcome() {
  const { t, settings, updateSettings } = useApp();
  const finish = async (to: "/connect-ai" | "/" | "/account") => {
    await updateSettings({ onboarded: true });
    router.replace(to === "/connect-ai" ? { pathname: "/connect-ai", params: { onboarding: "1" } } : to);
  };
  const langOptions: [Lang | "auto", string][] = [["auto", t("lang.device")], ...LANGS];
  return (
    <Screen
      footer={
        <View style={{ padding: 16, gap: 10 }}>
          <Btn label={t("welcome.start")} onPress={() => finish("/connect-ai")} />
          <Btn kind="soft" label={t("welcome.haveAccount")} onPress={() => finish("/account")} />
          <Btn kind="link" label={t("welcome.skip")} onPress={() => finish("/")} />
        </View>
      }
    >
      <View style={{ gap: 18, paddingTop: 20 }}>
        <Svg width={44} height={20} accessibilityElementsHidden>
          <Circle cx={10} cy={10} r={9} fill={C.accent} />
          <Circle cx={33} cy={10} r={9} fill={C.burn} />
        </Svg>
        <View style={{ gap: 8 }}>
          <Text style={[T.display, { fontSize: 44, lineHeight: 46, color: C.ink }]}>薄肌理论指南</Text>
          <Text style={{ fontSize: 18, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", color: C.accent }}>Lean Muscle Theory Guide</Text>
          <Text style={{ fontSize: 16, lineHeight: 23, color: C.ink2 }}>{t("welcome.lede")}</Text>
        </View>
        <View style={{ gap: 14 }}>
          <Promise_ icon={<IconCamera color={C.accent} />} title={t("welcome.p1.title")} text={t("welcome.p1.text")} />
          <Promise_ icon={<IconSpark color={C.accent} />} title={t("welcome.p2.title")} text={t("welcome.p2.text")} />
          <Promise_ icon={<IconLock color={C.accent} />} title={t("welcome.p3.title")} text={t("welcome.p3.text")} />
        </View>
        <View style={{ gap: 6 }}>
          <Text style={T.label}>{t("lang.label")}</Text>
          <Chips label={t("lang.label")} options={langOptions} value={settings.language ?? "auto"} onChange={(v) => updateSettings({ language: v === "auto" ? null : v })} />
        </View>
        <Text style={T.small}>{t("welcome.disclaimer")}</Text>
      </View>
    </Screen>
  );
}
