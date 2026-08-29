import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from "react-native";
import { Alert } from "@/src/lib/alert";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/lib/api";
import { theme } from "@/src/lib/theme";

type Article = {
  id: string;
  title: string;
  category_title: string;
  category_id: string;
  color: string;
  content: {
    introducere: string;
    puncte_cheie: { titlu: string; explicatie: string }[];
    sfaturi_practice: string[];
    exemplu_situatie: string;
    cand_sa_cer_ajutor: string;
  };
};

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res: any = await api.getArticle(id);
      setArticle(res);
      const bm: any = await api.listBookmarks();
      setBookmarked(!!bm.bookmarks.find((b: any) => b.subtopic_id === id));
    } catch (e: any) {
      setError(e.message || "Eroare la încărcare");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const toggleBookmark = async () => {
    if (!article) return;
    try {
      if (bookmarked) {
        await api.removeBookmark(id);
        setBookmarked(false);
      } else {
        await api.addBookmark({ subtopic_id: id, title: article.title, category_id: article.category_id });
        setBookmarked(true);
      }
    } catch (e: any) {
      Alert.alert("Eroare", e.message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Generăm articolul cu AI...</Text>
          <Text style={styles.loadingSub}>Aceasta poate dura câteva secunde la prima accesare.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !article) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.colors.textDisabled} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Încearcă din nou</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
            <Text style={{ color: theme.colors.textSecondary }}>Înapoi</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const c = article.content;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} testID="article-back-button" style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleBookmark} testID="bookmark-button" style={styles.iconBtn}>
          <Ionicons
            name={bookmarked ? "bookmark" : "bookmark-outline"}
            size={24}
            color={bookmarked ? theme.colors.primary : theme.colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.badge, { color: article.color }]}>{article.category_title.toUpperCase()}</Text>
        <Text style={styles.title} testID="article-title">{article.title}</Text>

        <View style={[styles.colorBar, { backgroundColor: article.color }]} />

        <Text style={styles.intro}>{c.introducere}</Text>

        <Text style={styles.sectionTitle}>Puncte Cheie</Text>
        {c.puncte_cheie?.map((p, i) => (
          <View key={i} style={styles.pointRow}>
            <View style={[styles.pointDot, { backgroundColor: article.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.pointTitle}>{p.titlu}</Text>
              <Text style={styles.pointText}>{p.explicatie}</Text>
            </View>
          </View>
        ))}

        <View style={[styles.tipsBox, { borderColor: article.color }]}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb" size={20} color={article.color} />
            <Text style={[styles.tipsTitle, { color: article.color }]}>Sfaturi Practice</Text>
          </View>
          {c.sfaturi_practice?.map((s, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepBadgeCol}>
                <View style={[styles.stepBadge, { backgroundColor: article.color }]}>
                  <Text style={styles.stepBadgeText}>{i + 1}</Text>
                </View>
                {i < c.sfaturi_practice.length - 1 && <View style={[styles.stepLine, { backgroundColor: article.color + "33" }]} />}
              </View>
              <Text style={styles.stepText}>{s}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Exemplu de Situație</Text>
        <View style={styles.exampleBox}>
          <Text style={styles.exampleText}>{c.exemplu_situatie}</Text>
        </View>

        <Text style={styles.sectionTitle}>Când să ceri ajutor</Text>
        <Text style={styles.helpText}>{c.cand_sa_cer_ajutor}</Text>

        <View style={styles.aiNote}>
          <Ionicons name="sparkles" size={13} color={theme.colors.textDisabled} />
          <Text style={styles.aiNoteText}>Conținut generat cu AI, supervizat de specialiști.</Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  loadingText: { ...theme.font.body, color: theme.colors.textPrimary, marginTop: 16, fontWeight: "500" },
  loadingSub: { ...theme.font.body, color: theme.colors.textSecondary, marginTop: 8, textAlign: "center" },
  errorText: { ...theme.font.body, color: theme.colors.textSecondary, marginTop: 16, textAlign: "center" },
  retryBtn: { marginTop: 16, backgroundColor: theme.colors.primary, borderRadius: 999, paddingHorizontal: 24, paddingVertical: 12 },
  retryText: { color: "#fff", fontWeight: "600" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 8,
  },
  iconBtn: { padding: 8 },
  container: { paddingHorizontal: 24, paddingBottom: 40 },
  badge: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2, marginBottom: 8 },
  title: { ...theme.font.h1, color: theme.colors.textPrimary, marginBottom: 16 },
  colorBar: { height: 4, width: 60, borderRadius: 2, marginBottom: 20 },
  intro: { ...theme.font.bodyL, color: theme.colors.textPrimary, marginBottom: 24 },
  sectionTitle: { ...theme.font.h3, color: theme.colors.textPrimary, marginTop: 24, marginBottom: 12 },
  pointRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  pointDot: { width: 8, height: 8, borderRadius: 4, marginTop: 8 },
  pointTitle: { fontSize: 15, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 4 },
  pointText: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20 },
  tipsBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16, padding: 16, marginTop: 24,
    borderWidth: 1.5,
  },
  tipsHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  tipsTitle: { fontSize: 16, fontWeight: "600" },
  stepRow: { flexDirection: "row", gap: 12 },
  stepBadgeCol: { alignItems: "center", width: 28 },
  stepBadge: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  stepBadgeText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  stepLine: { width: 2, flex: 1, marginVertical: 4, minHeight: 14 },
  stepText: { flex: 1, fontSize: 14, color: theme.colors.textPrimary, lineHeight: 20, paddingBottom: 16 },
  exampleBox: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 14, padding: 16,
  },
  exampleText: { ...theme.font.body, color: theme.colors.textPrimary, fontStyle: "italic" },
  helpText: { ...theme.font.body, color: theme.colors.textSecondary, marginTop: 4 },
  aiNote: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 28 },
  aiNoteText: { fontSize: 11, color: theme.colors.textDisabled, fontStyle: "italic" },
});
