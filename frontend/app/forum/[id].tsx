import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform, RefreshControl, Modal, Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Alert } from "@/src/lib/alert";
import { api } from "@/src/lib/api";
import { theme } from "@/src/lib/theme";

type Post = {
  id: string; category: string; title: string; content: string;
  display_name: string; is_anonymous: boolean;
  likes: number; liked_by_me: boolean; flagged_by_me: boolean;
  is_mine: boolean; answer_count: number; created_at: string;
};
type Answer = {
  id: string; content: string; display_name: string; is_anonymous: boolean;
  likes: number; liked_by_me: boolean; flagged_by_me: boolean;
  is_mine: boolean; created_at: string;
};
type ForumCat = { id: string; title: string; icon: string; color: string };

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

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [cats, setCats] = useState<ForumCat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reply, setReply] = useState("");
  const [replyAnon, setReplyAnon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pseudonym, setPseudonym] = useState("");
  const [menuTarget, setMenuTarget] = useState<{ type: "post" | "answer"; id: string; isMine: boolean; flagged: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const res: any = await api.forumGetPost(id);
      setPost(res.post);
      setAnswers(res.answers || []);
    } catch (e: any) {
      Alert.alert("Eroare", e.message || "Postare inexistentă");
      router.back();
    }
  }, [id, router]);

  useEffect(() => {
    (async () => {
      try {
        const [c, me]: any = await Promise.all([api.forumCategories(), api.forumMe()]);
        setCats(c.categories || []);
        setPseudonym(me.pseudonym || "");
        await load();
      } catch (e) { console.warn(e); }
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const cat = cats.find(c => c.id === post?.category);
  const catColor = cat?.color || theme.colors.primary;

  const togglePostLike = async () => {
    if (!post) return;
    // Optimistic
    setPost({ ...post, liked_by_me: !post.liked_by_me, likes: post.likes + (post.liked_by_me ? -1 : 1) });
    try { await api.forumLikePost(post.id); } catch (e) { load(); }
  };

  const toggleAnswerLike = async (a: Answer) => {
    setAnswers(prev => prev.map(x => x.id === a.id ? { ...x, liked_by_me: !x.liked_by_me, likes: x.likes + (x.liked_by_me ? -1 : 1) } : x));
    try { await api.forumLikeAnswer(a.id); } catch (e) { load(); }
  };

  const submitReply = async () => {
    if (reply.trim().length < 3) {
      Alert.alert("Răspuns prea scurt", "Te rog scrie minim 3 caractere.");
      return;
    }
    setSubmitting(true);
    try {
      await api.forumCreateAnswer(id, reply.trim(), replyAnon);
      setReply("");
      setReplyAnon(false);
      await load();
    } catch (e: any) {
      Alert.alert("Eroare", e.message || "Nu am putut publica răspunsul");
    } finally {
      setSubmitting(false);
    }
  };

  const flagItem = async () => {
    if (!menuTarget) return;
    try {
      if (menuTarget.type === "post") await api.forumFlagPost(menuTarget.id);
      else await api.forumFlagAnswer(menuTarget.id);
      Alert.alert("Mulțumim", "Conținutul a fost raportat și va fi revizuit.");
      setMenuTarget(null);
      await load();
    } catch (e: any) {
      Alert.alert("Eroare", e.message || "Eroare la raportare");
    }
  };

  const deleteItem = async () => {
    if (!menuTarget) return;
    Alert.alert("Ștergere", "Sigur vrei să ștergi?", [
      { text: "Anulează", style: "cancel" },
      {
        text: "Șterge", style: "destructive", onPress: async () => {
          try {
            if (menuTarget.type === "post") {
              await api.forumDeletePost(menuTarget.id);
              router.back();
            } else {
              await api.forumDeleteAnswer(menuTarget.id);
              setMenuTarget(null);
              await load();
            }
          } catch (e: any) {
            Alert.alert("Eroare", e.message || "Eroare la ștergere");
          }
        },
      },
    ]);
  };

  if (loading || !post) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: theme.colors.surface }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={26} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Discuție</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {/* Post */}
        <View style={[styles.postCard, { borderLeftColor: catColor }]}>
          <View style={styles.postHeader}>
            <View style={[styles.catBadge, { backgroundColor: catColor + "22" }]}>
              <Ionicons name={(cat?.icon || "chatbubbles") as any} size={12} color={catColor} />
              <Text style={[styles.catBadgeText, { color: catColor }]}>{cat?.title || post.category}</Text>
            </View>
            <TouchableOpacity onPress={() => setMenuTarget({ type: "post", id: post.id, isMine: post.is_mine, flagged: post.flagged_by_me })} style={styles.iconBtn}>
              <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.postTitle}>{post.title}</Text>
          <Text style={styles.postContent}>{post.content}</Text>
          <View style={styles.postFooter}>
            <View style={styles.author}>
              <Ionicons name={post.is_anonymous ? "eye-off" : "person-circle"} size={16} color={theme.colors.textSecondary} />
              <Text style={styles.authorText}>{post.display_name}{post.is_mine ? " (tu)" : ""}</Text>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.timeText}>{timeAgo(post.created_at)}</Text>
            </View>
            <TouchableOpacity testID="like-post" onPress={togglePostLike} style={styles.likeBtn}>
              <Ionicons name={post.liked_by_me ? "heart" : "heart-outline"} size={18} color={post.liked_by_me ? "#E94B5B" : theme.colors.textSecondary} />
              <Text style={[styles.likeText, post.liked_by_me && { color: "#E94B5B", fontWeight: "700" }]}>{post.likes}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Answers section */}
        <View style={styles.answersHeader}>
          <Ionicons name="chatbubbles" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.answersTitle}>{answers.length} {answers.length === 1 ? "răspuns" : "răspunsuri"}</Text>
        </View>

        {answers.length === 0 ? (
          <View style={styles.emptyAns}>
            <Text style={styles.emptyAnsText}>Niciun răspuns încă. Fii primul!</Text>
          </View>
        ) : answers.map(a => (
          <View key={a.id} style={styles.answerCard}>
            <View style={styles.ansHeader}>
              <View style={styles.author}>
                <Ionicons name={a.is_anonymous ? "eye-off" : "person-circle"} size={16} color={theme.colors.textSecondary} />
                <Text style={styles.authorText}>{a.display_name}{a.is_mine ? " (tu)" : ""}</Text>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.timeText}>{timeAgo(a.created_at)}</Text>
              </View>
              <TouchableOpacity onPress={() => setMenuTarget({ type: "answer", id: a.id, isMine: a.is_mine, flagged: a.flagged_by_me })} style={styles.iconBtnSm}>
                <Ionicons name="ellipsis-horizontal" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.ansContent}>{a.content}</Text>
            <TouchableOpacity testID={`like-ans-${a.id}`} onPress={() => toggleAnswerLike(a)} style={styles.likeBtnSm}>
              <Ionicons name={a.liked_by_me ? "heart" : "heart-outline"} size={16} color={a.liked_by_me ? "#E94B5B" : theme.colors.textSecondary} />
              <Text style={[styles.likeText, a.liked_by_me && { color: "#E94B5B", fontWeight: "700" }]}>{a.likes}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Reply composer */}
      <View style={styles.composer}>
        <View style={styles.composerTop}>
          <TouchableOpacity testID="reply-anon-toggle" onPress={() => setReplyAnon(v => !v)} style={styles.anonToggle}>
            <Ionicons name={replyAnon ? "eye-off" : "person-circle"} size={16} color={theme.colors.primary} />
            <Text style={styles.anonToggleText}>
              {replyAnon ? "Anonim" : (pseudonym || "Pseudonim")}
            </Text>
            <Ionicons name="swap-horizontal" size={12} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.composerRow}>
          <TextInput
            testID="reply-input"
            value={reply}
            onChangeText={setReply}
            placeholder="Scrie un răspuns..."
            placeholderTextColor={theme.colors.textDisabled}
            multiline
            maxLength={3000}
            style={styles.replyInput}
          />
          <TouchableOpacity testID="send-reply" onPress={submitReply} disabled={submitting || reply.trim().length < 3} style={[styles.sendBtn, (submitting || reply.trim().length < 3) && { opacity: 0.4 }]}>
            {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Action menu modal */}
      <Modal visible={!!menuTarget} transparent animationType="fade" onRequestClose={() => setMenuTarget(null)}>
        <Pressable style={styles.menuBg} onPress={() => setMenuTarget(null)}>
          <Pressable style={styles.menuBox} onPress={(e) => e.stopPropagation()}>
            {menuTarget?.isMine ? (
              <TouchableOpacity onPress={deleteItem} style={styles.menuItem}>
                <Ionicons name="trash" size={20} color="#B56B6B" />
                <Text style={[styles.menuItemText, { color: "#B56B6B" }]}>Șterge</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={flagItem} style={styles.menuItem} disabled={menuTarget?.flagged}>
                <Ionicons name="flag" size={20} color={menuTarget?.flagged ? theme.colors.textDisabled : "#DE8F6E"} />
                <Text style={[styles.menuItemText, { color: menuTarget?.flagged ? theme.colors.textDisabled : "#DE8F6E" }]}>
                  {menuTarget?.flagged ? "Deja raportat" : "Raportează conținut"}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setMenuTarget(null)} style={styles.menuItem}>
              <Ionicons name="close" size={20} color={theme.colors.textPrimary} />
              <Text style={styles.menuItemText}>Anulează</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  iconBtnSm: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: theme.colors.textPrimary, textAlign: "center" },
  postCard: { backgroundColor: theme.colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.colors.border, borderLeftWidth: 4 },
  postHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  catBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  catBadgeText: { fontSize: 11, fontWeight: "600" },
  postTitle: { fontSize: 18, fontWeight: "700", color: theme.colors.textPrimary, marginBottom: 10, lineHeight: 24 },
  postContent: { fontSize: 14, color: theme.colors.textPrimary, lineHeight: 21, marginBottom: 14 },
  postFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border },
  author: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1 },
  authorText: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: "500" },
  dot: { color: theme.colors.textDisabled, fontSize: 12, marginHorizontal: 2 },
  timeText: { fontSize: 11, color: theme.colors.textSecondary },
  likeBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: theme.colors.bg },
  likeBtnSm: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: theme.colors.bg, alignSelf: "flex-start", marginTop: 8 },
  likeText: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: "600" },
  answersHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 24, marginBottom: 12, paddingHorizontal: 4 },
  answersTitle: { fontSize: 14, fontWeight: "700", color: theme.colors.textSecondary, letterSpacing: 0.3 },
  emptyAns: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 24, borderWidth: 1, borderColor: theme.colors.border, alignItems: "center" },
  emptyAnsText: { fontSize: 13, color: theme.colors.textSecondary },
  answerCard: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.border },
  ansHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  ansContent: { fontSize: 14, color: theme.colors.textPrimary, lineHeight: 20 },
  composer: { borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface, paddingHorizontal: 12, paddingTop: 8, paddingBottom: Platform.OS === "ios" ? 8 : 12 },
  composerTop: { flexDirection: "row", marginBottom: 6 },
  anonToggle: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: theme.colors.primary + "11" },
  anonToggleText: { fontSize: 11, color: theme.colors.primary, fontWeight: "700" },
  composerRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  replyInput: { flex: 1, backgroundColor: theme.colors.bg, borderRadius: 18, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, fontSize: 14, color: theme.colors.textPrimary, maxHeight: 120, borderWidth: 1, borderColor: theme.colors.border },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  menuBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  menuBox: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 8, paddingBottom: 32 },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 16, borderRadius: 12 },
  menuItemText: { fontSize: 15, color: theme.colors.textPrimary, fontWeight: "500" },
});
