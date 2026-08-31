import { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/lib/api";
import { theme } from "@/src/lib/theme";

type Conversation = { user_id: string; name: string; last_message: string; last_at: string; unread_count: number };

export default function MessagesInboxScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res: any = await api.listConversations();
      setConversations(res.conversations || []);
    } catch (e) { console.warn(e); }
  };

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [])
  );

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const contactSupport = async () => {
    try {
      const admin: any = await api.supportContact();
      router.push(`/messages/${admin.id}` as any);
    } catch (e: any) {
      console.warn(e);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: theme.colors.surface }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={26} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Mesaje</Text>
          <TouchableOpacity testID="contact-support-btn" onPress={contactSupport} style={styles.iconBtn}>
            <Ionicons name="headset-outline" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        >
          {conversations.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="mail-outline" size={40} color={theme.colors.textDisabled} />
              <Text style={styles.emptyText}>Nicio conversație încă.</Text>
              <TouchableOpacity testID="empty-contact-support-btn" style={styles.supportBtn} onPress={contactSupport}>
                <Text style={styles.supportBtnText}>Contactează echipa</Text>
              </TouchableOpacity>
            </View>
          ) : conversations.map((c) => (
            <TouchableOpacity
              key={c.user_id}
              testID={`conversation-${c.user_id}`}
              style={styles.row}
              onPress={() => router.push(`/messages/${c.user_id}` as any)}
            >
              <View style={styles.avatar}>
                <Ionicons name="person" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{c.name}</Text>
                <Text style={styles.rowPreview} numberOfLines={1}>{c.last_message}</Text>
              </View>
              {c.unread_count > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{c.unread_count}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "700", color: theme.colors.textPrimary },
  empty: { alignItems: "center", marginTop: 60, gap: 12 },
  emptyText: { fontSize: 14, color: theme.colors.textSecondary },
  supportBtn: { backgroundColor: theme.colors.primary, borderRadius: 999, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  supportBtnText: { color: "#fff", fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.border },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  rowName: { fontSize: 15, fontWeight: "700", color: theme.colors.textPrimary },
  rowPreview: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  unreadBadge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: theme.colors.error, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  unreadBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
