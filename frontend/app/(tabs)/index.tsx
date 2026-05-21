import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";
import { theme } from "@/src/lib/theme";

type Category = {
  id: string;
  title: string;
  subtitle: string;
  color: string;
  icon: string;
  subtopics: { id: string; title: string }[];
};

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res: any = await api.getCategories();
      setCats(res.categories);
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greet}>Bună, {user?.name?.split(" ")[0] || "părinte"} 🌿</Text>
            <Text style={styles.subgreet}>Ghidul tău pentru o parentalitate conștientă</Text>
          </View>
        </View>

        <View style={styles.heroCard} testID="home-hero-card">
          <Ionicons name="bulb-outline" size={28} color={theme.colors.primary} />
          <Text style={styles.heroTitle}>Sfatul zilei</Text>
          <Text style={styles.heroText}>
            Conectează-te cu copilul tău înainte de a corecta. Comportamentul este o formă de comunicare.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Categorii</Text>

        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 32 }} />
        ) : (
          cats.map((c, idx) => (
            <TouchableOpacity
              key={c.id}
              testID={`category-card-${idx}`}
              style={[styles.catCard, { borderLeftColor: c.color }]}
              onPress={() => router.push(`/category/${c.id}`)}
              activeOpacity={0.7}
            >
              <View style={[styles.catIcon, { backgroundColor: c.color + "22" }]}>
                <Ionicons name={c.icon as any} size={26} color={c.color} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.catTitle}>{c.title}</Text>
                <Text style={styles.catSubtitle}>{c.subtitle}</Text>
                <Text style={styles.catCount}>{c.subtopics.length} teme</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={theme.colors.textDisabled} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  container: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { paddingTop: 8, paddingBottom: 16 },
  greet: { ...theme.font.h2, color: theme.colors.textPrimary },
  subgreet: { ...theme.font.body, color: theme.colors.textSecondary, marginTop: 4 },
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16, padding: 20, marginVertical: 16,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  heroTitle: { ...theme.font.h3, color: theme.colors.textPrimary, marginTop: 8, marginBottom: 6 },
  heroText: { ...theme.font.body, color: theme.colors.textSecondary },
  sectionTitle: { ...theme.font.h3, color: theme.colors.textPrimary, marginTop: 8, marginBottom: 12 },
  catCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: theme.colors.border,
    borderLeftWidth: 4,
  },
  catIcon: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
  },
  catTitle: { fontSize: 16, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 2 },
  catSubtitle: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },
  catCount: { fontSize: 11, color: theme.colors.primary, marginTop: 4, fontWeight: "500" },
});
