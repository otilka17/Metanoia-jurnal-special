import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/lib/api";
import { theme, moods } from "@/src/lib/theme";

type Entry = {
  id: string;
  title: string;
  note: string;
  mood: string;
  triggers: string;
  created_at: string;
};

export default function JournalScreen() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [mood, setMood] = useState("calm");
  const [triggers, setTriggers] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res: any = await api.listJournal();
      setEntries(res.entries);
    } catch (e) {
      console.warn(e);
    }
  };

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, []));

  const submit = async () => {
    if (!title.trim() || !note.trim()) {
      Alert.alert("Atenție", "Completează titlul și nota.");
      return;
    }
    setSaving(true);
    try {
      await api.createJournal({ title: title.trim(), note: note.trim(), mood, triggers: triggers.trim() });
      setTitle(""); setNote(""); setMood("calm"); setTriggers("");
      setShowForm(false);
      await load();
    } catch (e: any) {
      Alert.alert("Eroare", e.message);
    } finally {
      setSaving(false);
    }
  };

  const removeEntry = (id: string) => {
    Alert.alert("Șterge", "Sigur ștergi această însemnare?", [
      { text: "Anulează", style: "cancel" },
      {
        text: "Șterge", style: "destructive", onPress: async () => {
          await api.deleteJournal(id);
          await load();
        }
      },
    ]);
  };

  const getMood = (key: string) => moods.find((m) => m.key === key) || moods[0];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Jurnal Părinte</Text>
          <Text style={styles.subtitle}>Notițe despre comportament și emoții</Text>
        </View>
        <TouchableOpacity
          testID="open-journal-form-button"
          style={styles.fab}
          onPress={() => setShowForm(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : entries.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="book-outline" size={56} color={theme.colors.textDisabled} />
          <Text style={styles.emptyTitle}>Nicio însemnare încă</Text>
          <Text style={styles.emptyText}>
            Notează observațiile despre comportamentul copilului pentru a identifica tipare.
          </Text>
          <TouchableOpacity
            testID="empty-add-button"
            style={styles.primaryBtn}
            onPress={() => setShowForm(true)}
          >
            <Text style={styles.primaryBtnText}>Adaugă prima însemnare</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          {entries.map((e, idx) => {
            const m = getMood(e.mood);
            return (
              <View key={e.id} style={styles.entry} testID={`journal-entry-${idx}`}>
                <View style={styles.entryHeader}>
                  <View style={[styles.moodBadge, { backgroundColor: m.color + "22" }]}>
                    <Text style={{ fontSize: 16 }}>{m.emoji}</Text>
                    <Text style={[styles.moodText, { color: m.color }]}>{m.label}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeEntry(e.id)} testID={`delete-entry-${idx}`}>
                    <Ionicons name="trash-outline" size={18} color={theme.colors.textDisabled} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.entryTitle}>{e.title}</Text>
                <Text style={styles.entryNote}>{e.note}</Text>
                {!!e.triggers && (
                  <View style={styles.triggersBox}>
                    <Text style={styles.triggersLabel}>Declanșatori</Text>
                    <Text style={styles.triggersText}>{e.triggers}</Text>
                  </View>
                )}
                <Text style={styles.entryDate}>
                  {new Date(e.created_at).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" })}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      <Modal visible={showForm} animationType="slide" onRequestClose={() => setShowForm(false)}>
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowForm(false)} testID="close-journal-form">
                <Ionicons name="close" size={26} color={theme.colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Însemnare nouă</Text>
              <View style={{ width: 26 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>STARE</Text>
              <View style={styles.moodRow}>
                {moods.map((m) => (
                  <TouchableOpacity
                    key={m.key}
                    testID={`mood-${m.key}`}
                    style={[
                      styles.moodOption,
                      { borderColor: m.color },
                      mood === m.key && { backgroundColor: m.color + "22" },
                    ]}
                    onPress={() => setMood(m.key)}
                  >
                    <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
                    <Text style={[styles.moodLabel, mood === m.key && { color: m.color, fontWeight: "600" }]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>TITLU</Text>
              <TextInput
                testID="journal-title-input"
                style={styles.input}
                placeholder="Ex: Criză înainte de școală"
                placeholderTextColor={theme.colors.textDisabled}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.label}>NOTĂ</Text>
              <TextInput
                testID="journal-note-input"
                style={[styles.input, { minHeight: 120, textAlignVertical: "top" }]}
                placeholder="Descrie situația și reacțiile..."
                placeholderTextColor={theme.colors.textDisabled}
                multiline
                value={note}
                onChangeText={setNote}
              />

              <Text style={styles.label}>DECLANȘATORI (OPȚIONAL)</Text>
              <TextInput
                testID="journal-triggers-input"
                style={styles.input}
                placeholder="Foame, oboseală, zgomot..."
                placeholderTextColor={theme.colors.textDisabled}
                value={triggers}
                onChangeText={setTriggers}
              />

              <TouchableOpacity
                testID="save-journal-button"
                style={[styles.primaryBtn, { marginTop: 24 }, saving && { opacity: 0.6 }]}
                onPress={submit}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Salvează</Text>}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  title: { ...theme.font.h1, color: theme.colors.textPrimary },
  subtitle: { ...theme.font.body, color: theme.colors.textSecondary, marginTop: 4 },
  fab: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: theme.colors.primary,
    alignItems: "center", justifyContent: "center",
    shadowColor: theme.colors.primary, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  empty: { alignItems: "center", marginTop: 60, paddingHorizontal: 32 },
  emptyTitle: { ...theme.font.h3, color: theme.colors.textPrimary, marginTop: 16 },
  emptyText: { ...theme.font.body, color: theme.colors.textSecondary, marginTop: 8, textAlign: "center" },
  primaryBtn: {
    backgroundColor: theme.colors.primary, borderRadius: 999,
    paddingVertical: 14, paddingHorizontal: 24, marginTop: 24, alignSelf: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  entry: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  entryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  moodBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  moodText: { fontSize: 12, fontWeight: "600" },
  entryTitle: { fontSize: 16, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 4 },
  entryNote: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20 },
  triggersBox: { backgroundColor: theme.colors.surfaceElevated, borderRadius: 8, padding: 10, marginTop: 8 },
  triggersLabel: { fontSize: 10, fontWeight: "600", color: theme.colors.textSecondary, letterSpacing: 1, marginBottom: 2 },
  triggersText: { fontSize: 13, color: theme.colors.textPrimary },
  entryDate: { fontSize: 11, color: theme.colors.textDisabled, marginTop: 8 },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  modalTitle: { ...theme.font.h3, color: theme.colors.textPrimary },
  label: { ...theme.font.label, color: theme.colors.textSecondary, marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: theme.colors.surfaceElevated, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14, fontSize: 15,
    color: theme.colors.textPrimary,
  },
  moodRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  moodOption: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999,
    borderWidth: 1.5, backgroundColor: theme.colors.surface,
  },
  moodLabel: { fontSize: 13, color: theme.colors.textPrimary },
});
