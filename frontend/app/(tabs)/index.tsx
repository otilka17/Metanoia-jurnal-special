import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";
import { theme } from "@/src/lib/theme";

type Category = { id: string; title: string; subtitle: string; color: string; icon: string; subtopics: { id: string; title: string }[] };

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try { const res: any = await api.getCategories(); setCats(res.categories); } catch (e) { console.warn(e); }
  };
  useEffect(() => { (async () => { await load(); setLoading(false); })(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greet}>Bună, {user?.name?.split(" ")[0] || "părinte"} 🌿</Text>
          <Text style={styles.subgreet}>Ghidul tău pentru o parentalitate conștientă</Text>
        </View>
      </View>

      <TouchableOpacity testID="open-mindmap" style={styles.mmCard} onPress={() => router.push("/(tabs)/mindmap")}>
        <View style={styles.mmIcon}><Ionicons name="git-network" size={24} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.mmTitle}>Vezi Mind Map-ul complet</Text>
          <Text style={styles.mmText}>Schema vizuală a întregului ghid — click-click prin noduri</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#fff" />
      </TouchableOpacity>

      <View style={styles.heroCard}>
        <Ionicons name="bulb-outline" size={28} color={theme.colors.primary} />
        <Text style={styles.heroTitle}>Sfatul zilei</Text>
        <Text style={styles.heroText}>Conectează-te cu copilul tău înainte de a corecta. Comportamentul este o formă de comunicare.</Text>
      </View>

      <Text style={styles.sectionTitle}>Categorii</Text>
      {loading ? <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 32 }} /> : cats.map((c, idx) => (
        <TouchableOpacity key={c.id} testID={`category-card-${idx}`} style={[styles.catCard, { borderLeftColor: c.color }]} onPress={() => router.push(`/category/${c.id}`)} activeOpacity={0.7}>
          <View style={[styles.catIcon, { backgroundColor: c.color + "22" }]}>
            <Ionicons name={c.icon as any} size={26} color={c.color} />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.catTitle}>{c.title}</Text>
            <Text style={styles.catSubtitle}>{c.subtitle}</Text>
            <Text style={[styles.catCount, { color: c.color }]}>{c.subtopics.length} teme</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={theme.colors.textDisabled} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  greet: { ...theme.font.h2, color: theme.colors.textPrimary },
  subgreet: { ...theme.font.body, color: theme.colors.textSecondary, marginTop: 4 },
  mmCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: theme.colors.primary, borderRadius: 16, padding: 16, marginBottom: 16 },
  mmIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  mmTitle: { color: "#fff", fontWeight: "700", fontSize: 15 },
  mmText: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },
  heroCard: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: theme.colors.border },
  heroTitle: { ...theme.font.h3, color: theme.colors.textPrimary, marginTop: 8, marginBottom: 6 },
  heroText: { ...theme.font.body, color: theme.colors.textSecondary },
  sectionTitle: { ...theme.font.h3, color: theme.colors.textPrimary, marginTop: 4, marginBottom: 12 },
  catCard: { flexDirection: "row", alignItems: "center", backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border, borderLeftWidth: 4 },
  catIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  catTitle: { fontSize: 16, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 2 },
  catSubtitle: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },
  catCount: { fontSize: 11, marginTop: 4, fontWeight: "500" },
});
