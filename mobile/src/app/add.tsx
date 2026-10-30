// Logging by hand: favorites & repeat, library search, quick add, exercise. Works without AI.
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { IconRepeat, IconSearch, IconStar } from "../components/icons";
import { useToast } from "../components/toast";
import { Btn, Card, Checkbox, Field, Header, MealPicker, Screen, SectionTitle, Seg, Stepper, s } from "../components/ui";
import { isDateKey, shift, today } from "../lib/dates";
import { trActivity, trFood } from "../lib/i18n";
import { ACTIVITIES, FOODS } from "../lib/library";
import { caloriesBurned } from "../lib/nutrition";
import * as store from "../lib/store";
import { MEALS, type Day, type Favorite, type FoodEntry, type Meal, type NewFood } from "../lib/store";
import { C, T } from "../lib/theme";
import { useApp } from "../state/app";
import { nutrientInfo, type Micros, type NutrientId } from "../lib/nutrients";

type Tab = "fav" | "search" | "quick" | "exercise";

function guessMeal(): Meal {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  return h < 10.5 ? "breakfast" : h < 14.5 ? "lunch" : h < 17 ? "snack" : h < 21 ? "dinner" : "snack";
}

export default function Add() {
  const params = useLocalSearchParams<{ date?: string; meal?: string; tab?: string }>();
  const app = useApp();
  const { t, f, lang } = app;
  const toast = useToast();
  const date = isDateKey(params.date) ? params.date : today();
  const [tab, setTab] = useState<Tab>((["fav", "search", "quick", "exercise"].includes(params.tab ?? "") ? params.tab : "fav") as Tab);
  const [meal, setMeal] = useState<Meal>(MEALS.includes(params.meal as Meal) ? (params.meal as Meal) : guessMeal());

  const done = (msg: string) => {
    app.bump();
    toast.show(msg);
  };
  const addFood = async (items: NewFood[], source: store.Source, closeAfter = false) => {
    await store.addFoods(date, meal, source, items);
    done(items.length === 1 ? t("toast.added", { name: app.food(items[0].name, items[0].libraryName), meal: t(`meal.${meal}`) }) : t("toast.addedItems", { n: items.length, meal: t(`meal.${meal}`) }));
    if (closeAfter) router.back();
  };

  return (
    <Screen>
      <Header title={t("add.title")} sub={dateLabel(date, t, f)} back="close" />
      <Seg label={t("add.title")} options={[["fav", t("add.tab.fav")], ["search", t("add.tab.search")], ["quick", t("add.tab.quick")], ["exercise", t("add.tab.exercise")]]} value={tab} onChange={setTab} />
      {tab !== "exercise" ? <MealPicker value={meal} onChange={setMeal} /> : null}
      {tab === "fav" ? <Favorites date={date} onAdd={addFood} /> : null}
      {tab === "search" ? <Search onAdd={(item) => addFood([item], item.libraryName ? "library" : "favorite")} lang={lang} /> : null}
      {tab === "quick" ? <Quick onAdd={async (item, fav) => {
        await addFood([item], "quick", true);
        if (fav) await app.setFavorites([...app.favorites, { id: store.uid(), name: item.name, serving: item.serving, kcal: item.kcal, protein: item.protein, carbs: item.carbs, fat: item.fat, micros: item.micros }]);
      }} /> : null}
      {tab === "exercise" ? <Exercise date={date} onDone={(name, kcal) => { done(t("toast.loggedEx", { name, kcal: f.int(kcal) })); router.back(); }} /> : null}
    </Screen>
  );
}

function dateLabel(date: string, t: ReturnType<typeof useApp>["t"], f: ReturnType<typeof useApp>["f"]) {
  const tk = today();
  if (date === tk) return t("day.today");
  const [y, m, d] = date.split("-").map(Number);
  return f.date(new Date(y, m - 1, d), { weekday: "long", month: "long", day: "numeric" });
}

const favToFood = (x: Favorite | FoodEntry): NewFood => ({ name: x.name, serving: x.serving, kcal: x.kcal, protein: x.protein, carbs: x.carbs, fat: x.fat, micros: x.micros, quantity: 1, libraryName: x.libraryName });

