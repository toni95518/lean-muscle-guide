import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { deviceLang, makeFormat, makeT, trActivity, trFood, trServing, type TFn } from "../lib/i18n";
import { DEFAULT_PROFILE, targets, type Profile, type Targets } from "../lib/nutrition";
import { getSecret, SECRET, setSecret } from "../lib/secrets";
import * as store from "../lib/store";
import type { Favorite, Lang, Settings } from "../lib/store";

interface AppState {
  ready: boolean;
  lang: Lang;
  t: TFn;
  f: ReturnType<typeof makeFormat>;
  food: (name: string, libraryName?: string) => string; // display name of a food
  activity: (name: string, activityName?: string) => string;
  serving: (s: string) => string;
  profile: Profile;
  goals: Targets;
  settings: Settings;
  favorites: Favorite[];
  hasAiKey: boolean;
  rev: number; // bumps after every data change, so screens reload
  bump: () => void;
  updateProfile: (p: Partial<Profile>) => Promise<void>;
  updateSettings: (s: Partial<Settings>) => Promise<void>;
  setFavorites: (f: Favorite[]) => Promise<void>;
  setAiKey: (key: string | null) => Promise<void>;
  reload: () => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [settings, setSettings] = useState<Settings>(store.DEFAULT_SETTINGS);
  const [favorites, setFavs] = useState<Favorite[]>([]);
  const [hasAiKey, setHasAiKey] = useState(false);
  const [rev, setRev] = useState(0);

  const reload = useCallback(async () => {
    const [p, s, f, key] = await Promise.all([store.loadProfile(), store.loadSettings(), store.loadFavorites(), getSecret(SECRET.aiKey)]);
    setProfile(p);
    setSettings(s);
    setFavs(f);
    setHasAiKey(!!key);
    setRev((r) => r + 1);
  }, []);

  useEffect(() => {
    reload().finally(() => setReady(true));
  }, [reload]);

  const lang: Lang = settings.language ?? deviceLang();

  const value = useMemo<AppState>(() => {
    const t = makeT(lang);
    return {
      ready,
      lang,
      t,
      f: makeFormat(lang),
      food: (name, libraryName) => (libraryName ? trFood(libraryName, lang) : name),
      activity: (name, activityName) => (activityName ? trActivity(activityName, lang) : name),
      serving: (s) => (s === "1 serving" ? t("unit.serving") : trServing(s, lang)),
      profile,
      goals: targets(profile),
      settings,
      favorites,
      hasAiKey,
      rev,
      bump: () => setRev((r) => r + 1),
      updateProfile: async (patch) => {
        const next = { ...profile, ...patch };
        setProfile(next);
        await store.saveProfile(next);
      },
      updateSettings: async (patch) => {
        const next = { ...settings, ...patch };
        setSettings(next);
        await store.saveSettings(next);
      },
      setFavorites: async (list) => {
        setFavs(list);
        await store.saveFavorites(list);
      },
      setAiKey: async (key) => {
        await setSecret(SECRET.aiKey, key);
        setHasAiKey(!!key);
      },
      reload,
    };
  }, [ready, lang, profile, settings, favorites, hasAiKey, rev, reload]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside AppProvider");
  return v;
}
