import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/lib/api";
import { theme } from "@/src/lib/theme";

type Cat = {
  id: string; title: string; subtitle: string; color: string; icon: string;
  subtopics: { id: string; title: string; points: string[] }[];
};

export default function CategoryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [cat, setCat] = useState<Cat | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await api.getCategory(id);
        setCat(res);
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading || !cat) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} testID="category-back-button" style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={[styles.banner, { backgroundColor: cat.color + "22" }]}>
          <View style={[styles.iconCircle, { backgroundColor: cat.color }]}>
            <Ionicons name={cat.icon as any} size={28} color="#fff" />
          </View>
          <Text style={[styles.title, { color: cat.color }]}>{cat.title}</Text>
          <Text style={styles.subtitle}>{cat.subtitle}</Text>
        </View>

        <View style={{ padding: 20 }}>
          <Text style={styles.sectionTitle}>Teme</Text>
          {cat.subtopics.map((s, i) => (
            <TouchableOpacity
              key={s.id}
              testID={`subtopic-${i}`}
              style={styles.subCard}
              onPress={() => router.push(`/article/${s.id}`)}
              activeOpacity={0.7}
            >
              <View style={[styles.subBullet, { backgroundColor: cat.color }]}>
                <Text style={styles.subBulletText}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.subTitle}>{s.title}</Text>
                <Text style={styles.subPoints}>{s.points.join(" • ")}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textDisabled} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { paddingHorizontal: 12, paddingVertical: 8 },
  backBtn: { padding: 8, alignSelf: "flex-start" },
  banner: { marginHorizontal: 20, padding: 24, borderRadius: 20 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  title: { ...theme.font.h2, marginBottom: 6 },
  subtitle: { ...theme.font.body, color: theme.colors.textSecondary },
  sectionTitle: { ...theme.font.h3, color: theme.colors.textPrimary, marginBottom: 12 },
  subCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: theme.colors.surface, padding: 16,
    borderRadius: 14, marginBottom: 10,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  subBullet: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  subBulletText: { color: "#fff", fontWeight: "600" },
  subTitle: { fontSize: 15, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 2 },
  subPoints: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 16 },
});
