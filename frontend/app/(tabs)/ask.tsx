import { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/lib/api";
import { theme } from "@/src/lib/theme";

type Item = { id: string; question: string; answer: string; created_at: string };

export default function AskScreen() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = async () => {
    try { const r: any = await api.askHistory(); setItems(r.items); } catch {}
  };
  useFocusEffect(useCallback(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, []));

  const send = async () => {
    if (!q.trim()) return;
    setSending(true);
    try {
      await api.ask(q.trim());
      setQ("");
      await load();
    } catch (e: any) { Alert.alert("Eroare", e.message); }
    finally { setSending(false); }
  };

  const remove = async (id: string) => { await api.askDelete(id); await load(); };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Întreabă specialistul</Text>
        <Text style={styles.sub}>AI specializat în copii supradotați și hiperactivi</Text>
      </View>

      <View style={styles.inputBox}>
        <TextInput
          testID="ask-input"
          style={styles.input}
          placeholder="Scrie o întrebare... (ex: Cum gestionez crizele de seară?)"
          placeholderTextColor={theme.colors.textDisabled}
          value={q}
          onChangeText={setQ}
          multiline
          maxLength={500}
        />
        <TouchableOpacity testID="ask-send" style={[styles.sendBtn, (!q.trim() || sending) && { opacity: 0.5 }]} onPress={send} disabled={!q.trim() || sending}>
          {sending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={48} color={theme.colors.textDisabled} />
          <Text style={styles.emptyText}>Nicio întrebare încă. Întreabă orice despre copilul tău — primești răspuns în câteva secunde.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          {items.map((it, i) => (
            <View key={it.id} style={styles.card} testID={`ask-item-${i}`}>
              <View style={styles.qHeader}>
                <Text style={styles.qLabel}>ÎNTREBARE</Text>
                <TouchableOpacity onPress={() => remove(it.id)}><Ionicons name="trash-outline" size={16} color={theme.colors.textDisabled} /></TouchableOpacity>
              </View>
              <Text style={styles.qText}>{it.question}</Text>
              <View style={styles.divider} />
              <View style={styles.aHeader}>
                <Ionicons name="sparkles" size={14} color={theme.colors.primary} />
                <Text style={styles.aLabel}>RĂSPUNS SPECIALIST</Text>
              </View>
              <Text style={styles.aText}>{it.answer}</Text>
              <Text style={styles.date}>{new Date(it.created_at).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" })}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  header: { padding: 20, paddingBottom: 12 },
  title: { ...theme.font.h1, color: theme.colors.textPrimary },
  sub: { ...theme.font.body, color: theme.colors.textSecondary, marginTop: 4 },
  inputBox: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 20, marginBottom: 12 },
  input: { flex: 1, minHeight: 50, maxHeight: 120, backgroundColor: theme.colors.surfaceElevated, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: theme.colors.textPrimary },
  sendBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", marginTop: 40, paddingHorizontal: 32 },
  emptyText: { ...theme.font.body, color: theme.colors.textSecondary, marginTop: 12, textAlign: "center", lineHeight: 22 },
  card: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
  qHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  qLabel: { fontSize: 10, fontWeight: "700", color: theme.colors.textSecondary, letterSpacing: 1 },
  qText: { fontSize: 15, fontWeight: "600", color: theme.colors.textPrimary, lineHeight: 21 },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 12 },
  aHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  aLabel: { fontSize: 10, fontWeight: "700", color: theme.colors.primary, letterSpacing: 1 },
  aText: { fontSize: 14, color: theme.colors.textPrimary, lineHeight: 21 },
  date: { fontSize: 11, color: theme.colors.textDisabled, marginTop: 10 },
});
