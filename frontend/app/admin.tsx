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
import { Markdown } from "@/src/lib/Markdown";

type Tab = "overview" | "users" | "flagged";

type Stats = any;
type AdminUser = {
  id: string; email: string; name: string; created_at: string; is_admin: boolean;
  journal_count: number; ask_count: number; forum_count: number; last_activity: string | null;
};
type FlaggedItem = { id: string; content: string; display_name: string; flag_count: number; created_at: string; title?: string; category?: string; post_id?: string };
type AskItem = { id: string; question: string; answer: string; created_at: string };
type Specialist = { id: string; name: string; title: string; specialization: string; calendly_url: string };

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
  const [askViewer, setAskViewer] = useState<{ user: AdminUser; items: AskItem[] } | null>(null);
  const [askLoading, setAskLoading] = useState(false);
  const [pregenLoading, setPregenLoading] = useState(false);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [showSpecModal, setShowSpecModal] = useState(false);
  const [editingSpec, setEditingSpec] = useState<Specialist | null>(null);
  const [specName, setSpecName] = useState("");
  const [specTitle, setSpecTitle] = useState("");
  const [specSpecialization, setSpecSpecialization] = useState("");
  const [specUrl, setSpecUrl] = useState("");
  const [specSaving, setSpecSaving] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [s, u, f, sp]: any = await Promise.all([
        api.adminStats(),
        api.adminUsers(),
        api.adminFlagged(),
        api.listSpecialists(),
      ]);
      setStats(s);
      setUsers(u.users || []);
      setFlagged({ posts: f.flagged_posts || [], answers: f.flagged_answers || [] });
      setSpecialists(sp.specialists || []);
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

  const viewAskHistory = async (u: AdminUser) => {
    setAskViewer({ user: u, items: [] });
    setAskLoading(true);
    try {
      const r: any = await api.adminUserAskHistory(u.id);
      setAskViewer({ user: u, items: r.items || [] });
    } catch (e: any) {
      Alert.alert("Eroare", e.message || "Nu am putut încărca întrebările");
      setAskViewer(null);
    } finally {
      setAskLoading(false);
    }
  };

  const pregenerateArticles = async () => {
    setPregenLoading(true);
    try {
      const r: any = await api.adminPregenerateArticles();
      Alert.alert(
        "Pornit ✓",
        `${r.already_cached}/${r.total} articole erau deja generate. Se generează acum ${r.generating} lipsă, în fundal — poate dura câteva minute.`
      );
    } catch (e: any) {
      Alert.alert("Eroare", e.message || "Nu am putut porni pre-generarea");
    } finally {
      setPregenLoading(false);
    }
  };

  const openAddSpecialist = () => {
    setEditingSpec(null);
    setSpecName(""); setSpecTitle(""); setSpecSpecialization(""); setSpecUrl("");
    setShowSpecModal(true);
  };
  const openEditSpecialist = (s: Specialist) => {
    setEditingSpec(s);
    setSpecName(s.name); setSpecTitle(s.title); setSpecSpecialization(s.specialization); setSpecUrl(s.calendly_url);
    setShowSpecModal(true);
  };
  const saveSpecialist = async () => {
    if (!specName.trim()) { Alert.alert("Nume lipsă", "Scrie numele specialistului."); return; }
    if (!specUrl.trim().startsWith("https://")) { Alert.alert("Link invalid", "Linkul Calendly trebuie să înceapă cu https://"); return; }
    setSpecSaving(true);
    try {
      const data = { name: specName.trim(), title: specTitle.trim(), specialization: specSpecialization.trim(), calendly_url: specUrl.trim() };
      if (editingSpec) await api.adminUpdateSpecialist(editingSpec.id, data);
      else await api.adminCreateSpecialist(data);
      setShowSpecModal(false);
      await loadAll();
    } catch (e: any) {
      Alert.alert("Eroare", e.message || "Nu am putut salva specialistul");
    } finally {
      setSpecSaving(false);
    }
  };
  const deleteSpecialist = (s: Specialist) => {
    Alert.alert("Șterge specialist?", `Confirmi ștergerea lui ${s.name}?`, [
      { text: "Anulează", style: "cancel" },
      { text: "Șterge", style: "destructive", onPress: async () => { try { await api.adminDeleteSpecialist(s.id); await loadAll(); } catch (e: any) { Alert.alert("Eroare", e.message || "Eroare"); } } },
    ]);
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexShrink: 0 }} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
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
            <TouchableOpacity testID="pregen-articles-btn" style={[styles.pregenCard, pregenLoading && { opacity: 0.6 }]} onPress={pregenerateArticles} disabled={pregenLoading}>
              <View style={styles.pregenIcon}>
                {pregenLoading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="flash" size={20} color="#fff" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pregenTitle}>Pre-generează toate articolele</Text>
                <Text style={styles.pregenText}>Generează din timp articolele AI lipsă din Mind Map, ca niciun utilizator să nu mai aștepte</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.calendlyCard}>
              <View style={styles.calendlyHeader}>
                <Ionicons name="calendar" size={18} color={theme.colors.primary} />
                <Text style={styles.calendlyTitle}>Specialiști (programare + plată online)</Text>
              </View>
              {specialists.map((s) => (
                <View key={s.id} style={styles.specRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.specName}>{s.name}</Text>
                    <Text style={styles.specMeta} numberOfLines={1}>{[s.title, s.specialization].filter(Boolean).join(" · ") || s.calendly_url}</Text>
                  </View>
                  <TouchableOpacity testID={`edit-spec-${s.id}`} onPress={() => openEditSpecialist(s)} style={styles.specIconBtn}>
                    <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity testID={`delete-spec-${s.id}`} onPress={() => deleteSpecialist(s)} style={styles.specIconBtn}>
                    <Ionicons name="trash-outline" size={18} color="#B56B6B" />
                  </TouchableOpacity>
                </View>
              ))}
              {specialists.length === 0 && <Text style={styles.specEmpty}>Niciun specialist adăugat încă.</Text>}
              <TouchableOpacity testID="add-specialist-btn" style={styles.calendlySaveBtn} onPress={openAddSpecialist}>
                <Text style={styles.calendlySaveText}>+ Adaugă specialist</Text>
              </TouchableOpacity>
            </View>

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
                  <TouchableOpacity
                    testID={`view-ask-${u.id}`}
                    style={[styles.userStat, u.ask_count > 0 && styles.userStatClickable]}
                    onPress={() => u.ask_count > 0 && viewAskHistory(u)}
                    disabled={u.ask_count === 0}
                  >
                    <Ionicons name="chatbubbles" size={12} color={u.ask_count > 0 ? theme.colors.primary : theme.colors.textSecondary} />
                    <Text style={[styles.userStatText, u.ask_count > 0 && { color: theme.colors.primary, fontWeight: "700" }]}>{u.ask_count} AI</Text>
                  </TouchableOpacity>
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

      <Modal visible={!!askViewer} animationType="slide" onRequestClose={() => setAskViewer(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }} edges={["top", "bottom"]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setAskViewer(null)} style={styles.iconBtn}>
              <Ionicons name="close" size={26} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{askViewer?.user.name}</Text>
              <Text style={styles.subtitle}>{askViewer?.user.email} · {askViewer?.items.length ?? 0} întrebări</Text>
            </View>
          </View>
          {askLoading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
              {(askViewer?.items || []).map((it, i) => (
                <View key={it.id} style={styles.askCard} testID={`admin-ask-${i}`}>
                  <Text style={styles.askQ}>{it.question}</Text>
                  <View style={styles.askDivider} />
                  <Markdown text={it.answer} />
                  <Text style={styles.askDate}>{new Date(it.created_at).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" })}</Text>
                </View>
              ))}
              {askViewer && askViewer.items.length === 0 && (
                <Text style={styles.emptyText}>Niciun rezultat.</Text>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      <Modal visible={showSpecModal} transparent animationType="fade" onRequestClose={() => !specSaving && setShowSpecModal(false)}>
        <Pressable style={styles.modalBg} onPress={() => !specSaving && setShowSpecModal(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{editingSpec ? "Editează specialist" : "Adaugă specialist"}</Text>
            <TextInput testID="spec-name-input" value={specName} onChangeText={setSpecName} placeholder="Nume (ex. Ana Popescu)" placeholderTextColor={theme.colors.textDisabled} style={styles.modalInput} />
            <TextInput testID="spec-title-input" value={specTitle} onChangeText={setSpecTitle} placeholder="Titlu (ex. Psiholog clinician)" placeholderTextColor={theme.colors.textDisabled} style={styles.modalInput} />
            <TextInput testID="spec-specialization-input" value={specSpecialization} onChangeText={setSpecSpecialization} placeholder="Specializare (ex. ADHD, Autism)" placeholderTextColor={theme.colors.textDisabled} style={styles.modalInput} />
            <TextInput testID="spec-url-input" value={specUrl} onChangeText={setSpecUrl} placeholder="https://calendly.com/..." placeholderTextColor={theme.colors.textDisabled} autoCapitalize="none" style={styles.modalInput} />
            <View style={styles.modalActions}>
              <TouchableOpacity testID="spec-cancel" style={styles.modalBtnOutline} onPress={() => setShowSpecModal(false)} disabled={specSaving}>
                <Text style={styles.modalBtnOutlineText}>Anulează</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="spec-save" style={[styles.modalBtn, specSaving && { opacity: 0.5 }]} onPress={saveSpecialist} disabled={specSaving}>
                {specSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnText}>Salvează</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  userStatClickable: { backgroundColor: theme.colors.primary + "11", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
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
  pregenCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#6E8FD8", borderRadius: 16, padding: 14, marginBottom: 16 },
  pregenIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  pregenTitle: { color: "#fff", fontWeight: "700", fontSize: 14 },
  pregenText: { color: "rgba(255,255,255,0.9)", fontSize: 11, marginTop: 2 },
  calendlyCard: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border },
  calendlyHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  calendlyTitle: { fontSize: 13, fontWeight: "700", color: theme.colors.textPrimary },
  calendlySaveBtn: { backgroundColor: theme.colors.primary, borderRadius: 999, paddingVertical: 10, alignItems: "center", marginTop: 4 },
  calendlySaveText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  specRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  specName: { fontSize: 13, fontWeight: "700", color: theme.colors.textPrimary },
  specMeta: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  specIconBtn: { padding: 6 },
  specEmpty: { fontSize: 12, color: theme.colors.textSecondary, paddingVertical: 10, textAlign: "center" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", paddingHorizontal: 28 },
  modalCard: { backgroundColor: theme.colors.surface, borderRadius: 20, padding: 24, alignItems: "center" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: theme.colors.textPrimary, marginBottom: 16, textAlign: "center" },
  modalInput: { alignSelf: "stretch", backgroundColor: theme.colors.surfaceElevated, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: theme.colors.textPrimary, marginBottom: 12 },
  modalActions: { flexDirection: "row", gap: 10, alignSelf: "stretch", marginTop: 6 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 999, alignItems: "center", backgroundColor: theme.colors.primary },
  modalBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  modalBtnOutline: { flex: 1, paddingVertical: 14, borderRadius: 999, alignItems: "center", borderWidth: 1.5, borderColor: theme.colors.border },
  modalBtnOutlineText: { color: theme.colors.textPrimary, fontWeight: "600", fontSize: 14 },
  askCard: { backgroundColor: theme.colors.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
  askQ: { fontSize: 15, fontWeight: "700", color: theme.colors.textPrimary, lineHeight: 21 },
  askDivider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 12 },
  askDate: { fontSize: 11, color: theme.colors.textDisabled, marginTop: 10 },
});
