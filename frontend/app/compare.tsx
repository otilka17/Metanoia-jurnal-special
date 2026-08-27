import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { Alert } from "@/src/lib/alert";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/lib/api";
import { theme } from "@/src/lib/theme";

type CompItem = {
  id: string; title: string; subtitle: string;
  icon: string; color: string; row_count?: number;
};
type Row = { label: string; left: string; right: string };
type CompDetail = {
  id: string; title: string; subtitle: string; icon: string; color: string;
  left_label: string; right_label: string; rows: Row[]; insight: string; custom?: boolean;
};

export default function CompareScreen() {
  const router = useRouter();
  const [list, setList] = useState<CompItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detail, setDetail] = useState<CompDetail | null>(null);
  const [showGen, setShowGen] = useState(false);
  const [genLeft, setGenLeft] = useState("");
  const [genRight, setGenRight] = useState("");
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    try {
      const r: any = await api.listComparisons();
      setList(r.comparisons || []);
    } catch (e) { console.warn(e); }
  };

  useEffect(() => { (async () => { await load(); setLoading(false); })(); }, []);

  const openDetail = async (id: string) => {
    try {
      setDetail({ id, title: "", subtitle: "", icon: "", color: theme.colors.primary, left_label: "", right_label: "", rows: [], insight: "" });
      const d: any = await api.getComparison(id);
      setDetail(d);
    } catch (e: any) {
      Alert.alert("Eroare", e.message || "Nu am putut încărca detaliile");
      setDetail(null);
    }
  };

  const generate = async () => {
    const l = genLeft.trim(); const r = genRight.trim();
    if (l.length < 3 || r.length < 3) { Alert.alert("Termeni prea scurți", "Fiecare termen are minim 3 caractere."); return; }
    setGenerating(true);
    try {
      const d: any = await api.generateComparison(l, r);
      setShowGen(false);
      setGenLeft(""); setGenRight("");
      setDetail(d);
    } catch (e: any) {
      Alert.alert("Eroare AI", e.message || "AI-ul nu a putut genera comparația. Reîncearcă.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.bg, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={theme.colors.primary} size="large" /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: theme.colors.surface }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={26} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Tabele comparative</Text>
            <Text style={styles.subtitle}>Diferența pe scurt, cu repere concrete</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={theme.colors.primary} />}
      >
        <TouchableOpacity testID="open-generator" onPress={() => setShowGen(true)} style={styles.genCard}>
          <View style={styles.genIcon}><Ionicons name="sparkles" size={24} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.genTitle}>Generator AI 🤖</Text>
            <Text style={styles.genText}>Cere un tabel personalizat pe orice două profile</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={styles.disclaimerBox}>
          <Ionicons name="information-circle" size={18} color={theme.colors.primary} />
          <Text style={styles.disclaimerText}>Aceste tabele sunt educative, NU diagnostice. Pentru certitudine, consultă un psiholog clinician pediatric.</Text>
        </View>

        <Text style={styles.sectionTitle}>Comparări predefinite ({list.length})</Text>
        {list.map(c => (
          <TouchableOpacity key={c.id} testID={`comp-${c.id}`} onPress={() => openDetail(c.id)} style={[styles.compCard, { borderLeftColor: c.color }]} activeOpacity={0.7}>
            <View style={[styles.compIcon, { backgroundColor: c.color + "22" }]}>
              <Ionicons name={c.icon as any} size={22} color={c.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.compTitle}>{c.title}</Text>
              <Text style={styles.compSubtitle} numberOfLines={2}>{c.subtitle}</Text>
              <View style={styles.compMeta}><Ionicons name="grid" size={11} color={theme.colors.textSecondary} /><Text style={styles.compMetaText}>{c.row_count} rânduri</Text></View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textDisabled} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Detail modal */}
      <Modal visible={!!detail} animationType="slide" onRequestClose={() => setDetail(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }} edges={["top", "bottom"]}>
          <View style={[styles.detailHeader, { backgroundColor: detail?.color || theme.colors.primary }]}>
            <TouchableOpacity onPress={() => setDetail(null)} style={styles.iconBtn}>
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailTitle} numberOfLines={2}>{detail?.title || "Se încarcă..."}</Text>
              {detail?.custom && (
                <View style={styles.customBadge}><Ionicons name="sparkles" size={10} color="#fff" /><Text style={styles.customBadgeText}>Generat AI</Text></View>
              )}
            </View>
          </View>
          {detail?.rows && detail.rows.length > 0 ? (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
              <Text style={styles.detailSubtitle}>{detail.subtitle}</Text>

              {/* Column headers */}
              <View style={styles.headerRow}>
                <View style={styles.headerCell}><Text style={styles.headerCellText}>{detail.left_label}</Text></View>
                <View style={[styles.headerCell, { backgroundColor: (detail.color || theme.colors.primary) + "22", borderColor: detail.color }]}>
                  <Text style={[styles.headerCellText, { color: detail.color }]}>{detail.right_label}</Text>
                </View>
              </View>

              {/* Rows */}
              {detail.rows.map((r, i) => (
                <View key={i} style={styles.dataRow}>
                  <Text style={styles.rowLabel}>{r.label}</Text>
                  <View style={styles.rowCells}>
                    <View style={styles.leftCell}><Text style={styles.cellText}>{r.left}</Text></View>
                    <View style={[styles.rightCell, { borderColor: detail.color }]}><Text style={[styles.cellText, { color: theme.colors.textPrimary }]}>{r.right}</Text></View>
                  </View>
                </View>
              ))}

              {/* Insight */}
              <View style={[styles.insightBox, { borderLeftColor: detail.color }]}>
                <Ionicons name="bulb" size={18} color={detail.color} />
                <Text style={styles.insightText}>{detail.insight}</Text>
              </View>

              <View style={styles.disclaimerBox}>
                <Ionicons name="warning" size={16} color="#B56B6B" />
                <Text style={styles.disclaimerText}>Informațiile sunt orientative, NU diagnostice. Pentru evaluare, consultați un specialist.</Text>
              </View>
            </ScrollView>
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color={theme.colors.primary} size="large" />
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Generator modal */}
      <Modal visible={showGen} transparent animationType="slide" onRequestClose={() => !generating && setShowGen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={styles.sheetBg} onPress={() => !generating && setShowGen(false)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetIcon}><Ionicons name="sparkles" size={28} color={theme.colors.primary} /></View>
              <Text style={styles.sheetTitle}>Generator tabel AI</Text>
              <Text style={styles.sheetDesc}>Alege două profile/tulburări și Claude generează un tabel comparativ personalizat.</Text>

              <Text style={styles.pwLabel}>PRIMUL TERMEN</Text>
              <TextInput testID="gen-left" value={genLeft} onChangeText={setGenLeft}
                placeholder="Ex: ADHD la adolescenți" placeholderTextColor={theme.colors.textDisabled}
                style={styles.input} maxLength={100} />

              <View style={styles.vsRow}>
                <View style={styles.vsLine} />
                <Text style={styles.vsText}>VS</Text>
                <View style={styles.vsLine} />
              </View>

              <Text style={styles.pwLabel}>AL DOILEA TERMEN</Text>
              <TextInput testID="gen-right" value={genRight} onChangeText={setGenRight}
                placeholder="Ex: Depresie adolescentină" placeholderTextColor={theme.colors.textDisabled}
                style={styles.input} maxLength={100} />

              <View style={styles.suggestions}>
                {[
                  ["ADHD", "TSA (autism)"],
                  ["Copil supradotat", "Copil precoce"],
                  ["Tulburare de somn", "Ritm circadian dereglat"],
                ].map(([l, r], i) => (
                  <TouchableOpacity key={i} onPress={() => { setGenLeft(l); setGenRight(r); }} style={styles.suggestChip}>
                    <Text style={styles.suggestText}>{l} vs {r}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity testID="gen-submit" onPress={generate} disabled={generating || genLeft.length < 3 || genRight.length < 3}
                style={[styles.primaryBtn, (generating || genLeft.length < 3 || genRight.length < 3) && { opacity: 0.5 }]}>
                {generating ? (
                  <>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.primaryBtnText}>Claude gândește...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={18} color="#fff" />
                    <Text style={styles.primaryBtnText}>Generează</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => !generating && setShowGen(false)} style={{ paddingVertical: 12, alignItems: "center" }} disabled={generating}>
                <Text style={{ color: theme.colors.textSecondary }}>Anulează</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "700", color: theme.colors.textPrimary },
  subtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  genCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#7A9E9F", borderRadius: 16, padding: 16, marginBottom: 16 },
  genIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  genTitle: { color: "#fff", fontWeight: "700", fontSize: 15 },
  genText: { color: "rgba(255,255,255,0.9)", fontSize: 12, marginTop: 2 },
  disclaimerBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: theme.colors.primary + "11", borderRadius: 12, padding: 12, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: theme.colors.primary },
  disclaimerText: { flex: 1, fontSize: 12, color: theme.colors.textSecondary, lineHeight: 17 },
  sectionTitle: { fontSize: 12, fontWeight: "700", color: theme.colors.textSecondary, letterSpacing: 0.5, marginBottom: 10, textTransform: "uppercase" },
  compCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.colors.surface, borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.border, borderLeftWidth: 4 },
  compIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  compTitle: { fontSize: 14, fontWeight: "700", color: theme.colors.textPrimary, marginBottom: 3 },
  compSubtitle: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 16 },
  compMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  compMetaText: { fontSize: 10, color: theme.colors.textSecondary },
  detailHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 12, gap: 4 },
  detailTitle: { fontSize: 17, fontWeight: "700", color: "#fff", marginRight: 8 },
  customBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(255,255,255,0.25)", alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginTop: 4 },
  customBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  detailSubtitle: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 20, lineHeight: 19, fontStyle: "italic" },
  headerRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  headerCell: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: theme.colors.border, alignItems: "center" },
  headerCellText: { fontSize: 12, fontWeight: "700", color: theme.colors.textPrimary, textAlign: "center" },
  dataRow: { marginBottom: 14 },
  rowLabel: { fontSize: 12, fontWeight: "700", color: theme.colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, marginLeft: 4 },
  rowCells: { flexDirection: "row", gap: 8 },
  leftCell: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: theme.colors.border },
  rightCell: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 10, padding: 10, borderWidth: 1, borderLeftWidth: 3 },
  cellText: { fontSize: 13, color: theme.colors.textPrimary, lineHeight: 19 },
  insightBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: theme.colors.surface, borderRadius: 12, padding: 14, marginTop: 20, marginBottom: 12, borderLeftWidth: 4, borderColor: theme.colors.border, borderWidth: 1 },
  insightText: { flex: 1, fontSize: 13, color: theme.colors.textPrimary, lineHeight: 19 },
  sheetBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: theme.colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border, alignSelf: "center", marginBottom: 12 },
  sheetIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primary + "22", alignSelf: "center", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: theme.colors.textPrimary, textAlign: "center", marginBottom: 6 },
  sheetDesc: { fontSize: 13, color: theme.colors.textSecondary, textAlign: "center", marginBottom: 16, lineHeight: 18 },
  pwLabel: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: "700", letterSpacing: 1, marginTop: 8, marginBottom: 6 },
  input: { backgroundColor: theme.colors.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: theme.colors.textPrimary, borderWidth: 1, borderColor: theme.colors.border },
  vsRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 12 },
  vsLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  vsText: { fontSize: 12, fontWeight: "700", color: theme.colors.textSecondary, letterSpacing: 1 },
  suggestions: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12, marginBottom: 8 },
  suggestChip: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  suggestText: { fontSize: 11, color: theme.colors.textPrimary },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: theme.colors.primary, borderRadius: 999, paddingVertical: 14, marginTop: 12 },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
