import { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/lib/api";
import { theme } from "@/src/lib/theme";

type Result = {
  type: "category" | "subtopic";
  category_id: string;
  subtopic_id?: string;
  title: string;
  subtitle?: string;
  category_title?: string;
  color: string;
};

export default function SearchScreen() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const onSearch = async () => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res: any = await api.search(q.trim());
      setResults(res.results);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const openResult = (r: Result) => {
    if (r.type === "subtopic" && r.subtopic_id) {
      router.push(`/article/${r.subtopic_id}`);
    } else {
      router.push(`/category/${r.category_id}`);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Căutare</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            testID="search-input"
            style={styles.input}
            placeholder="Caută teme, sfaturi, situații..."
            placeholderTextColor={theme.colors.textDisabled}
            value={q}
            onChangeText={setQ}
            onSubmitEditing={onSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {q.length > 0 && (
            <TouchableOpacity onPress={() => { setQ(""); setResults([]); setSearched(false); }}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textDisabled} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {loading && <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 24 }} />}

          {!loading && searched && results.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="leaf-outline" size={48} color={theme.colors.textDisabled} />
              <Text style={styles.emptyText}>Niciun rezultat. Încearcă alte cuvinte cheie.</Text>
            </View>
          )}

          {!loading && !searched && (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={48} color={theme.colors.textDisabled} />
              <Text style={styles.emptyText}>Introdu un cuvânt cheie pentru a căuta prin ghid.</Text>
              <View style={styles.suggestRow}>
                {["meltdown", "rutină", "emoții", "școală", "limite"].map((s) => (
                  <TouchableOpacity
                    key={s}
                    testID={`suggest-${s}`}
                    style={styles.suggestChip}
                    onPress={() => { setQ(s); }}
                  >
                    <Text style={styles.suggestText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {results.map((r, i) => (
            <TouchableOpacity
              key={`${r.type}-${i}`}
              testID={`search-result-${i}`}
              style={[styles.result, { borderLeftColor: r.color }]}
              onPress={() => openResult(r)}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.resultBadge}>
                  {r.type === "category" ? "CATEGORIE" : r.category_title?.toUpperCase()}
                </Text>
                <Text style={styles.resultTitle}>{r.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textDisabled} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  container: { flex: 1, paddingHorizontal: 20 },
  title: { ...theme.font.h1, color: theme.colors.textPrimary, marginTop: 8, marginBottom: 16 },
  searchBox: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    gap: 10, marginBottom: 16,
  },
  input: { flex: 1, fontSize: 15, color: theme.colors.textPrimary },
  empty: { alignItems: "center", marginTop: 40, paddingHorizontal: 16 },
  emptyText: { ...theme.font.body, color: theme.colors.textSecondary, marginTop: 12, textAlign: "center" },
  suggestRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 16 },
  suggestChip: {
    backgroundColor: theme.colors.surface, borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  suggestText: { fontSize: 13, color: theme.colors.textPrimary },
  result: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: theme.colors.surface, padding: 16,
    borderRadius: 12, marginBottom: 10,
    borderWidth: 1, borderColor: theme.colors.border,
    borderLeftWidth: 4,
  },
  resultBadge: { fontSize: 10, fontWeight: "600", color: theme.colors.textSecondary, letterSpacing: 1, marginBottom: 4 },
  resultTitle: { fontSize: 15, fontWeight: "500", color: theme.colors.textPrimary },
});
