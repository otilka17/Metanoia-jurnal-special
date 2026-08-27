import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, FlatList,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/lib/api";
import { theme } from "@/src/lib/theme";

type ForumCat = { id: string; title: string; icon: string; color: string };
type Post = {
  id: string; category: string; title: string; content: string;
  display_name: string; is_anonymous: boolean;
  likes: number; liked_by_me: boolean; flagged_by_me: boolean;
  is_mine: boolean; answer_count: number; created_at: string;
};

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return "acum";
  if (m < 60) return `acum ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `acum ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 30) return `acum ${days} zile`;
  return d.toLocaleDateString("ro-RO", { day: "numeric", month: "short" });
}

export default function ForumScreen() {
  const router = useRouter();
  const [cats, setCats] = useState<ForumCat[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeCat, setActiveCat] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPosts = async (cat: string) => {
    try {
      const res: any = await api.forumListPosts(cat);
      setPosts(res.posts || []);
    } catch (e) { console.warn(e); }
  };

  useEffect(() => {
    (async () => {
      try {
        const c: any = await api.forumCategories();
        setCats(c.categories || []);
        await loadPosts("all");
      } catch (e) { console.warn(e); }
      setLoading(false);
    })();
  }, []);

  // reload when screen gets focus (after creating a new post)
  useFocusEffect(useCallback(() => {
    loadPosts(activeCat);
  }, [activeCat]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts(activeCat);
    setRefreshing(false);
  };

  const changeCat = async (c: string) => {
    setActiveCat(c);
    setLoading(true);
    await loadPosts(c);
    setLoading(false);
  };

  const catColor = (id: string) => cats.find(c => c.id === id)?.color || theme.colors.primary;
  const catTitle = (id: string) => cats.find(c => c.id === id)?.title || id;
  const catIcon = (id: string): any => cats.find(c => c.id === id)?.icon || "chatbubbles";

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: theme.colors.surface }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={26} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Comunitate</Text>
            <Text style={styles.subtitle}>Întreabă și răspunde anonim</Text>
          </View>
          <TouchableOpacity testID="new-post-btn" onPress={() => router.push("/forum/new")} style={styles.newBtn}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.newBtnText}>Întreabă</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
        <TouchableOpacity onPress={() => changeCat("all")} style={[styles.chip, activeCat === "all" && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}>
          <Ionicons name="apps" size={14} color={activeCat === "all" ? "#fff" : theme.colors.textPrimary} />
          <Text style={[styles.chipText, activeCat === "all" && { color: "#fff", fontWeight: "700" }]}>Toate</Text>
        </TouchableOpacity>
        {cats.map(c => (
          <TouchableOpacity key={c.id} testID={`forum-cat-${c.id}`} onPress={() => changeCat(c.id)} style={[styles.chip, activeCat === c.id && { backgroundColor: c.color, borderColor: c.color }]}>
            <Ionicons name={c.icon as any} size={14} color={activeCat === c.id ? "#fff" : c.color} />
            <Text style={[styles.chipText, activeCat === c.id && { color: "#fff", fontWeight: "700" }]}>{c.title}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : posts.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={64} color={theme.colors.textDisabled} />
          <Text style={styles.emptyTitle}>Nicio postare încă</Text>
          <Text style={styles.emptyText}>Fii primul care pune o întrebare în această categorie.</Text>
          <TouchableOpacity onPress={() => router.push("/forum/new")} style={styles.emptyBtn}>
            <Text style={styles.emptyBtnText}>Pune o întrebare</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
          renderItem={({ item }) => (
            <TouchableOpacity testID={`post-${item.id}`} onPress={() => router.push(`/forum/${item.id}`)} style={[styles.card, { borderLeftColor: catColor(item.category) }]} activeOpacity={0.7}>
              <View style={styles.cardHeader}>
                <View style={[styles.catBadge, { backgroundColor: catColor(item.category) + "22" }]}>
                  <Ionicons name={catIcon(item.category)} size={12} color={catColor(item.category)} />
                  <Text style={[styles.catBadgeText, { color: catColor(item.category) }]}>{catTitle(item.category)}</Text>
                </View>
                <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.cardContent} numberOfLines={2}>{item.content}</Text>
              <View style={styles.cardFooter}>
                <View style={styles.author}>
                  <Ionicons name={item.is_anonymous ? "eye-off" : "person-circle"} size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.authorText}>{item.display_name}{item.is_mine ? " (tu)" : ""}</Text>
                </View>
                <View style={styles.stats}>
                  <View style={styles.statItem}>
                    <Ionicons name={item.liked_by_me ? "heart" : "heart-outline"} size={14} color={item.liked_by_me ? "#E94B5B" : theme.colors.textSecondary} />
                    <Text style={styles.statText}>{item.likes}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="chatbubble-outline" size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.statText}>{item.answer_count}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "700", color: theme.colors.textPrimary },
  subtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  newBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, marginRight: 8 },
  newBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  chipsRow: { maxHeight: 56, flexGrow: 0, flexShrink: 0, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  chip: { flexDirection: "row", alignItems: "center", flexShrink: 0, gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.bg },
  chipText: { fontSize: 12, color: theme.colors.textPrimary, fontWeight: "500" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: theme.colors.textPrimary, marginTop: 16 },
  emptyText: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 6, textAlign: "center" },
  emptyBtn: { backgroundColor: theme.colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999, marginTop: 20 },
  emptyBtnText: { color: "#fff", fontWeight: "700" },
  card: { backgroundColor: theme.colors.surface, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border, borderLeftWidth: 4 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  catBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  catBadgeText: { fontSize: 11, fontWeight: "600" },
  time: { fontSize: 11, color: theme.colors.textSecondary },
  cardTitle: { fontSize: 15, fontWeight: "700", color: theme.colors.textPrimary, marginBottom: 4 },
  cardContent: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18, marginBottom: 10 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.border },
  author: { flexDirection: "row", alignItems: "center", gap: 5 },
  authorText: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: "500" },
  stats: { flexDirection: "row", gap: 14 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: "500" },
});
