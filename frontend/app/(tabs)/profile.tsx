import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Alert } from "@/src/lib/alert";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";
import { theme } from "@/src/lib/theme";
import { exportArticlePdf } from "@/src/lib/pdf";
import { shareOrCopy } from "@/src/lib/share";
import { canPromptInstall, promptInstall, isPwaInstalled, isIos, subscribeInstallAvailability } from "@/src/lib/pwaInstall";

type Bookmark = {
  id: string; subtopic_id: string; title: string; category_id: string;
  type?: string; point?: string; explanation?: string;
};

const JOURNAL_BADGES: Record<string, { emoji: string; label: string }> = {
  first_entry: { emoji: "📝", label: "Prima însemnare" },
  entries_30: { emoji: "🌿", label: "30 de însemnări" },
  entries_100: { emoji: "🌳", label: "100 de însemnări" },
  streak_7: { emoji: "🔥", label: "7 zile la rând" },
  streak_30: { emoji: "🏆", label: "30 zile la rând" },
};

function StatCard({ icon, value, label, sub, color }: { icon: any; value: number; label: string; sub?: string; color: string }) {
  return (
    <View style={[styles.statCardBox, { borderLeftColor: color }]}>
      <Ionicons name={icon} size={16} color={color} style={styles.statCardIcon} />
      <Text style={[styles.statCardValue, { color }]}>{value}</Text>
      <Text style={styles.statCardLabel} numberOfLines={1}>{label}</Text>
      {sub ? <Text style={styles.statCardSub} numberOfLines={1}>{sub}</Text> : null}
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [myStats, setMyStats] = useState<any>(null);
  const [referralInfo, setReferralInfo] = useState<{ code: string; count: number } | null>(null);
  const [installState, setInstallState] = useState({ can: false, installed: false });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [tab, setTab] = useState<"article" | "explanation">("article");
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [emailOptOut, setEmailOptOut] = useState(false);
  const [savingEmailPref, setSavingEmailPref] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const submitChangePassword = async () => {
    if (newPass.length < 6) { Alert.alert("Parolă prea scurtă", "Parola nouă trebuie să aibă minim 6 caractere."); return; }
    if (newPass !== confirmPass) { Alert.alert("Neconcordanță", "Parolele nu se potrivesc."); return; }
    if (oldPass === newPass) { Alert.alert("Atenție", "Parola nouă trebuie să fie diferită de cea veche."); return; }
    setPwSaving(true);
    try {
      await api.changePassword(oldPass, newPass);
      Alert.alert("Succes ✓", "Parola a fost schimbată.");
      setShowChangePw(false);
      setOldPass(""); setNewPass(""); setConfirmPass(""); setShowPass(false);
    } catch (e: any) {
      Alert.alert("Eroare", e.message || "Nu am putut schimba parola");
    } finally {
      setPwSaving(false);
    }
  };

  const load = async () => {
    try {
      const res: any = await api.listBookmarks();
      setBookmarks(res.bookmarks);
    } catch (e) { console.warn("listBookmarks failed", e); }
    try {
      const stats: any = await api.myStats();
      setMyStats(stats);
    } catch (e) { console.warn("myStats failed", e); }
    try {
      const ref: any = await api.myReferrals();
      setReferralInfo({ code: ref.code, count: ref.count });
    } catch (e) { console.warn("myReferrals failed", e); }
    try {
      const me: any = await api.me();
      setEmailOptOut(!!me.email_opt_out);
    } catch (e) { console.warn("me failed", e); }
  };

  const toggleEmailOptOut = async () => {
    const next = !emailOptOut;
    setSavingEmailPref(true);
    try {
      await api.setEmailPreferences(next);
      setEmailOptOut(next);
    } catch (e: any) {
      Alert.alert("Eroare", e.message || "Nu am putut salva preferința");
    } finally {
      setSavingEmailPref(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      "Ștergi contul definitiv?",
      "Toate datele tale (jurnal, mesaje, recenzii, postări, teste) vor fi șterse ireversibil. Nu poți reveni asupra acestei acțiuni.",
      [
        { text: "Anulează", style: "cancel" },
        {
          text: "Șterge definitiv", style: "destructive", onPress: async () => {
            setDeletingAccount(true);
            try {
              await api.deleteMyAccount();
              await logout();
              router.replace("/(auth)/login");
            } catch (e: any) {
              Alert.alert("Eroare", e.message || "Nu am putut șterge contul");
              setDeletingAccount(false);
            }
          },
        },
      ]
    );
  };

  const copyReferralCode = async () => {
    if (!referralInfo) return;
    await Clipboard.setStringAsync(referralInfo.code);
    Alert.alert("Copiat ✓", `Codul ${referralInfo.code} a fost copiat în clipboard.`);
  };

  const shareReferralCode = async () => {
    if (!referralInfo) return;
    await shareOrCopy(
      `Te invit să încerci Ghid Părinte, o aplicație de parenting conștient cu sfaturi AI personalizate! La înregistrare, introdu codul meu de recomandare: ${referralInfo.code}.\n\nhttps://otilka17.github.io/Metanoia-psihologiacopilului/`
    );
  };

  useEffect(() => {
    const update = () => setInstallState({ can: canPromptInstall(), installed: isPwaInstalled() });
    update();
    return subscribeInstallAvailability(update);
  }, []);

  const onInstallPress = async () => {
    if (installState.can) {
      const outcome = await promptInstall();
      if (outcome === "accepted") setInstallState((s) => ({ ...s, can: false, installed: true }));
    } else if (isIos()) {
      Alert.alert(
        "Instalează aplicația",
        "Apasă pe butonul Distribuie (pătratul cu săgeată în sus) din bara browserului Safari, apoi alege \"Adaugă pe ecranul principal\"."
      );
    } else {
      Alert.alert(
        "Instalează aplicația",
        "Deschide meniul browserului (⋮) și alege \"Instalează aplicația\" sau \"Adaugă pe ecranul principal\"."
      );
    }
  };

  useFocusEffect(useCallback(() => {
    (async () => { setLoading(true); await load(); setLoading(false); })();
  }, []));

  const onLogout = () => setConfirmLogout(true);

  const doLogout = async () => {
    setConfirmLogout(false);
    await logout();
    router.replace("/(auth)/login");
  };

  const onExport = async (b: Bookmark) => {
    setExporting(b.id);
    try { await exportArticlePdf(b.subtopic_id); }
    catch (e: any) { Alert.alert("Eroare PDF", e.message || "Nu am putut exporta"); }
    finally { setExporting(null); }
  };

  const onRemove = async (id: string) => {
    await api.removeBookmark(id);
    await load();
  };

  const articles = bookmarks.filter((b) => (b.type || "article") === "article");
  const explanations = bookmarks.filter((b) => b.type === "explanation");
  const current = tab === "article" ? articles : explanations;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        <Text style={styles.title}>Profil</Text>

        <View style={styles.userCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{(user?.name || "P")[0].toUpperCase()}</Text></View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {user?.is_admin && (
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#fff" />
              <Text style={styles.adminBadgeText}>ADMINISTRATOR</Text>
            </View>
          )}
          {!!referralInfo && referralInfo.count > 0 && (
            <View style={styles.ambassadorBadge}>
              <Ionicons name="star" size={12} color="#fff" />
              <Text style={styles.ambassadorBadgeText}>AMBASADOR · {referralInfo.count} {referralInfo.count === 1 ? "prieten invitat" : "prieteni invitați"}</Text>
            </View>
          )}
        </View>

        {Platform.OS === "web" && !installState.installed && (
          <TouchableOpacity testID="install-app-btn" style={styles.installCard} onPress={onInstallPress}>
            <View style={styles.installIcon}>
              <Ionicons name="download-outline" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.installTitle}>Adaugă pe ecranul principal</Text>
              <Text style={styles.installText}>Instalează aplicația pe telefon, ca acces rapid, fără browser</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        )}

        {!!referralInfo && (
          <View style={styles.referralCard}>
            <View style={styles.referralHeader}>
              <Ionicons name="gift" size={18} color={theme.colors.primary} />
              <Text style={styles.referralTitle}>Recomandă aplicația unui prieten</Text>
            </View>
            <Text style={styles.referralText}>
              Trimite codul tău unui prieten. Când se înregistrează cu el, primești titlul de Ambasador.
            </Text>
            <TouchableOpacity testID="copy-referral-code" style={styles.referralCodeBox} onPress={copyReferralCode}>
              <Text style={styles.referralCode}>{referralInfo.code}</Text>
              <Ionicons name="copy-outline" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity testID="share-referral-code" style={styles.referralShareBtn} onPress={shareReferralCode}>
              <Ionicons name="share-social-outline" size={16} color="#fff" />
              <Text style={styles.referralShareText}>Trimite invitație</Text>
            </TouchableOpacity>
          </View>
        )}

        {user?.is_admin && (
          <TouchableOpacity testID="open-admin" onPress={() => router.push("/admin")} style={styles.adminCard}>
            <View style={styles.adminIcon}><Ionicons name="shield-checkmark" size={22} color="#fff" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.adminTitle}>Panou Admin</Text>
              <Text style={styles.adminText}>Gestionează utilizatori, statistici globale, moderare</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#fff" />
          </TouchableOpacity>
        )}

        {myStats && (
          <>
            <Text style={styles.sectionTitle}>Activitatea mea</Text>
            <View style={styles.statsGrid}>
              <StatCard icon="book" value={myStats.journal?.total || 0} label="Însemnări" sub={`${myStats.journal?.last_7_days || 0} în ultima săpt.`} color="#7A9E9F" />
              <StatCard icon="chatbubbles" value={myStats.ask_ai?.total || 0} label="Întrebări AI" sub={`${myStats.ask_ai?.last_30_days || 0} în ultima lună`} color="#DE8F6E" />
              <StatCard icon="bookmark" value={myStats.bookmarks_total || 0} label="Bookmarks" color="#E8C37C" />
              <StatCard icon="library" value={myStats.guide_read_chapters || 0} label="Capitole citite" color="#5E8B7E" />
              <StatCard icon="chatbubble-ellipses" value={(myStats.forum?.posts || 0) + (myStats.forum?.answers || 0)} label="Postări forum" sub={`${myStats.forum?.posts || 0} întrebări`} color="#9B8CC4" />
              <StatCard icon="clipboard" value={myStats.test_result ? 1 : 0} label="Test profil" sub={myStats.test_result?.profile_title ? myStats.test_result.profile_title.slice(0, 20) + '…' : "Nefăcut"} color="#6E8FD8" />
              <StatCard icon="flame" value={myStats.journal?.streak_days || 0} label="Streak jurnal" sub="zile la rând" color="#D9743C" />
            </View>
            {!!myStats.journal?.badges?.length && (
              <View style={styles.badgesRow}>
                {myStats.journal.badges.map((b: string) => {
                  const def = JOURNAL_BADGES[b];
                  if (!def) return null;
                  return (
                    <View key={b} style={styles.badgeChip} testID={`badge-${b}`}>
                      <Text style={styles.badgeEmoji}>{def.emoji}</Text>
                      <Text style={styles.badgeLabel}>{def.label}</Text>
                    </View>
                  );
                })}
              </View>
            )}
            {myStats.family && (
              <View style={styles.famBanner}>
                <Ionicons name="people-circle" size={20} color={theme.colors.primary} />
                <Text style={styles.famBannerText}>În familie · Cod <Text style={{ fontWeight: "700", color: theme.colors.primary }}>{myStats.family.code}</Text> · {myStats.family.member_count} membri</Text>
              </View>
            )}
          </>
        )}

        <Text style={styles.sectionTitle}>Articole salvate</Text>

        <View style={styles.tabs}>
          <TouchableOpacity
            testID="tab-articles"
            style={[styles.tab, tab === "article" && styles.tabActive]}
            onPress={() => setTab("article")}
          >
            <Text style={[styles.tabText, tab === "article" && styles.tabTextActive]}>
              Articole ({articles.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="tab-explanations"
            style={[styles.tab, tab === "explanation" && styles.tabActive]}
            onPress={() => setTab("explanation")}
          >
            <Text style={[styles.tabText, tab === "explanation" && styles.tabTextActive]}>
              Explicații ({explanations.length})
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 24 }} />
        ) : current.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="bookmark-outline" size={40} color={theme.colors.textDisabled} />
            <Text style={styles.emptyText}>
              {tab === "article"
                ? "Niciun articol salvat. Apasă bookmark într-un articol."
                : "Nicio explicație salvată. Apasă pe puncte în Mind Map."}
            </Text>
          </View>
        ) : (
          current.map((b, i) => (
            <View key={b.id} style={styles.bmItem} testID={`bookmark-${i}`}>
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => tab === "article" ? router.push(`/article/${b.subtopic_id}`) : null}
              >
                {tab === "explanation" && (
                  <Text style={styles.bmSubtitle}>{b.title}</Text>
                )}
                <Text style={styles.bmTitle} numberOfLines={tab === "article" ? 1 : 3}>
                  {tab === "article" ? b.title : b.point}
                </Text>
                {tab === "explanation" && !!b.explanation && (
                  <Text style={styles.bmExpl} numberOfLines={3}>{b.explanation}</Text>
                )}
              </TouchableOpacity>
              <View style={styles.bmActions}>
                {tab === "article" && (
                  <TouchableOpacity
                    testID={`pdf-${i}`}
                    onPress={() => onExport(b)}
                    disabled={exporting === b.id}
                    style={styles.iconBtn}
                  >
                    {exporting === b.id ? (
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : (
                      <Ionicons name="download-outline" size={20} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
                <TouchableOpacity testID={`del-bm-${i}`} onPress={() => onRemove(b.id)} style={styles.iconBtn}>
                  <Ionicons name="trash-outline" size={18} color={theme.colors.textDisabled} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity testID="change-password-button" style={styles.pwBtn} onPress={() => setShowChangePw(true)}>
          <Ionicons name="key-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.pwBtnText}>Schimbă parola</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="email-optout-toggle"
          style={styles.pwBtn}
          onPress={toggleEmailOptOut}
          disabled={savingEmailPref}
        >
          <Ionicons name={emailOptOut ? "mail-outline" : "mail"} size={20} color={theme.colors.primary} />
          <Text style={styles.pwBtnText}>
            {emailOptOut ? "Reactivează emailurile" : "Dezabonează-te de la emailuri"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity testID="logout-button" style={styles.logoutBtn} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
          <Text style={styles.logoutText}>Deconectare</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="delete-account-button"
          style={[styles.logoutBtn, { marginTop: 10 }]}
          onPress={confirmDeleteAccount}
          disabled={deletingAccount}
        >
          {deletingAccount ? (
            <ActivityIndicator color={theme.colors.error} size="small" />
          ) : (
            <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
          )}
          <Text style={styles.logoutText}>Șterge contul și toate datele mele</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showChangePw} animationType="slide" transparent onRequestClose={() => setShowChangePw(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={styles.sheetBg} onPress={() => !pwSaving && setShowChangePw(false)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheetHandle} />
              <View style={[styles.modalIcon, { backgroundColor: theme.colors.primary + "22", alignSelf: "center" }]}>
                <Ionicons name="key" size={28} color={theme.colors.primary} />
              </View>
              <Text style={[styles.modalTitle, { textAlign: "center" }]}>Schimbă parola</Text>
              <Text style={[styles.modalText, { textAlign: "center", marginBottom: 20 }]}>Confirmă parola actuală și alege una nouă.</Text>

              <Text style={styles.pwLabel}>PAROLĂ ACTUALĂ</Text>
              <View style={styles.pwRow}>
                <TextInput testID="cp-old" secureTextEntry={!showPass} value={oldPass} onChangeText={setOldPass}
                  placeholder="Parola actuală" placeholderTextColor={theme.colors.textDisabled} style={styles.pwInput} />
                <TouchableOpacity onPress={() => setShowPass(v => !v)} style={styles.eyeBtn}>
                  <Ionicons name={showPass ? "eye-off" : "eye"} size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.pwLabel}>PAROLĂ NOUĂ</Text>
              <TextInput testID="cp-new" secureTextEntry={!showPass} value={newPass} onChangeText={setNewPass}
                placeholder="Minim 6 caractere" placeholderTextColor={theme.colors.textDisabled} style={styles.pwInput} />

              <Text style={styles.pwLabel}>CONFIRMĂ PAROLA</Text>
              <TextInput testID="cp-confirm" secureTextEntry={!showPass} value={confirmPass} onChangeText={setConfirmPass}
                placeholder="Repetă parola nouă" placeholderTextColor={theme.colors.textDisabled} style={styles.pwInput} />

              <TouchableOpacity testID="cp-forgot" onPress={() => { setShowChangePw(false); router.push("/(auth)/forgot-password"); }} style={{ paddingVertical: 8, alignItems: "center" }}>
                <Text style={{ color: theme.colors.primary, fontSize: 13, fontWeight: "600" }}>Am uitat parola actuală</Text>
              </TouchableOpacity>

              <View style={styles.modalActions}>
                <TouchableOpacity testID="cp-cancel" style={styles.modalBtnOutline} onPress={() => { if (!pwSaving) setShowChangePw(false); }} disabled={pwSaving}>
                  <Text style={styles.modalBtnOutlineText}>Anulează</Text>
                </TouchableOpacity>
                <TouchableOpacity testID="cp-submit" style={[styles.modalBtn, pwSaving && { opacity: 0.5 }]} onPress={submitChangePassword} disabled={pwSaving}>
                  {pwSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnText}>Salvează</Text>}
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={confirmLogout} transparent animationType="fade" onRequestClose={() => setConfirmLogout(false)}>
        <Pressable style={styles.modalBg} onPress={() => setConfirmLogout(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalIcon, { backgroundColor: theme.colors.error + "22" }]}>
              <Ionicons name="log-out-outline" size={28} color={theme.colors.error} />
            </View>
            <Text style={styles.modalTitle}>Deconectare</Text>
            <Text style={styles.modalText}>Sigur vrei să te deconectezi din cont?</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity testID="cancel-logout" style={styles.modalBtnOutline} onPress={() => setConfirmLogout(false)}>
                <Text style={styles.modalBtnOutlineText}>Anulează</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="confirm-logout" style={[styles.modalBtn, { backgroundColor: theme.colors.error }]} onPress={doLogout}>
                <Text style={styles.modalBtnText}>Deconectează</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  title: { ...theme.font.h1, color: theme.colors.textPrimary, marginTop: 8, marginBottom: 16 },
  userCard: {
    alignItems: "center", backgroundColor: theme.colors.surface,
    borderRadius: 16, padding: 24, marginBottom: 16,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  adminBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#B56B6B", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginTop: 8 },
  adminBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  ambassadorBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#E8C37C", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginTop: 8 },
  ambassadorBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  referralCard: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border },
  referralHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  referralTitle: { fontSize: 14, fontWeight: "700", color: theme.colors.textPrimary },
  referralText: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 17, marginBottom: 12 },
  referralCodeBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: theme.colors.primary + "11", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 10 },
  referralCode: { fontSize: 18, fontWeight: "700", color: theme.colors.primary, letterSpacing: 2 },
  referralShareBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: theme.colors.primary, borderRadius: 999, paddingVertical: 12 },
  referralShareText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  adminCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#B56B6B", borderRadius: 16, padding: 14, marginBottom: 16 },
  adminIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  adminTitle: { color: "#fff", fontWeight: "700", fontSize: 15 },
  adminText: { color: "rgba(255,255,255,0.9)", fontSize: 12, marginTop: 2 },
  installCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.colors.primary, borderRadius: 16, padding: 14, marginBottom: 16 },
  installIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  installTitle: { color: "#fff", fontWeight: "700", fontSize: 15 },
  installText: { color: "rgba(255,255,255,0.9)", fontSize: 12, marginTop: 2 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  statCardBox: { width: "31.5%", backgroundColor: theme.colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: theme.colors.border, borderLeftWidth: 3 },
  statCardIcon: { marginBottom: 4 },
  statCardValue: { fontSize: 20, fontWeight: "700" },
  statCardLabel: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 2, fontWeight: "500" },
  statCardSub: { fontSize: 9, color: theme.colors.textDisabled, marginTop: 1 },
  badgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  badgeChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: theme.colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: theme.colors.border },
  badgeEmoji: { fontSize: 14 },
  badgeLabel: { fontSize: 12, fontWeight: "600", color: theme.colors.textPrimary },
  famBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.colors.primary + "11", borderRadius: 12, padding: 12, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: theme.colors.primary },
  famBannerText: { flex: 1, fontSize: 12, color: theme.colors.textPrimary },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "600" },
  name: { ...theme.font.h3, color: theme.colors.textPrimary },
  email: { ...theme.font.body, color: theme.colors.textSecondary, marginTop: 4 },
  sectionTitle: { ...theme.font.h3, color: theme.colors.textPrimary, marginBottom: 12, marginTop: 8 },
  tabs: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: "center", borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  tabActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  tabText: { fontSize: 13, color: theme.colors.textPrimary, fontWeight: "500" },
  tabTextActive: { color: "#fff", fontWeight: "600" },
  empty: { alignItems: "center", paddingVertical: 24 },
  emptyText: { ...theme.font.body, color: theme.colors.textSecondary, marginTop: 8, textAlign: "center", paddingHorizontal: 24 },
  bmItem: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: theme.colors.surface, borderRadius: 12,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  bmTitle: { fontSize: 14, color: theme.colors.textPrimary, fontWeight: "500" },
  bmSubtitle: { fontSize: 10, color: theme.colors.textSecondary, letterSpacing: 0.8, fontWeight: "600", marginBottom: 4 },
  bmExpl: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 6, lineHeight: 17 },
  bmActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  iconBtn: { padding: 8 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 32, padding: 16, borderRadius: 999, borderWidth: 1.5, borderColor: theme.colors.error },
  logoutText: { color: theme.colors.error, fontSize: 15, fontWeight: "600" },
  pwBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.border, marginTop: 24, backgroundColor: theme.colors.surface },
  pwBtnText: { color: theme.colors.primary, fontWeight: "700", fontSize: 15 },
  sheetBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: theme.colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border, alignSelf: "center", marginBottom: 12 },
  pwLabel: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: "700", letterSpacing: 1, marginTop: 12, marginBottom: 6 },
  pwRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  pwInput: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: theme.colors.textPrimary, borderWidth: 1, borderColor: theme.colors.border },
  eyeBtn: { padding: 12 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", paddingHorizontal: 28 },
  modalCard: { backgroundColor: theme.colors.surface, borderRadius: 20, padding: 24, alignItems: "center" },
  modalIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  modalTitle: { ...theme.font.h3, color: theme.colors.textPrimary, marginBottom: 8 },
  modalText: { ...theme.font.body, color: theme.colors.textSecondary, textAlign: "center", marginBottom: 20 },
  modalActions: { flexDirection: "row", gap: 10, alignSelf: "stretch" },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 999, alignItems: "center" },
  modalBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  modalBtnOutline: { flex: 1, paddingVertical: 14, borderRadius: 999, alignItems: "center", borderWidth: 1.5, borderColor: theme.colors.border },
  modalBtnOutlineText: { color: theme.colors.textPrimary, fontWeight: "600", fontSize: 14 },
});
