import { createElement, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking
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
  video_url?: string;
  content: {
    introducere: string;
    puncte_cheie: { titlu: string; explicatie: string }[];
    sfaturi_practice: string[];
    exemplu_situatie: string;
    cand_sa_cer_ajutor: string;
  };
};

function toYoutubeEmbedUrl(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function VideoEmbed({ url }: { url: string }) {
  const embedUrl = toYoutubeEmbedUrl(url);
  if (!embedUrl) return null;
  if (Platform.OS === "web") {
    return (
      <View style={styles.videoWrap}>
        {createElement("iframe", {
          src: embedUrl,
          style: { width: "100%", height: "100%", border: "none" },
          allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
          allowFullScreen: true,
          title: "Videoclip explicativ",
        })}
      </View>
    );
  }
  return (
    <TouchableOpacity style={styles.videoFallbackBtn} onPress={() => Linking.openURL(url)}>
      <Ionicons name="play-circle" size={22} color="#fff" />
      <Text style={styles.videoFallbackText}>Vezi videoclipul explicativ</Text>
    </TouchableOpacity>
  );
}

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

        {!!article.video_url && <VideoEmbed url={article.video_url} />}

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
            <View key={i} style={styles.tipRow}>
              <Text style={[styles.tipBullet, { color: article.color }]}>›</Text>
              <Text style={styles.tipText}>{s}</Text>
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
  videoWrap: { width: "100%", aspectRatio: 16 / 9, borderRadius: 14, overflow: "hidden", backgroundColor: "#000", marginBottom: 24 },
  videoFallbackBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 14, marginBottom: 24 },
  videoFallbackText: { color: "#fff", fontWeight: "700", fontSize: 14 },
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
  tipRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  tipBullet: { fontSize: 20, fontWeight: "700", lineHeight: 20 },
  tipText: { flex: 1, fontSize: 14, color: theme.colors.textPrimary, lineHeight: 20 },
  exampleBox: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 14, padding: 16,
  },
  exampleText: { ...theme.font.body, color: theme.colors.textPrimary, fontStyle: "italic" },
  helpText: { ...theme.font.body, color: theme.colors.textSecondary, marginTop: 4 },
  aiNote: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 28 },
  aiNoteText: { fontSize: 11, color: theme.colors.textDisabled, fontStyle: "italic" },
});
