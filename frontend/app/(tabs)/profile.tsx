import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";
import { theme } from "@/src/lib/theme";

type Bookmark = { id: string; subtopic_id: string; title: string; category_id: string };

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      try {
        const res: any = await api.listBookmarks();
        setBookmarks(res.bookmarks);
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []));

  const onLogout = () => {
    Alert.alert("Deconectare", "Sigur vrei să te deconectezi?", [
      { text: "Anulează", style: "cancel" },
      { text: "Deconectează", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        <Text style={styles.title}>Profil</Text>

        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name || "P")[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        <Text style={styles.sectionTitle}>Articole salvate</Text>

        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 24 }} />
        ) : bookmarks.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="bookmark-outline" size={40} color={theme.colors.textDisabled} />
            <Text style={styles.emptyText}>Niciun articol salvat. Apasă pe iconița bookmark din articole.</Text>
          </View>
        ) : (
          bookmarks.map((b, i) => (
            <TouchableOpacity
              key={b.id}
              testID={`bookmark-${i}`}
              style={styles.bookmarkItem}
              onPress={() => router.push(`/article/${b.subtopic_id}`)}
            >
              <Ionicons name="bookmark" size={18} color={theme.colors.primary} />
              <Text style={styles.bookmarkText}>{b.title}</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textDisabled} />
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity
          testID="logout-button"
          style={styles.logoutBtn}
          onPress={onLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
          <Text style={styles.logoutText}>Deconectare</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  title: { ...theme.font.h1, color: theme.colors.textPrimary, marginTop: 8, marginBottom: 16 },
  userCard: {
    alignItems: "center", backgroundColor: theme.colors.surface,
    borderRadius: 16, padding: 24, marginBottom: 24,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.primary,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "600" },
  name: { ...theme.font.h3, color: theme.colors.textPrimary },
  email: { ...theme.font.body, color: theme.colors.textSecondary, marginTop: 4 },
  sectionTitle: { ...theme.font.h3, color: theme.colors.textPrimary, marginBottom: 12 },
  empty: { alignItems: "center", paddingVertical: 24 },
  emptyText: { ...theme.font.body, color: theme.colors.textSecondary, marginTop: 8, textAlign: "center", paddingHorizontal: 24 },
  bookmarkItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: theme.colors.surface, borderRadius: 12,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  bookmarkText: { flex: 1, fontSize: 14, color: theme.colors.textPrimary },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    marginTop: 32, padding: 16, borderRadius: 999,
    borderWidth: 1.5, borderColor: theme.colors.error,
  },
  logoutText: { color: theme.colors.error, fontSize: 15, fontWeight: "600" },
});