function Favorites({ date, onAdd }: { date: string; onAdd: (items: NewFood[], src: store.Source) => Promise<void> }) {
  const app = useApp();
  const { t, f } = app;
  const [prev, setPrev] = useState<Day | null>(null);
  const [recent, setRecent] = useState<FoodEntry[]>([]);
  const [added, setAdded] = useState<Record<string, boolean>>({});
  useEffect(() => {
    store.getDay(shift(date, -1)).then(setPrev);
    store.recentFoods(10).then(setRecent);
  }, [date, app.rev]);

  const repeats = MEALS.map((m) => ({ m, items: prev?.food.filter((x) => x.meal === m) ?? [] })).filter((r) => r.items.length);
  const mark = (k: string) => setAdded((a) => ({ ...a, [k]: true }));
  const favNames = new Set(app.favorites.map((x) => x.name));
  const recentOnly = recent.filter((r) => !favNames.has(r.name)).slice(0, 6);

  return (
    <>
      {repeats.length ? (
        <View style={{ gap: 8 }}>
          <SectionTitle>{t("fav.repeat")}</SectionTitle>
          {repeats.map(({ m, items }) => {
            const k = "r" + m;
            const kcal = items.reduce((a, x) => a + x.kcal * x.quantity, 0);
            return (
              <Card key={m} style={[s.row, { padding: 12 }]}>
                <IconRepeat color={C.accent} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontWeight: "700", fontSize: 14.5, color: C.ink }}>{t("fav.yesterdays", { meal: t(`meal.${m}`) })}</Text>
                  <Text style={T.small} numberOfLines={1}>{items.map((x) => app.food(x.name, x.libraryName)).join(", ")} · {f.int(kcal)} kcal</Text>
                </View>
                <Btn small kind={added[k] ? "soft" : "primary"} label={added[k] ? t("fav.added.short") : t("fav.add")} disabled={added[k]}
                  onPress={async () => { await onAdd(items.map((x) => ({ ...favToFood(x), quantity: x.quantity })), "favorite"); mark(k); }} />
              </Card>
            );
          })}
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        <SectionTitle>{t("fav.title")}</SectionTitle>
        {app.favorites.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {app.favorites.map((x) => (
              <Pressable key={x.id} accessibilityRole="button" onPress={async () => { await onAdd([favToFood(x)], "favorite"); mark(x.id); }}
                onLongPress={() => app.setFavorites(app.favorites.filter((y) => y.id !== x.id))}
                style={{ width: "48%", flexGrow: 1, padding: 12, borderRadius: 14, borderWidth: added[x.id] ? 2 : 1, borderColor: added[x.id] ? C.accent : C.line, backgroundColor: added[x.id] ? C.accentSoft : C.surface, gap: 2 }}>
                <Text style={{ fontWeight: "700", fontSize: 14, color: C.ink }} numberOfLines={1}>{app.food(x.name, x.libraryName)}</Text>
                <Text style={T.small} numberOfLines={1}>{app.serving(x.serving)}</Text>
                <Text style={[T.num, { fontSize: 16, color: C.ink }]}>{added[x.id] ? t("fav.added.short") : `${f.int(x.kcal)} kcal`}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={T.small}>{t("fav.empty")}</Text>
        )}
      </View>

      {recentOnly.length ? (
        <View style={{ gap: 8 }}>
          <SectionTitle>{t("fav.recent")}</SectionTitle>
          <Card style={{ paddingVertical: 4 }}>
            {recentOnly.map((x, i) => (
              <View key={x.id} style={[s.row, { paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: C.sunk }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontWeight: "600", color: C.ink }} numberOfLines={1}>{app.food(x.name, x.libraryName)}</Text>
                  <Text style={T.small}>{app.serving(x.serving)} · {f.int(x.kcal)} kcal</Text>
                </View>
                <Btn small kind={added[x.id] ? "soft" : "ghost"} label={added[x.id] ? t("fav.added.short") : t("fav.add")} disabled={added[x.id]}
                  onPress={async () => { await onAdd([favToFood(x)], "favorite"); mark(x.id); }} />
              </View>
            ))}
          </Card>
        </View>
      ) : null}
      <Text style={T.small}>{t("fav.hint")}</Text>
    </>
  );
}

function Search({ onAdd, lang }: { onAdd: (item: NewFood) => Promise<void>; lang: store.Lang }) {
  const app = useApp();
  const { t, f } = app;
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const list = useMemo(() => {
    const all: (NewFood & { key: string; label: string })[] = [
      ...app.favorites.map((x) => ({ ...favToFood(x), key: "fav" + x.id, label: app.food(x.name, x.libraryName) })),
      ...FOODS.map(([name, serving, kcal, protein, carbs, fat]) => ({ name, serving, kcal, protein, carbs, fat, quantity: 1, libraryName: name, key: "lib" + name, label: trFood(name, lang) })),
    ];
    const needle = q.trim().toLowerCase();
    return all.filter((x) => !needle || x.label.toLowerCase().includes(needle) || x.name.toLowerCase().includes(needle)).slice(0, 60);
  }, [q, app.favorites, lang]);
  return (
    <>
      <View style={{ justifyContent: "center" }}>
        <TextInput value={q} onChangeText={setQ} placeholder={t("search.foods")} placeholderTextColor="#8A988F" accessibilityLabel={t("search.foods")} style={[s.input, { paddingLeft: 40 }]} />
        <View style={{ position: "absolute", left: 12 }} pointerEvents="none"><IconSearch size={18} color={C.muted} /></View>
      </View>
      <Card style={{ paddingVertical: 4 }}>
        {list.length ? list.map((x, i) => (
          <View key={x.key} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: C.sunk, paddingVertical: 10, gap: 10 }}>
            <Pressable accessibilityRole="button" onPress={() => { setOpen(open === x.key ? null : x.key); setQty(1); }} style={s.row}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontWeight: "600", color: C.ink }}>{x.label}{x.key.startsWith("fav") ? "  ★" : ""}</Text>
                <Text style={T.small}>{app.serving(x.serving)} · {t("abbr.p")} {f.dec(x.protein)} · {t("abbr.c")} {f.dec(x.carbs)} · {t("abbr.f")} {f.dec(x.fat)}</Text>
              </View>
              <Text style={[T.num, { fontSize: 16, color: C.ink }]}>{f.int(x.kcal)}</Text>
            </Pressable>
            {open === x.key ? (
              <View style={[s.row, { justifyContent: "space-between" }]}>
                <Stepper value={`${f.dec(qty, 2)} × `} onMinus={() => setQty(Math.max(0.5, qty - 0.5))} onPlus={() => setQty(Math.min(20, qty + 0.5))} labelMinus={t("detail.fewer")} labelPlus={t("detail.more")} />
                <Btn small label={`${t("fav.add")} · ${f.int(x.kcal * qty)} kcal`} onPress={async () => { const { key: _k, label: _l, ...item } = x; await onAdd({ ...item, quantity: qty }); setOpen(null); }} />
              </View>
            ) : null}
          </View>
        )) : <Text style={[T.small, { paddingVertical: 10 }]}>{t("search.none", { q })}</Text>}
      </Card>
    </>
  );
}

