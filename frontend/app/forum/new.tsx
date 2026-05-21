import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/lib/api";
import { theme } from "@/src/lib/theme";

type ForumCat = { id: string; title: string; icon: string; color: string };

export default function NewPostScreen() {
  const router = useRouter();
  const [cats, setCats] = useState<ForumCat[]>([]);
  const [category, setCategory] = useState<string>("general");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [pseudonym, setPseudonym] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [c, me]: any = await Promise.all([api.forumCategories(), api.forumMe()]);
        setCats(c.categories || []);
        setPseudonym(me.pseudonym || "");
      } catch (e) { console.warn(e); }
    })();
  }, []);

  const submit = async () => {
    if (title.trim().length < 5) {
      Alert.alert("Titlu prea scurt", "Titlul trebuie să aibă minim 5 caractere.");
      return;
    }
    if (content.trim().length < 10) {
      Alert.alert("Conținut prea scurt", "Te rog scrie minim 10 caractere.");
      return;
    }
    setSubmitting(true);
    try {
      const res: any = await api.forumCreatePost({
        category, title: title.trim(), content: content.trim(), is_anonymous: isAnonymous,
      });
      router.replace(`/forum/${res.post.id}`);
    } catch (e: any) {
      Alert.alert("Eroare", e.message || "Nu am putut crea postarea");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: theme.colors.surface }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="close" size={26} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Întrebare nouă</Text>
          <TouchableOpacity testID="submit-post" onPress={submit} disabled={submitting} style={[styles.submitBtn, submitting && { opacity: 0.5 }]}>
            {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitText}>Publică</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>CATEGORIE</Text>
        <View style={styles.catGrid}>
          {cats.map(c => (
            <TouchableOpacity key={c.id} testID={`cat-${c.id}`} onPress={() => setCategory(c.id)}
              style={[styles.catChip, category === c.id && { backgroundColor: c.color, borderColor: c.color }]}>
              <Ionicons name={c.icon as any} size={14} color={category === c.id ? "#fff" : c.color} />
              <Text style={[styles.catChipText, category === c.id && { color: "#fff", fontWeight: "700" }]}>{c.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>TITLU</Text>
        <TextInput
          testID="input-title"
          value={title}
          onChangeText={setTitle}
          placeholder="Ex: Cum gestionez crizele de furie după școală?"
          placeholderTextColor={theme.colors.textDisabled}
          maxLength={200}
          style={styles.titleInput}
        />
        <Text style={styles.counter}>{title.length}/200</Text>

        <Text style={styles.label}>DETALII</Text>
        <TextInput
          testID="input-content"
          value={content}
          onChangeText={setContent}
          placeholder="Descrie situația, contextul și ce ai încercat până acum..."
          placeholderTextColor={theme.colors.textDisabled}
          multiline
          textAlignVertical="top"
          maxLength={5000}
          style={styles.contentInput}
        />
        <Text style={styles.counter}>{content.length}/5000</Text>

        <Text style={styles.label}>IDENTITATE</Text>
        <View style={styles.identityBox}>
          <TouchableOpacity testID="toggle-pseudo" onPress={() => setIsAnonymous(false)} style={[styles.idOpt, !isAnonymous && styles.idOptActive]}>
            <Ionicons name={!isAnonymous ? "radio-button-on" : "radio-button-off"} size={20} color={!isAnonymous ? theme.colors.primary : theme.colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.idTitle}>Pseudonim</Text>
              <Text style={styles.idDesc}>Postezi ca <Text style={{ fontWeight: "700", color: theme.colors.primary }}>{pseudonym || "Părinte_XXXXX"}</Text> (același la toate postările tale)</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity testID="toggle-anon" onPress={() => setIsAnonymous(true)} style={[styles.idOpt, isAnonymous && styles.idOptActive]}>
            <Ionicons name={isAnonymous ? "radio-button-on" : "radio-button-off"} size={20} color={isAnonymous ? theme.colors.primary : theme.colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.idTitle}>Total anonim</Text>
              <Text style={styles.idDesc}>Postezi ca <Text style={{ fontWeight: "700" }}>Anonim</Text> (postările tale nu pot fi conectate între ele)</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.note}>
          <Ionicons name="information-circle" size={18} color={theme.colors.primary} />
          <Text style={styles.noteText}>Răspunsurile altor părinți nu înlocuiesc consultul unui specialist. Fiți respectuoși și empatici.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 17, fontWeight: "700", color: theme.colors.textPrimary },
  submitBtn: { backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, marginRight: 8, minWidth: 80, alignItems: "center" },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 1, color: theme.colors.textSecondary, marginTop: 16, marginBottom: 8 },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  catChipText: { fontSize: 12, color: theme.colors.textPrimary, fontWeight: "500" },
  titleInput: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.colors.textPrimary },
  contentInput: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: theme.colors.textPrimary, minHeight: 140 },
  counter: { fontSize: 10, color: theme.colors.textDisabled, textAlign: "right", marginTop: 4 },
  identityBox: { gap: 8 },
  idOpt: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: 12 },
  idOptActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + "08" },
  idTitle: { fontSize: 14, fontWeight: "600", color: theme.colors.textPrimary },
  idDesc: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  note: { flexDirection: "row", gap: 10, backgroundColor: theme.colors.primary + "11", borderRadius: 12, padding: 12, marginTop: 20, alignItems: "flex-start" },
  noteText: { flex: 1, fontSize: 12, color: theme.colors.textSecondary, lineHeight: 17 },
});
