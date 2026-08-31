import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/lib/api";
import { theme } from "@/src/lib/theme";

type Sub = { id: string; title: string; points: string[] };
type Cat = { id: string; title: string; subtitle: string; color: string; icon: string; subtopics: Sub[] };

export default function ExercisesScreen() {
  const router = useRouter();
  const [cat, setCat] = useState<Cat | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await api.getCategory("cat-6");
        setCat(res);
      } catch (e) { console.warn(e); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: theme.colors.surface }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={26} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Exerciții</Text>
            <Text style={styles.subtitle}>Pași concreți, de exersat acasă cu copilul</Text>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.disclaimer}>
        <Ionicons name="information-circle-outline" size={16} color={theme.colors.textSecondary} />
        <Text style={styles.disclaimerText}>
          Această aplicație nu oferă terapie (ABA, logopedie, kinetoterapie etc.), evaluare clinică sau
          diagnostic medical și nu înlocuiește echipa multidisciplinară de specialiști care monitorizează
          copilul tău.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {cat?.subtopics.map((s) => (
            <TouchableOpacity
              key={s.id}
              testID={`exercise-${s.id}`}
              style={styles.card}
              onPress={() => router.push(`/article/${s.id}` as any)}
            >
              <View style={[styles.iconWrap, { backgroundColor: cat.color + "22" }]}>
                <Ionicons name="body" size={26} color={cat.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{s.title}</Text>
                <Text style={styles.cardDesc}>{s.points[0]}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textDisabled} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "700", color: theme.colors.textPrimary },
  subtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  disclaimer: { flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: theme.colors.surfaceElevated, marginHorizontal: 20, marginTop: 16, padding: 12, borderRadius: 12 },
  disclaimerText: { flex: 1, fontSize: 11.5, color: theme.colors.textSecondary, lineHeight: 16, fontStyle: "italic" },
  card: { flexDirection: "row", gap: 14, alignItems: "center", backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: theme.colors.border },
  iconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 16, fontWeight: "700", color: theme.colors.textPrimary },
  cardDesc: { fontSize: 12.5, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 17 },
});
