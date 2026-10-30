// The "check the AI's estimate" list used by Photo, Say it and Coach.
import { Pressable, Text, TextInput, View } from "react-native";
import type { ParsedFood } from "../lib/ai/parse";
import type { NewExercise } from "../lib/store";
import { C, T } from "../lib/theme";
import { useApp } from "../state/app";
import { IconClose } from "./icons";
import { useMicroLine } from "./nutrients";
import { Checkbox, s, Stepper } from "./ui";

export type ReviewRow =
  | { key: string; kind: "food"; food: ParsedFood; on: boolean; scale: number }
  | { key: string; kind: "ex"; ex: NewExercise; on: boolean };

export function toRows(foods: ParsedFood[], exercises: NewExercise[]): ReviewRow[] {
  return [
    ...foods.map((food, i) => ({ key: "f" + i, kind: "food" as const, food, on: true, scale: 1 })),
    ...exercises.map((ex, i) => ({ key: "e" + i, kind: "ex" as const, ex, on: true })),
  ];
}

export function rowsTotal(rows: ReviewRow[]) {
  let eaten = 0, burned = 0, protein = 0;
  for (const r of rows) {
    if (!r.on) continue;
    if (r.kind === "food") {
      eaten += r.food.kcal * r.scale;
      protein += r.food.protein * r.scale;
    } else burned += r.ex.kcal;
  }
  return { eaten, burned, protein, count: rows.filter((r) => r.on).length };
}

export function ReviewList({ rows, onChange }: { rows: ReviewRow[]; onChange: (rows: ReviewRow[]) => void }) {
  const { t, f } = useApp();
  const microLine = useMicroLine();
  const set = (key: string, patch: Partial<ReviewRow>) => onChange(rows.map((r) => (r.key === key ? ({ ...r, ...patch } as ReviewRow) : r)));
  const conf = (c?: string) => (c ? t(`review.conf.${c}` as "review.conf.high") : "");
  return (
    <View style={[s.card, { paddingVertical: 4 }]}>
      {rows.map((r, i) => {
        const name = r.kind === "food" ? r.food.name : r.ex.name;
        const kcal = r.kind === "food" ? Math.round(r.food.kcal * r.scale) : r.ex.kcal;
        return (
          <View key={r.key} style={{ paddingVertical: 10, gap: 8, borderTopWidth: i ? 1 : 0, borderTopColor: C.sunk, opacity: r.on ? 1 : 0.5 }}>
            <View style={s.row}>
              <Checkbox on={r.on} onToggle={() => set(r.key, { on: !r.on })} label={name} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <TextInput
                  value={name}
                  onChangeText={(v) => set(r.key, r.kind === "food" ? { food: { ...r.food, name: v } } : { ex: { ...r.ex, name: v } })}
                  accessibilityLabel={t("review.nameAria")}
                  style={{ fontSize: 15, fontWeight: "700", color: C.ink, padding: 0, width: "100%" }}
                />
                <Text style={T.small} numberOfLines={2}>
                  {r.kind === "food"
                    ? [r.food.serving, conf(r.food.confidence), `${t("abbr.p")} ${f.int(r.food.protein * r.scale)} · ${t("abbr.c")} ${f.int(r.food.carbs * r.scale)} · ${t("abbr.f")} ${f.int(r.food.fat * r.scale)}`].filter(Boolean).join(" · ")
                    : `${t("ex.title")}${r.ex.minutes ? ` · ${r.ex.minutes} ${t("unit.min")}` : ""}`}
                </Text>
                {r.kind === "food" && microLine(r.food.micros, r.scale) ? <Text style={[T.small, { fontSize: 11.5 }]}>{microLine(r.food.micros, r.scale)}</Text> : null}
              </View>
              <View style={{ alignItems: "flex-end", width: 64, flexShrink: 0 }}>
                <TextInput
                  value={String(kcal)}
                  keyboardType="number-pad"
                  accessibilityLabel={t("review.kcalAria", { name })}
                  onChangeText={(v) => {
                    const n = Math.max(0, Math.min(5000, parseInt(v.replace(/\D/g, "") || "0", 10)));
                    if (r.kind === "food") set(r.key, { food: { ...r.food, kcal: r.scale ? n / r.scale : n } });
                    else set(r.key, { ex: { ...r.ex, kcal: n } });
                  }}
                  style={[T.num, { fontSize: 20, width: 64, textAlign: "right", color: r.kind === "ex" ? C.burn : C.ink, padding: 0 }]}
                />
                <Text style={{ fontSize: 11, color: C.muted }}>{r.kind === "ex" ? t("review.burned") : "kcal"}</Text>
              </View>
              <Pressable onPress={() => onChange(rows.filter((x) => x.key !== r.key))} accessibilityRole="button" accessibilityLabel={t("a11y.remove", { name })} hitSlop={8} style={{ padding: 6 }}>
                <IconClose size={14} color={C.muted} />
              </Pressable>
            </View>
            {r.kind === "food" && r.on ? (
              <View style={[s.row, { paddingLeft: 36 }]}>
                <Text style={[T.small, { width: 64 }]}>{t("review.portion")}</Text>
                <Stepper
                  value={`×${f.dec(r.scale, 2)}`}
                  onMinus={() => set(r.key, { scale: Math.max(0.25, r.scale - 0.25) })}
                  onPlus={() => set(r.key, { scale: Math.min(4, r.scale + 0.25) })}
                  labelMinus={t("review.smaller")}
                  labelPlus={t("review.bigger")}
                />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