/** Typed nutrient amounts → micros (blank fields are left out). */
function readTyped(m: Record<string, string>): Micros | undefined {
  const out: Micros = {};
  for (const [id, v] of Object.entries(m)) {
    const x = parseFloat(v.replace(",", "."));
    if (v.trim() && x >= 0) out[id as NutrientId] = x;
  }
  return Object.keys(out).length ? out : undefined;
}

function Quick({ onAdd }: { onAdd: (item: NewFood, saveFav: boolean) => Promise<void> }) {
  const { t, profile } = useApp();
  const [micro, setMicro] = useState<Record<string, string>>({});
  const [kcal, setKcal] = useState("");
  const [name, setName] = useState("");
  const [p, setP] = useState("");
  const [c, setC] = useState("");
  const [fat, setFat] = useState("");
  const [fav, setFav] = useState(false);
  const n = (v: string) => Math.max(0, parseFloat(v.replace(",", ".")) || 0);
  return (
    <Card style={{ gap: 12 }}>
      <Text style={T.small}>{t("quick.sub")}</Text>
      <Field label={t("quick.eaten")} value={kcal} onChangeText={setKcal} keyboardType="number-pad" placeholder="0" suffix="kcal" />
      <Field label={t("quick.what")} value={name} onChangeText={setName} placeholder={t("quick.whatPh")} />
      <View style={s.row}>
        <Field label={t("macro.protein")} value={p} onChangeText={setP} keyboardType="decimal-pad" placeholder="0" suffix="g" />
        <Field label={t("macro.carbs")} value={c} onChangeText={setC} keyboardType="decimal-pad" placeholder="0" suffix="g" />
        <Field label={t("macro.fat")} value={fat} onChangeText={setFat} keyboardType="decimal-pad" placeholder="0" suffix="g" />
      </View>
      {profile.nutrients.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {profile.nutrients.map((id) => (
            <Field key={id} label={t(`nut.${id}`)} value={micro[id] ?? ""} onChangeText={(v) => setMicro({ ...micro, [id]: v })} keyboardType="decimal-pad"
              placeholder={t("auth.optional")} suffix={nutrientInfo(id).unit} style={{ flexBasis: "45%", flexGrow: 1 }} />
          ))}
        </View>
      ) : null}
      <View style={s.row}>
        <Checkbox on={fav} onToggle={() => setFav(!fav)} label={t("quick.saveFav")} />
        <Text style={{ color: C.ink, flex: 1 }} onPress={() => setFav(!fav)}>{t("quick.saveFav")}</Text>
      </View>
      <Btn label={t("quick.btn")} disabled={!kcal.trim()} onPress={() => onAdd({ name: name.trim() || t("quick.default"), serving: "1 serving", kcal: Math.round(n(kcal)), protein: n(p), carbs: n(c), fat: n(fat), micros: readTyped(micro), quantity: 1 }, fav && !!name.trim())} />
    </Card>
  );
}

