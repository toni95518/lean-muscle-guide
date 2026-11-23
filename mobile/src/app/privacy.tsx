// Privacy policy. Public at https://lean-muscle-guide.expo.app/privacy (App Store requires a URL)
// (static copy: /privacy.html) and linked from Me. The text lives in lib/privacy.ts.
import { Linking, Text, View } from "react-native";
import { Card, Header, Screen } from "../components/ui";
import { CONTACT, SECTIONS, UPDATED } from "../lib/privacy";
import { C, T } from "../lib/theme";

export default function Privacy() {
  return (
    <Screen>
      <Header title="Privacy policy" back="close" />
      <Text style={T.small}>Last updated {UPDATED}</Text>
      {SECTIONS.map((s) => (
        <Card key={s.title} style={{ gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: C.ink }} accessibilityRole="header">{s.title}</Text>
          {s.body.map((p, i) => (
            <Text key={i} style={[T.body, { lineHeight: 22 }]}>{p}</Text>
          ))}
        </Card>
      ))}
      <View style={{ paddingHorizontal: 4 }}>
        <Text style={{ color: C.accent, fontWeight: "700" }} accessibilityRole="link" onPress={() => Linking.openURL(CONTACT)}>{CONTACT}</Text>
      </View>
    </Screen>
  );
}
