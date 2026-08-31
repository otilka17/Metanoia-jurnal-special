import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { Alert } from "@/src/lib/alert";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/lib/api";
import { theme } from "@/src/lib/theme";
import { shareOrCopy } from "@/src/lib/share";

type Member = { id: string; name: string; email: string; is_me: boolean };
type PendingMember = { id: string; name: string; email: string };
type Family = { id: string; code: string; members: Member[]; pending: PendingMember[]; created_at: string };
type MyPendingRequest = { code: string; owner_name: string };

export default function FamilyScreen() {
  const router = useRouter();
  const [family, setFamily] = useState<Family | null>(null);
  const [myPendingRequest, setMyPendingRequest] = useState<MyPendingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");

  const load = async () => {
    try {
      const r: any = await api.familyMe();
      setFamily(r.family || null);
      setMyPendingRequest(r.pending_request || null);
    } catch (e: any) {
      console.warn(e);
    }
  };

  useEffect(() => { (async () => { await load(); setLoading(false); })(); }, []);

  const create = async () => {
    setBusy(true);
    try { const r: any = await api.familyCreate(); setFamily(r.family); }
    catch (e: any) { Alert.alert("Eroare", e.message || "Nu am putut crea familia"); }
    finally { setBusy(false); }
  };

  const join = async () => {
    const c = code.trim().toUpperCase();
    if (c.length < 4) { Alert.alert("Cod invalid", "Codul are minim 4 caractere."); return; }
    setBusy(true);
    try {
      await api.familyJoin(c);
      setCode("");
      await load();
      Alert.alert("Cerere trimisă ✓", "Așteaptă ca celălalt membru să aprobe cererea din aplicație.");
    }
    catch (e: any) { Alert.alert("Eroare", e.message || "Nu am putut trimite cererea"); }
    finally { setBusy(false); }
  };

  const cancelRequest = () => {
    Alert.alert(
      "Anulezi cererea?",
      "Cererea ta de a te alătura acestei familii va fi retrasă.",
      [
        { text: "Înapoi", style: "cancel" },
        {
          text: "Anulează cererea", style: "destructive", onPress: async () => {
            setBusy(true);
            try { await api.familyLeave(); setMyPendingRequest(null); }
            catch (e: any) { Alert.alert("Eroare", e.message || "Eroare"); }
            finally { setBusy(false); }
          }
        },
      ]
    );
  };

  const approveRequest = (m: PendingMember) => {
    Alert.alert(
      "Aprobi cererea?",
      `${m.name} (${m.email}) va vedea jurnalul, testele și statisticile — la fel ca tine.`,
      [
        { text: "Anulează", style: "cancel" },
        {
          text: "Aprobă", onPress: async () => {
            setBusy(true);
            try { const r: any = await api.familyApprove(m.id); setFamily(r.family); }
            catch (e: any) { Alert.alert("Eroare", e.message || "Nu am putut aproba cererea"); }
            finally { setBusy(false); }
          }
        },
      ]
    );
  };

  const declineRequest = (m: PendingMember) => {
    Alert.alert(
      "Respingi cererea?",
      `${m.name} (${m.email}) nu va primi acces la datele copilului.`,
      [
        { text: "Înapoi", style: "cancel" },
        {
          text: "Respinge", style: "destructive", onPress: async () => {
            setBusy(true);
            try { await api.familyDecline(m.id); await load(); }
            catch (e: any) { Alert.alert("Eroare", e.message || "Nu am putut respinge cererea"); }
            finally { setBusy(false); }
          }
        },
      ]
    );
  };

  const leave = () => {
    Alert.alert(
      "Părăsește familia?",
      "După părăsire, nu vei mai vedea jurnalul și testele partenerului.",
      [
        { text: "Anulează", style: "cancel" },
        {
          text: "Părăsește", style: "destructive", onPress: async () => {
            setBusy(true);
            try { await api.familyLeave(); setFamily(null); }
            catch (e: any) { Alert.alert("Eroare", e.message || "Eroare"); }
            finally { setBusy(false); }
          }
        },
      ]
    );
  };

  const copyCode = async () => {
    if (!family) return;
    await Clipboard.setStringAsync(family.code);
    Alert.alert("Copiat ✓", `Codul ${family.code} a fost copiat în clipboard.`);
  };

  const shareCode = async () => {
    if (!family) return;
    await shareOrCopy(
      `Te invit să te alături în aplicația Jurnal Părinte (ca partener sau specialist) pentru a vedea jurnalul partajat și testul copilului! Folosește codul: ${family.code}.`
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg }}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: theme.colors.surface }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={26} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Familie</Text>
            <Text style={styles.subtitle}>Partajează progresul cu partenerul sau cu specialistul copilului</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {family ? (
          <>
            <View style={styles.codeCard}>
              <Text style={styles.codeLabel}>CODUL FAMILIEI</Text>
              <Text style={styles.codeBig}>{family.code}</Text>
              <Text style={styles.codeHint}>Partajează-l cu partenerul sau specialistul copilului pentru a se alătura</Text>
              <View style={styles.codeActions}>
                <TouchableOpacity testID="copy-code" onPress={copyCode} style={styles.actionBtn}>
                  <Ionicons name="copy-outline" size={18} color={theme.colors.primary} />
                  <Text style={styles.actionBtnText}>Copiază</Text>
                </TouchableOpacity>
                <TouchableOpacity testID="share-code" onPress={shareCode} style={styles.actionBtn}>
                  <Ionicons name="share-social-outline" size={18} color={theme.colors.primary} />
                  <Text style={styles.actionBtnText}>Trimite</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Membri ({family.members.length}/2)</Text>
            {family.members.map(m => (
              <View key={m.id} style={styles.memberCard}>
                <View style={[styles.avatar, m.is_me && { backgroundColor: theme.colors.primary }]}>
                  <Ionicons name="person" size={20} color={m.is_me ? "#fff" : theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{m.name}{m.is_me ? " (tu)" : ""}</Text>
                  <Text style={styles.memberEmail}>{m.email}</Text>
                </View>
                {!m.is_me && <View style={styles.partnerBadge}><Text style={styles.partnerBadgeText}>partener / specialist</Text></View>}
              </View>
            ))}

            {family.pending.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Cereri în așteptare</Text>
                {family.pending.map(m => (
                  <View key={m.id} style={styles.pendingCard}>
                    <View style={styles.avatar}>
                      <Ionicons name="hourglass-outline" size={20} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberName}>{m.name}</Text>
                      <Text style={styles.memberEmail}>{m.email}</Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TouchableOpacity testID={`decline-${m.id}`} onPress={() => declineRequest(m)} disabled={busy} style={styles.declineBtn}>
                        <Ionicons name="close" size={18} color="#B56B6B" />
                      </TouchableOpacity>
                      <TouchableOpacity testID={`approve-${m.id}`} onPress={() => approveRequest(m)} disabled={busy} style={styles.approveBtn}>
                        <Ionicons name="checkmark" size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            )}

            {family.members.length < 2 && family.pending.length === 0 && (
              <View style={styles.waitingCard}>
                <Ionicons name="hourglass-outline" size={24} color={theme.colors.textSecondary} />
                <Text style={styles.waitingText}>Aștept partenerul sau specialistul să se alăture cu codul de mai sus</Text>
              </View>
            )}

            <View style={styles.sharedInfo}>
              <Text style={styles.sharedTitle}>📋 Ce se partajează:</Text>
              <Text style={styles.sharedItem}>• Toate însemnările din Jurnal (cu autorul vizibil)</Text>
              <Text style={styles.sharedItem}>• Rezultatul Testului profil copil (cel mai recent)</Text>
              <Text style={styles.sharedItem}>• Statisticile lunare combinate</Text>
            </View>

            <TouchableOpacity testID="leave-family" onPress={leave} disabled={busy} style={[styles.leaveBtn, busy && { opacity: 0.5 }]}>
              {busy ? <ActivityIndicator color="#B56B6B" /> : (
                <>
                  <Ionicons name="exit-outline" size={18} color="#B56B6B" />
                  <Text style={styles.leaveBtnText}>Părăsește familia</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : myPendingRequest ? (
          <>
            <View style={styles.heroBox}>
              <View style={styles.heroIcon}><Ionicons name="hourglass-outline" size={36} color={theme.colors.primary} /></View>
              <Text style={styles.heroTitle}>Cerere trimisă, în așteptare</Text>
              <Text style={styles.heroDesc}>
                {myPendingRequest.owner_name} trebuie să aprobe cererea ta din aplicație înainte să vezi jurnalul și testele copilului.
              </Text>
            </View>
            <TouchableOpacity testID="cancel-request" onPress={cancelRequest} disabled={busy} style={[styles.leaveBtn, busy && { opacity: 0.5 }]}>
              {busy ? <ActivityIndicator color="#B56B6B" /> : (
                <>
                  <Ionicons name="close-circle-outline" size={18} color="#B56B6B" />
                  <Text style={styles.leaveBtnText}>Anulează cererea</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.heroBox}>
              <View style={styles.heroIcon}><Ionicons name="people" size={36} color={theme.colors.primary} /></View>
              <Text style={styles.heroTitle}>Invită partenerul sau specialistul</Text>
              <Text style={styles.heroDesc}>
                Poți înrola aici și specialistul care monitorizează copilul (psiholog, terapeut etc.) — vedeți împreună jurnalul observațiilor și rezultatul testului, pentru o imagine completă a nevoilor lui.
              </Text>
            </View>

            <TouchableOpacity testID="create-family" onPress={create} disabled={busy} style={[styles.primaryBtn, busy && { opacity: 0.5 }]}>
              {busy ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="add-circle" size={20} color="#fff" />
                  <Text style={styles.primaryBtnText}>Creează familie nouă</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>SAU</Text>
              <View style={styles.dividerLine} />
            </View>

            <Text style={styles.label}>AM PRIMIT UN COD DE LA PARTENER</Text>
            <View style={styles.joinRow}>
              <TextInput
                testID="code-input"
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                placeholder="ABCD23"
                placeholderTextColor={theme.colors.textDisabled}
                autoCapitalize="characters"
                maxLength={6}
                style={styles.codeInput}
              />
              <TouchableOpacity testID="join-family" onPress={join} disabled={busy || code.length < 4} style={[styles.joinBtn, (busy || code.length < 4) && { opacity: 0.5 }]}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.joinBtnText}>Intră</Text>}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "700", color: theme.colors.textPrimary },
  subtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  heroBox: { backgroundColor: theme.colors.surface, borderRadius: 18, padding: 24, alignItems: "center", borderWidth: 1, borderColor: theme.colors.border, marginBottom: 20 },
  heroIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.primary + "22", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  heroTitle: { fontSize: 18, fontWeight: "700", color: theme.colors.textPrimary, textAlign: "center", marginBottom: 8 },
  heroDesc: { fontSize: 14, color: theme.colors.textSecondary, textAlign: "center", lineHeight: 20 },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: theme.colors.primary, borderRadius: 999, paddingVertical: 14 },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  dividerText: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: "700", letterSpacing: 1 },
  label: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: "700", letterSpacing: 1, marginBottom: 8 },
  joinRow: { flexDirection: "row", gap: 8 },
  codeInput: { flex: 1, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 18, fontWeight: "700", letterSpacing: 4, color: theme.colors.textPrimary, textAlign: "center" },
  joinBtn: { backgroundColor: theme.colors.primary, borderRadius: 12, paddingHorizontal: 24, justifyContent: "center", minWidth: 80, alignItems: "center" },
  joinBtnText: { color: "#fff", fontWeight: "700" },
  codeCard: { backgroundColor: theme.colors.primary, borderRadius: 18, padding: 24, alignItems: "center", marginBottom: 24 },
  codeLabel: { color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: "700", letterSpacing: 2, marginBottom: 4 },
  codeBig: { color: "#fff", fontSize: 42, fontWeight: "800", letterSpacing: 8, marginBottom: 6, fontVariant: ["tabular-nums"] },
  codeHint: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginBottom: 16, textAlign: "center" },
  codeActions: { flexDirection: "row", gap: 8 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.95)", paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999 },
  actionBtnText: { color: theme.colors.primary, fontWeight: "700", fontSize: 13 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: theme.colors.textPrimary, marginBottom: 10, letterSpacing: 0.3 },
  memberCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.colors.surface, padding: 14, borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: theme.colors.border },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary + "22", alignItems: "center", justifyContent: "center" },
  memberName: { fontSize: 14, fontWeight: "600", color: theme.colors.textPrimary },
  memberEmail: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  partnerBadge: { backgroundColor: theme.colors.primary + "22", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  partnerBadgeText: { fontSize: 10, color: theme.colors.primary, fontWeight: "700" },
  waitingCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.colors.surface, padding: 14, borderRadius: 14, marginTop: 8, borderWidth: 1, borderColor: theme.colors.border, borderStyle: "dashed" },
  waitingText: { flex: 1, fontSize: 12, color: theme.colors.textSecondary, lineHeight: 17 },
  pendingCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#DE8F6E11", padding: 14, borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: "#DE8F6E44", borderStyle: "dashed" },
  approveBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  declineBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#B56B6B22", alignItems: "center", justifyContent: "center" },
  sharedInfo: { backgroundColor: theme.colors.primary + "11", borderRadius: 12, padding: 14, marginTop: 24, borderLeftWidth: 3, borderLeftColor: theme.colors.primary },
  sharedTitle: { fontSize: 13, fontWeight: "700", color: theme.colors.textPrimary, marginBottom: 8 },
  sharedItem: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 19 },
  leaveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#B56B6B22", borderRadius: 999, paddingVertical: 14, marginTop: 32 },
  leaveBtnText: { color: "#B56B6B", fontWeight: "700" },
});