function Exercise({ date, onDone }: { date: string; onDone: (name: string, kcal: number) => void }) {
  const app = useApp();
  const { t, f, lang, profile } = app;
  const [pick, setPick] = useState<[string, number] | null>(null);
  const [minutes, setMinutes] = useState("30");
  const [kcal, setKcal] = useState("");
  const [q, setQ] = useState("");
  const [qName, setQName] = useState("");
  const [qKcal, setQKcal] = useState("");
  const [qMin, setQMin] = useState("");
  const est = pick ? caloriesBurned(pick[1], profile.weightKg, parseInt(minutes || "0", 10) || 0) : 0;
  const acts = ACTIVITIES.filter(([n]) => !q.trim() || trActivity(n, lang).toLowerCase().includes(q.trim().toLowerCase()) || n.toLowerCase().includes(q.trim().toLowerCase()));

  const save = async (name: string, min: number, k: number, activityName?: string) => {
    await store.addExercises(date, activityName ? "manual" : "quick", [{ name, minutes: min, kcal: Math.round(k), activityName }]);
    onDone(activityName ? trActivity(activityName, lang) : name, k);
  };

  return (
    <>
      <Card style={{ gap: 12 }}>
        <SectionTitle>{t("exq.title")}</SectionTitle>
        <Text style={T.small}>{t("exq.sub")}</Text>
        <Field label={t("exq.burned")} value={qKcal} onChangeText={setQKcal} keyboardType="number-pad" placeholder="0" suffix="kcal" />
        <View style={s.row}>
          <Field label={t("exq.activity")} value={qName} onChangeText={setQName} placeholder={t("auth.optional")} />
          <Field label={t("exq.duration")} value={qMin} onChangeText={setQMin} keyboardType="number-pad" placeholder={t("auth.optional")} suffix={t("unit.min")} />
        </View>
        <Btn label={t("exq.btn")} disabled={!qKcal.trim()} onPress={() => save(qName.trim() || t("exq.default"), parseInt(qMin || "0", 10) || 0, parseInt(qKcal, 10) || 0)} />
      </Card>

      <SectionTitle>{t("ex.pick")}</SectionTitle>
      {pick ? (
        <Card style={{ gap: 12 }}>
          <Text style={{ fontSize: 17, fontWeight: "800", color: C.ink }}>{trActivity(pick[0], lang)}</Text>
          <Text style={T.small}>{t("ex.estimate", { met: f.dec(pick[1]), w: f.dec(profile.weightKg), unit: "kg" })}</Text>
          <View style={s.row}>
            <Field label={t("exq.duration")} value={minutes} onChangeText={(v) => { setMinutes(v); setKcal(""); }} keyboardType="number-pad" suffix={t("unit.min")} />
            <Field label={t("exq.burned")} value={kcal || String(est)} onChangeText={setKcal} keyboardType="number-pad" suffix="kcal" />
          </View>
          <View style={s.row}>
            <Btn kind="soft" label={t("common.back")} onPress={() => setPick(null)} style={{ flex: 1 }} />
            <Btn label={t("ex.btn")} disabled={!(parseInt(minutes, 10) > 0)} onPress={() => save(pick[0], parseInt(minutes, 10), kcal ? parseInt(kcal, 10) || 0 : est, pick[0])} style={{ flex: 2 }} />
          </View>
        </Card>
      ) : (
        <>
          <TextInput value={q} onChangeText={setQ} placeholder={t("search.acts")} placeholderTextColor="#8A988F" accessibilityLabel={t("search.acts")} style={s.input} />
          <Card style={{ paddingVertical: 4 }}>
            {acts.map(([n, met], i) => (
              <Pressable key={n} accessibilityRole="button" onPress={() => { setPick([n, met]); setMinutes("30"); setKcal(""); }}
                style={[s.row, { paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderTopColor: C.sunk }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "600", color: C.ink }}>{trActivity(n, lang)}</Text>
                  <Text style={T.small}>{t("ex.per30", { met: f.dec(met), kcal: f.int(caloriesBurned(met, profile.weightKg, 30)) })}</Text>
                </View>
              </Pressable>
            ))}
          </Card>
        </>
      )}
    </>
  );
}
