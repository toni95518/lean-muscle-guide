import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useToast } from "../components/toast";
import { Btn, Card, Field, Header, Notice, Screen, Seg, s } from "../components/ui";
import { AccountError, DEFAULT_SERVER, downloadBackup, signIn, uploadBackup } from "../lib/account";
import { getSecret, SECRET, setSecret } from "../lib/secrets";
import * as store from "../lib/store";
import { C, T } from "../lib/theme";
import { useApp } from "../state/app";

export default function AccountScreen() {
  const app = useApp();
  const { t, f, settings } = app;
  const toast = useToast();
  const acct = settings.account;
  const [mode, setMode] = useState<"in" | "up">("in");
  const [server, setServer] = useState(acct?.serverUrl ?? DEFAULT_SERVER);
  const [email, setEmail] = useState(acct?.email ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"" | "sign" | "up" | "down">("");
  const [error, setError] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    getSecret(SECRET.accountToken).then((x) => setHasToken(!!x));
  }, []);

  const errText = (e: unknown) => {
    const code = e instanceof AccountError ? e.code : "other";
    const map: Record<string, string> = {
      offline: t("acct.err.offline"),
      invalid_credentials: t("acct.err.credentials"),
      unauthorized: t("acct.err.expired"),
      email_taken: t("acct.err.taken"),
      validation_failed: t("acct.err.validation"),
      not_found: t("acct.err.noBackup"),
    };
    return map[code] ?? t("acct.err.other");
  };

  const submit = async () => {
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError(t("acct.err.email"));
    if (password.length < 8) return setError(t("acct.err.password"));
    setBusy("sign");
    try {
      const token = await signIn(server.trim(), email.trim().toLowerCase(), password, mode === "up");
      await setSecret(SECRET.accountToken, token);
      setHasToken(true);
      setPassword("");
      await app.updateSettings({ account: { serverUrl: server.trim(), email: email.trim().toLowerCase(), lastBackupAt: null } });
      toast.show(t("acct.signedIn"));
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy("");
    }
  };

  const withToken = async (fn: (token: string) => Promise<void>) => {
    const token = await getSecret(SECRET.accountToken);
    if (!token || !acct) return setError(t("acct.err.expired"));
    try {
      await fn(token);
    } catch (e) {
      if (e instanceof AccountError && e.code === "unauthorized") {
        await setSecret(SECRET.accountToken, null);
        setHasToken(false);
      }
      setError(errText(e));
    }
  };

  const backup = async () => {
    setError(null);
    setBusy("up");
    await withToken(async (token) => {
      const at = await uploadBackup(acct!.serverUrl, token, await store.exportAll());
      await app.updateSettings({ account: { ...acct!, lastBackupAt: at } });
      toast.show(t("acct.backedUp"));
    });
    setBusy("");
  };

  const restore = async () => {
    setError(null);
    setConfirmRestore(false);
    setBusy("down");
    await withToken(async (token) => {
      const r = await downloadBackup(acct!.serverUrl, token);
      await store.importAll(r.data);
      if (r.data.language !== undefined) await app.updateSettings({ language: r.data.language });
      await app.reload();
      toast.show(t("acct.restored", { date: f.date(new Date(r.updatedAt), { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) }));
    });
    setBusy("");
  };

  const signOut = async () => {
    await setSecret(SECRET.accountToken, null);
    setHasToken(false);
    await app.updateSettings({ account: null });
  };

  const signedIn = !!acct && hasToken;

  return (
    <Screen>
      <Header title={t("acct.title")} back="close" />
      <Notice text={t("acct.lede")} />
      {error ? <Notice kind="error" text={error} /> : null}

      {signedIn ? (
        <Card>
          <Text style={T.label}>{t("acct.signedInAs")}</Text>
          <Text style={[T.body, { fontWeight: "700" }]}>{acct!.email}</Text>
          <Text style={T.small}>
            {acct!.lastBackupAt ? t("acct.lastBackup", { date: f.date(new Date(acct!.lastBackupAt), { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) }) : t("acct.noBackupYet")}
          </Text>
          <Btn label={t("acct.backup")} loading={busy === "up"} onPress={backup} />
          {confirmRestore ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: C.danger }}>{t("acct.restoreConfirm")}</Text>
              <View style={s.row}>
                <Btn kind="danger" small label={t("acct.restoreYes")} onPress={restore} />
                <Btn kind="ghost" small label={t("common.cancel")} onPress={() => setConfirmRestore(false)} />
              </View>
            </View>
          ) : (
            <Btn kind="soft" label={t("acct.restore")} loading={busy === "down"} onPress={() => setConfirmRestore(true)} />
          )}
          <Btn kind="link" small label={t("acct.signOut")} onPress={signOut} style={{ alignSelf: "flex-start" }} />
        </Card>
      ) : (
        <Card>
          <Seg label={t("acct.title")} options={[["in", t("acct.signIn")], ["up", t("acct.create")]]} value={mode} onChange={setMode} />
          <Field label={t("acct.email")} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" style={{ flexGrow: 0, flexBasis: "auto" }} />
          <Field label={t("acct.password")} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete={mode === "up" ? "new-password" : "current-password"} hint={mode === "up" ? t("acct.passwordHint") : undefined} style={{ flexGrow: 0, flexBasis: "auto" }} />
          {advanced ? <Field label={t("acct.server")} value={server} onChangeText={setServer} autoCapitalize="none" autoCorrect={false} keyboardType="url" hint={t("acct.serverHint")} style={{ flexGrow: 0, flexBasis: "auto" }} /> : null}
          <Btn label={mode === "up" ? t("acct.create") : t("acct.signIn")} loading={busy === "sign"} onPress={submit} />
          <Btn kind="link" small label={advanced ? t("connect.hideAdvanced") : t("connect.advanced")} onPress={() => setAdvanced(!advanced)} style={{ alignSelf: "flex-start" }} />
        </Card>
      )}
      <Btn kind="ghost" label={t("acct.later")} onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
    </Screen>
  );
}
