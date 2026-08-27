import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable
} from "react-native";
import { Alert } from "@/src/lib/alert";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";
import { theme } from "@/src/lib/theme";

type Tab = "overview" | "users" | "flagged";

type Stats = any;
type AdminUser = {
  id: string; email: string; name: string; created_at: string; is_admin: boolean;
  journal_count: number; ask_count: number; forum_count: number; last_activity: string | null;
};
type FlaggedItem = { id: string; content: string; display_name: string; flag_count: number; created_at: string; title?: string; category?: string; post_id?: string };

export default function AdminScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [flagged, setFlagged] = useState<{ posts: FlaggedItem[]; answers: FlaggedItem[] }>({ posts: [], answers: [] });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [s, u, f]: any = await Promise.all([
        api.adminStats(),
        api.adminUsers(),
        api.adminFlagged(),
      ]);
      setStats(s);
      setUsers(u.users || []);
      setFlagged({ posts: f.flagged_posts || [], answers: f.flagged_answers || [] });
    } catch (e: any) {
      Alert.alert("Eroare admin", e.message || "Nu am putut încărca datele");
    }
  }, []);

  useEffect(() => {
    if (!user?.is_admin) {
      Alert.alert("Acces refuzat", "Această zonă e doar pentru administratori.");
      router.back();
      return;
    }
    (async () => { await loadAll(); setLoading(false); })();
  }, [user, loadAll, router]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const searchUsers = async () => {
    try {
      const u: any = await api.adminUsers(search.trim());
      setUsers(u.users || []);
    } catch (e) { console.warn(e); }
  };

  const deleteUser = (u: AdminUser) => {
    if (u.is_admin) { Alert.alert("Interzis", "Administratorii nu pot fi șterși din listă."); return; }
    Alert.alert(
      "Șterge utilizator?",
      `Confirmi ștergerea contului ${u.email}?\nToate datele (jurnal, forum, teste) vor fi șterse.`,
      [
        { text: "Anulează", style: "cancel" },
        {
          text: "Șterge", style: "destructive", onPress: async () => {
            try { await api.adminDeleteUser(u.id); await loadAll(); Alert.alert("Șters ✓", `Contul ${u.email} a fost șters.`); }
            catch (e: any) { Alert.alert("Eroare", e.message || "Nu am putut șterge"); }
          }
        },
      ]
    );
  };

  const toggleAdmin = async (u: AdminUser) => {
    try {
      const r: any = await api.adminToggleAdmin(u.id);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_admin: r.is_admin } : x));
    } catch (e: any) { Alert.alert("Eroare", e.message || "Eroare"); }
  };

  const deleteFlaggedPost = (id: string) => {
    Alert.alert("Șterge postare?", "Postarea și toate răspunsurile ei vor fi șterse.", [
      { text: "Anulează", style: "cancel" },
      { text: "Șterge", style: "destructive", onPress: async () => { try { await api.adminDeleteForumPost(id); await loadAll(); } catch (e: any) { Alert.alert("Eroare", e.message || "Eroare"); } } },
    ]);
  };

  const deleteFlaggedAnswer = (id: string) => {
    Alert.alert("Șterge răspuns?", "Răspunsul va fi șters.", [
      { text: "Anulează", style: "cancel" },
      { text: "Șterge", style: "destructive", onPress: async () => { try { await api.adminDeleteForumAnswer(id); await loadAll(); } catch (e: any) { Alert.alert("Eroare", e.message || "Eroare"); } } },
    ]);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg }}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: theme.colors.surface }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={26} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Admin</Text>
            <Text style={styles.subtitle}>Super-administrator</Text>
          </View>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#fff" />
            <Text style={styles.adminBadgeText}>ADMIN</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
          {(["overview", "users", "flagged"] as Tab[]).map(t => (
            <TouchableOpacity key={t} testID={`tab-${t}`} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
              <Ionicons name={t === "overview" ? "stats-chart" : t === "users" ? "people" : "flag"} size={14} color={tab === t ? "#fff" : theme.colors.textPrimary} />
              <Text style={[styles.tabText, tab === t && { color: "#fff", fontWeight: "700" }]}>
                {t === "overview" ? "Statistici" : t === "users" ? `Utilizatori (${users.length})` : `Moderare (${flagged.posts.length + flagged.answers.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {tab === "overview" && stats && (
          <>
            <View style={styles.grid}>
              <StatCard icon="people" label="Utilizatori total" value={stats.users?.total || 0} color="#5E8B7E" />
              <StatCard icon="person-add" label="Noi (7 zile)" value={stats.users?.new_last_7_days || 0} color="#7A9E9F" />
              <StatCard icon="flash" label="Activi (7z)" value={stats.users?.active_last_7_days || 0} color="#DE8F6E" />
              <StatCard icon="calendar" label="Noi (30z)" value={stats.users?.new_last_30_days || 0} color="#E8C37C" />
            </View>

            <SectionHeader title="Activitate 24h" icon="pulse" />
            <View style={styles.grid}>
              <StatCard icon="book" label="Însemnări jurnal" value={stats.journal?.last_24h || 0} sub={`Total: ${stats.journal?.total || 0}`} color="#9B8CC4" />
              <StatCard icon="chatbubbles" label="Întrebări AI" value={stats.ask_ai?.last_24h || 0} sub={`Total: ${stats.ask_ai?.total || 0}`} color="#6E8FD8" />
            </View>

            <SectionHeader title="Comunitate & Familii" icon="people-circle" />
            <View style={styles.grid}>
              <StatCard icon="chatbubble" label="Postări forum" value={stats.forum?.posts_total || 0} sub={`${stats.forum?.answers_total || 0} răspunsuri`} color="#9B8CC4" />
              <StatCard icon="alert-circle" label="Raportate" value={stats.forum?.flagged_posts || 0} color="#B56B6B" />
              <StatCard icon="people-circle" label="Familii" value={stats.families_total || 0} color="#5E8B7E" />
              <StatCard icon="clipboard" label="Teste completate" value={stats.tests?.total || 0} color="#DE8F6E" />
            </View>

            {stats.tests?.profile_distribution && Object.keys(stats.tests.profile_distribution).length > 0 && (
              <>
                <SectionHeader title="Distribuție profiluri" icon="pie-chart" />
                <View style={styles.card}>
                  {Object.entries(stats.tests.profile_distribution).map(([k, v]: any) => (
                    <View key={k} style={styles.distRow}>
                      <Text style={styles.distLabel}>{k}</Text>
                      <Text style={styles.distValue}>{v}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {tab === "users" && (
          <>
            <View style={styles.searchRow}>
              <TextInput
                testID="admin-search"
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={searchUsers}
                placeholder="Caută după email sau nume..."
                placeholderTextColor={theme.colors.textDisabled}
                style={styles.searchInput}
              />
              <TouchableOpacity onPress={searchUsers} style={styles.searchBtn}>
                <Ionicons name="search" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            {users.map(u => (
              <View key={u.id} style={styles.userCard}>
                <View style={styles.userHeader}>
                  <View style={[styles.avatar, u.is_admin && { backgroundColor: "#B56B6B" }]}>
                    <Ionicons name={u.is_admin ? "shield-checkmark" : "person"} size={20} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>{u.name}{u.email === user?.email ? " (tu)" : ""}</Text>
                    <Text style={styles.userEmail}>{u.email}</Text>
                  </View>
                  {u.is_admin && <View style={styles.tagAdmin}><Text style={styles.tagAdminText}>ADMIN</Text></View>}
                </View>
                <View style={styles.userStats}>
                  <View style={styles.userStat}><Ionicons name="book" size={12} color={theme.colors.textSecondary} /><Text style={styles.userStatText}>{u.journal_count} jurnal</Text></View>
                  <View style={styles.userStat}><Ionicons name="chatbubbles" size={12} color={theme.colors.textSecondary} /><Text style={styles.userStatText}>{u.ask_count} AI</Text></View>
                  <View style={styles.userStat}><Ionicons name="chatbubble" size={12} color={theme.colors.textSecondary} /><Text style={styles.userStatText}>{u.forum_count} postări</Text></View>
                </View>
                <Text style={styles.userMeta}>
                  Înregistrat: {new Date(u.created_at).toLocaleDateString("ro-RO")}
                  {u.last_activity ? ` · Activ: ${new Date(u.last_activity).toLocaleDateString("ro-RO")}` : ""}
                </Text>
                {u.email !== user?.email && (
                  <View style={styles.userActions}>
                    <TouchableOpacity onPress={() => toggleAdmin(u)} style={[styles.actionBtn, u.is_admin && { backgroundColor: "#B56B6B22" }]}>
                      <Ionicons name={u.is_admin ? "shield-outline" : "shield-checkmark"} size={14} color={u.is_admin ? "#B56B6B" : theme.colors.primary} />
                      <Text style={[styles.actionBtnText, { color: u.is_admin ? "#B56B6B" : theme.colors.primary }]}>{u.is_admin ? "Retrage admin" : "Fă admin"}</Text>
                    </TouchableOpacity>
                    {!u.is_admin && (
                      <TouchableOpacity onPress={() => deleteUser(u)} style={[styles.actionBtn, { backgroundColor: "#B56B6B22" }]}>
                        <Ionicons name="trash" size={14} color="#B56B6B" />
                        <Text style={[styles.actionBtnText, { color: "#B56B6B" }]}>Șterge</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            ))}
            {users.length === 0 && (
              <View style={styles.empty}><Text style={styles.emptyText}>Niciun utilizator găsit</Text></View>
            )}
          </>
        )}

        {tab === "flagged" && (
          <>
            {flagged.posts.length === 0 && flagged.answers.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="checkmark-circle" size={48} color="#5E8B7E" />
                <Text style={[styles.emptyText, { marginTop: 12 }]}>Nicio raportare activă. Bravo, comunitate curată! 🎉</Text>
              </View>
            ) : (
              <>
                {flagged.posts.length > 0 && (
                  <>
                    <SectionHeader title={`Postări raportate (${flagged.posts.length})`} icon="alert-circle" />
                    {flagged.posts.map(p => (
                      <View key={p.id} style={styles.flagCard}>
                        <View style={styles.flagHeader}>
                          <View style={styles.flagBadge}><Ionicons name="flag" size={12} color="#fff" /><Text style={styles.flagBadgeText}>{p.flag_count}</Text></View>
                          <Text style={styles.flagAuthor}>{p.display_name}</Text>
                        </View>
                        <Text style={styles.flagTitle}>{p.title}</Text>
                        <Text style={styles.flagContent} numberOfLines={4}>{p.content}</Text>
                        <TouchableOpacity onPress={() => deleteFlaggedPost(p.id)} style={styles.deleteBtn}>
                          <Ionicons name="trash" size={14} color="#B56B6B" />
                          <Text style={styles.deleteBtnText}>Șterge postare</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </>
                )}
                {flagged.answers.length > 0 && (
                  <>
                    <SectionHeader title={`Răspunsuri raportate (${flagged.answers.length})`} icon="alert-circle" />
                    {flagged.answers.map(a => (
                      <View key={a.id} style={styles.flagCard}>
                        <View style={styles.flagHeader}>
                          <View style={styles.flagBadge}><Ionicons name="flag" size={12} color="#fff" /><Text style={styles.flagBadgeText}>{a.flag_count}</Text></View>
                          <Text style={styles.flagAuthor}>{a.display_name}</Text>
                        </View>
                        <Text style={styles.flagContent} numberOfLines={5}>{a.content}</Text>
                        <TouchableOpacity onPress={() => deleteFlaggedAnswer(a.id)} style={styles.deleteBtn}>
                          <Ionicons name="trash" size={14} color="#B56B6B" />
                          <Text style={styles.deleteBtnText}>Șterge răspuns</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function StatCard({ icon, label, value, sub, color }: { icon: any; label: string; value: number; sub?: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon} size={16} color={color} />
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: any }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={16} color={theme.colors.textSecondary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 10, gap: 8 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "700", color: theme.colors.textPrimary },
  subtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  adminBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#B56B6B", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, marginRight: 8 },
  adminBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  tab: { flexDirection: "row", alignItems: "center", flexShrink: 0, gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.bg },
  tabActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  tabText: { fontSize: 12, color: theme.colors.textPrimary, fontWeight: "500" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { width: "48%", backgroundColor: theme.colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.colors.border, borderLeftWidth: 4 },
  statHeader: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: "500" },
  statValue: { fontSize: 26, fontWeight: "700" },
  statSub: { fontSize: 10, color: theme.colors.textDisabled, marginTop: 2 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 24, marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: theme.colors.textSecondary, letterSpacing: 0.3 },
  card: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.colors.border },
  distRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  distLabel: { fontSize: 13, color: theme.colors.textPrimary, flex: 1 },
  distValue: { fontSize: 15, fontWeight: "700", color: theme.colors.primary },
  searchRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  searchInput: { flex: 1, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: theme.colors.textPrimary },
  searchBtn: { backgroundColor: theme.colors.primary, borderRadius: 12, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  userCard: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.border },
  userHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  userName: { fontSize: 14, fontWeight: "600", color: theme.colors.textPrimary },
  userEmail: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 },
  tagAdmin: { backgroundColor: "#B56B6B22", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  tagAdminText: { color: "#B56B6B", fontSize: 9, fontWeight: "700" },
  userStats: { flexDirection: "row", gap: 12, marginBottom: 6 },
  userStat: { flexDirection: "row", alignItems: "center", gap: 3 },
  userStatText: { fontSize: 11, color: theme.colors.textSecondary },
  userMeta: { fontSize: 10, color: theme.colors.textDisabled, marginBottom: 8 },
  userActions: { flexDirection: "row", gap: 6, marginTop: 4 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: theme.colors.primary + "11", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  actionBtnText: { fontSize: 11, fontWeight: "700" },
  flagCard: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: "#B56B6B44", borderLeftWidth: 4, borderLeftColor: "#B56B6B" },
  flagHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  flagBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#B56B6B", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  flagBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  flagAuthor: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: "500" },
  flagTitle: { fontSize: 14, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 4 },
  flagContent: { fontSize: 13, color: theme.colors.textPrimary, lineHeight: 19, marginBottom: 10 },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "#B56B6B22", paddingVertical: 8, borderRadius: 999 },
  deleteBtnText: { color: "#B56B6B", fontWeight: "700", fontSize: 12 },
  empty: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 24 },
  emptyText: { fontSize: 13, color: theme.colors.textSecondary, textAlign: "center" },
});
