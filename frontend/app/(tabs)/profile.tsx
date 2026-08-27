import { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Pressable,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Alert } from "@/src/lib/alert";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";
import { theme } from "@/src/lib/theme";
import { exportArticlePdf } from "@/src/lib/pdf";

type Bookmark = {
  id: string; subtopic_id: string; title: string; category_id: string;
  type?: string; point?: string; explanation?: string;
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [tab, setTab] = useState<"article" | "explanation">("article");
  const [confirmLogout, setConfirmLogout] = useState(false);

  const load = async () => {
    try {
      const res: any = await api.listBookmarks();
      setBookmarks(res.bookmarks);
    } catch {}
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
        </View>

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

        <TouchableOpacity testID="logout-button" style={styles.logoutBtn} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
          <Text style={styles.logoutText}>Deconectare</Text>
        </TouchableOpacity>
      </ScrollView>

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
    borderRadius: 16, padding: 24, marginBottom: 24,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "600" },
  name: { ...theme.font.h3, color: theme.colors.textPrimary },
  email: { ...theme.font.body, color: theme.colors.textSecondary, marginTop: 4 },
  sectionTitle: { ...theme.font.h3, color: theme.colors.textPrimary, marginBottom: 12 },
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
