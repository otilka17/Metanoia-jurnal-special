import { useState, useCallback, useRef, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, Pressable } from "react-native";
import { Alert } from "@/src/lib/alert";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";
import { theme } from "@/src/lib/theme";
import { Markdown } from "@/src/lib/Markdown";

type Item = { id: string; question: string; answer: string; created_at: string };

export default function AskScreen() {
  const { user, updateUser } = useAuth();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [showRename, setShowRename] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const load = async () => {
    try { const r: any = await api.askHistory(); setItems((r.items || []).slice().reverse()); } catch {}
  };
  useFocusEffect(useCallback(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, []));

  const scrollToEnd = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

  useEffect(() => { if (!loading) scrollToEnd(); }, [loading, items.length, pendingQuestion]);

  const send = async () => {
    const question = q.trim();
    if (!question) return;
    setQ("");
    setPendingQuestion(question);
    setSending(true);
    try {
      await api.ask(question);
      await load();
    } catch (e: any) {
      Alert.alert("Eroare", e.message);
      setQ(question);
    } finally {
      setSending(false);
      setPendingQuestion(null);
    }
  };

  const remove = async (id: string) => { await api.askDelete(id); await load(); };

  const openRename = () => {
    setNameInput(user?.assistant_name || "");
    setShowRename(true);
  };

  const saveName = async () => {
    const name = nameInput.trim();
    if (!name) { Alert.alert("Nume gol", "Scrie un nume pentru asistent."); return; }
    setSavingName(true);
    try {
      const res: any = await api.setAssistantName(name);
      updateUser({ assistant_name: res.assistant_name });
      setShowRename(false);
    } catch (e: any) {
      Alert.alert("Eroare", e.message || "Nu am putut salva numele");
    } finally {
      setSavingName(false);
    }
  };

  const isEmpty = items.length === 0 && !pendingQuestion;
  const assistantLabel = user?.assistant_name || "specialistul";

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Întreabă specialistul</Text>
        <Text style={styles.sub}>AI specializat în copii cu profiluri atipice</Text>
        <Text style={styles.aiNote}>Conținut generat cu AI — nu înlocuiește un consult cu un specialist</Text>
        <TouchableOpacity testID="rename-assistant" onPress={openRename} style={styles.renameRow}>
          <Ionicons name="create-outline" size={14} color={theme.colors.primary} />
          <Text style={styles.renameText}>
            {user?.assistant_name ? `Vorbești cu „${user.assistant_name}” — schimbă numele` : "Dă-i un nume asistentului tău"}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : isEmpty ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={48} color={theme.colors.textDisabled} />
          <Text style={styles.emptyText}>Nicio întrebare încă. Întreabă orice despre copilul tău — primești răspuns în câteva secunde.</Text>
        </View>
      ) : (
        <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, paddingBottom: 12 }}>
          {items.map((it, i) => (
            <View key={it.id}>
              <View style={styles.rowUser}>
                <View style={[styles.bubble, styles.bubbleUser]}>
                  <Text style={styles.bubbleUserText}>{it.question}</Text>
                </View>
                <TouchableOpacity testID={`ask-delete-${i}`} onPress={() => remove(it.id)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={14} color={theme.colors.textDisabled} />
                </TouchableOpacity>
              </View>
              <View style={styles.rowAi}>
                <View style={styles.aiIcon}><Ionicons name="sparkles" size={12} color="#fff" /></View>
                <View style={[styles.bubble, styles.bubbleAi]} testID={`ask-item-${i}`}>
                  <Markdown text={it.answer} />
                </View>
              </View>
              <Text style={styles.date}>{new Date(it.created_at).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" })}</Text>
            </View>
          ))}

          {pendingQuestion && (
            <View>
              <View style={styles.rowUser}>
                <View style={[styles.bubble, styles.bubbleUser]}>
                  <Text style={styles.bubbleUserText}>{pendingQuestion}</Text>
                </View>
              </View>
              <View style={styles.rowAi}>
                <View style={styles.aiIcon}><Ionicons name="sparkles" size={12} color="#fff" /></View>
                <View style={[styles.bubble, styles.bubbleAi, styles.typingBubble]}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.typingText}>{assistantLabel} scrie...</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}

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

      <Modal visible={showRename} transparent animationType="fade" onRequestClose={() => !savingName && setShowRename(false)}>
        <Pressable style={styles.modalBg} onPress={() => !savingName && setShowRename(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalIcon}><Ionicons name="sparkles" size={26} color={theme.colors.primary} /></View>
            <Text style={styles.modalTitle}>Dă-i un nume asistentului</Text>
            <Text style={styles.modalText}>Alege un nume cu care asistentul AI se poate prezenta în conversație — doar tu îl vezi.</Text>
            <TextInput
              testID="assistant-name-input"
              style={styles.modalInput}
              placeholder="Ex: Mira, Tihna, Alma..."
              placeholderTextColor={theme.colors.textDisabled}
              value={nameInput}
              onChangeText={setNameInput}
              maxLength={30}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity testID="rename-cancel" style={styles.modalBtnOutline} onPress={() => setShowRename(false)} disabled={savingName}>
                <Text style={styles.modalBtnOutlineText}>Anulează</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="rename-save" style={[styles.modalBtn, savingName && { opacity: 0.5 }]} onPress={saveName} disabled={savingName}>
                {savingName ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnText}>Salvează</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  header: { padding: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  title: { ...theme.font.h1, color: theme.colors.textPrimary },
  sub: { ...theme.font.body, color: theme.colors.textSecondary, marginTop: 4 },
  aiNote: { fontSize: 11, color: theme.colors.textDisabled, fontStyle: "italic", marginTop: 4 },
  renameRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 },
  renameText: { fontSize: 12, color: theme.colors.primary, fontWeight: "600" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  emptyText: { ...theme.font.body, color: theme.colors.textSecondary, marginTop: 12, textAlign: "center", lineHeight: 22 },
  rowUser: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 6, marginBottom: 6 },
  rowAi: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 2 },
  aiIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center", marginTop: 2 },
  bubble: { maxWidth: "82%", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { backgroundColor: theme.colors.primary, borderBottomRightRadius: 4 },
  bubbleUserText: { color: "#fff", fontSize: 14, lineHeight: 20, fontWeight: "500" },
  bubbleAi: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderBottomLeftRadius: 4, flexShrink: 1 },
  typingBubble: { flexDirection: "row", alignItems: "center", gap: 8 },
  typingText: { fontSize: 13, color: theme.colors.textSecondary, fontStyle: "italic" },
  deleteBtn: { padding: 4 },
  date: { fontSize: 10, color: theme.colors.textDisabled, marginBottom: 16, marginLeft: 30 },
  inputBox: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.bg },
  input: { flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: theme.colors.surfaceElevated, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: theme.colors.textPrimary },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", paddingHorizontal: 28 },
  modalCard: { backgroundColor: theme.colors.surface, borderRadius: 20, padding: 24, alignItems: "center" },
  modalIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primary + "22", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  modalTitle: { ...theme.font.h3, color: theme.colors.textPrimary, marginBottom: 8, textAlign: "center" },
  modalText: { ...theme.font.body, color: theme.colors.textSecondary, textAlign: "center", marginBottom: 16, fontSize: 13 },
  modalInput: { alignSelf: "stretch", backgroundColor: theme.colors.surfaceElevated, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.colors.textPrimary, marginBottom: 16, textAlign: "center" },
  modalActions: { flexDirection: "row", gap: 10, alignSelf: "stretch" },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 999, alignItems: "center", backgroundColor: theme.colors.primary },
  modalBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  modalBtnOutline: { flex: 1, paddingVertical: 14, borderRadius: 999, alignItems: "center", borderWidth: 1.5, borderColor: theme.colors.border },
  modalBtnOutlineText: { color: theme.colors.textPrimary, fontWeight: "600", fontSize: 14 },
});
