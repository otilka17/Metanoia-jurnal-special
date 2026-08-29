import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform
} from "react-native";
import { Alert } from "@/src/lib/alert";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/lib/api";
import { theme } from "@/src/lib/theme";

const ROLE_OPTS = [
  { key: "parinte", label: "Sunt părinte" },
  { key: "specialist", label: "Sunt specialist (psiholog/terapeut/educator)" },
  { key: "altceva", label: "Altceva" },
];
const USEFUL_OPTS = [
  { key: "da", label: "Da" },
  { key: "partial", label: "Parțial" },
  { key: "nu", label: "Nu" },
];
const USAGE_OPTS = [
  { key: "copil_propriu", label: "Pentru copilul/copiii mei" },
  { key: "altii", label: "Aș folosi-o pentru alții (elevi, pacienți)" },
  { key: "ambele", label: "Ambele" },
];
const RECOMMEND_OPTS = [
  { key: "da", label: "Da, aș recomanda-o" },
  { key: "nu", label: "Nu aș recomanda-o" },
];
const MOST_USEFUL_OPTS = [
  { key: "mindmap", label: "Mind Map" },
  { key: "ghid", label: "Ghidul Specialistului" },
  { key: "test", label: "Test profil" },
  { key: "ask", label: "Întreabă AI" },
  { key: "comunitate", label: "Comunitate" },
];

function ChoiceRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.choice, selected && styles.choiceActive]} onPress={onPress}>
      <View style={[styles.radio, selected && styles.radioActive]}>
        {selected && <View style={styles.radioDot} />}
      </View>
      <Text style={[styles.choiceText, selected && styles.choiceTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ChipToggle({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, selected && styles.chipActive]} onPress={onPress}>
      {selected && <Ionicons name="checkmark" size={14} color="#fff" style={{ marginRight: 4 }} />}
      <Text style={[styles.chipText, selected && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function FeedbackScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const [howFound, setHowFound] = useState("");
  const [role, setRole] = useState("");
  const [roleOther, setRoleOther] = useState("");
  const [isUseful, setIsUseful] = useState("");
  const [isUsefulReason, setIsUsefulReason] = useState("");
  const [usageContext, setUsageContext] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState("");
  const [improvement, setImprovement] = useState("");
  const [mostUseful, setMostUseful] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await api.myFeedback();
        const f = res.feedback;
        if (f) {
          setAlreadySubmitted(true);
          setHowFound(f.how_found || "");
          setRole(f.role || "");
          setRoleOther(f.role_other || "");
          setIsUseful(f.is_useful || "");
          setIsUsefulReason(f.is_useful_reason || "");
          setUsageContext(f.usage_context || "");
          setWouldRecommend(f.would_recommend || "");
          setImprovement(f.improvement || "");
          setMostUseful(f.most_useful || []);
        }
      } catch (e) { console.warn(e); }
      setLoading(false);
    })();
  }, []);

  const toggleMostUseful = (key: string) => {
    setMostUseful((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const onSubmit = async () => {
    if (!role) { Alert.alert("Atenție", "Spune-ne dacă ești părinte, specialist sau altceva."); return; }
    if (!isUseful) { Alert.alert("Atenție", "Spune-ne dacă ți se pare utilă aplicația."); return; }
    if (!usageContext) { Alert.alert("Atenție", "Spune-ne pentru cine o folosești."); return; }
    setSaving(true);
    try {
      await api.upsertFeedback({
        how_found: howFound.trim(),
        role,
        role_other: roleOther.trim(),
        is_useful: isUseful,
        is_useful_reason: isUsefulReason.trim(),
        usage_context: usageContext,
        would_recommend: role === "specialist" ? wouldRecommend : "",
        improvement: improvement.trim(),
        most_useful: mostUseful,
      });
      Alert.alert("Mulțumim! 🌱", "Feedback-ul tău a fost trimis.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert("Eroare", e.message || "Nu am putut trimite feedback-ul");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: theme.colors.surface }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={26} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Feedback</Text>
            <Text style={styles.subtitle}>Ne ajută să facem aplicația mai bună</Text>
          </View>
        </View>
      </SafeAreaView>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
            {alreadySubmitted && (
              <View style={styles.infoBanner}>
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
                <Text style={styles.infoBannerText}>Ai completat deja acest formular. Îl poți actualiza oricând.</Text>
              </View>
            )}

            <Text style={styles.q}>1. Cum ai aflat de aplicație?</Text>
            <TextInput
              testID="fb-how-found"
              style={styles.input}
              placeholder="Ex. de la o prietenă, pe rețele sociale..."
              placeholderTextColor={theme.colors.textDisabled}
              value={howFound}
              onChangeText={setHowFound}
            />

            <Text style={styles.q}>2. Ești părinte, specialist, sau altceva?</Text>
            {ROLE_OPTS.map((o) => (
              <ChoiceRow key={o.key} label={o.label} selected={role === o.key} onPress={() => setRole(o.key)} />
            ))}
            {role === "altceva" && (
              <TextInput
                testID="fb-role-other"
                style={[styles.input, { marginTop: 8 }]}
                placeholder="Spune-ne mai multe..."
                placeholderTextColor={theme.colors.textDisabled}
                value={roleOther}
                onChangeText={setRoleOther}
              />
            )}

            <Text style={styles.q}>3. Ți se pare utilă aplicația?</Text>
            {USEFUL_OPTS.map((o) => (
              <ChoiceRow key={o.key} label={o.label} selected={isUseful === o.key} onPress={() => setIsUseful(o.key)} />
            ))}
            <TextInput
              testID="fb-useful-reason"
              style={[styles.input, { marginTop: 8, minHeight: 70, textAlignVertical: "top" }]}
              placeholder="De ce? (opțional)"
              placeholderTextColor={theme.colors.textDisabled}
              multiline
              value={isUsefulReason}
              onChangeText={setIsUsefulReason}
            />

            <Text style={styles.q}>4. O folosești pentru copilul/copiii tăi, sau ai folosi-o pentru alții?</Text>
            {USAGE_OPTS.map((o) => (
              <ChoiceRow key={o.key} label={o.label} selected={usageContext === o.key} onPress={() => setUsageContext(o.key)} />
            ))}

            {role === "specialist" && (
              <>
                <Text style={styles.q}>5. Ai recomanda-o ca instrument în activitatea ta profesională?</Text>
                {RECOMMEND_OPTS.map((o) => (
                  <ChoiceRow key={o.key} label={o.label} selected={wouldRecommend === o.key} onPress={() => setWouldRecommend(o.key)} />
                ))}
              </>
            )}

            <Text style={styles.q}>6. Ce ai îmbunătăți sau ce ți-a lipsit?</Text>
            <TextInput
              testID="fb-improvement"
              style={[styles.input, { minHeight: 90, textAlignVertical: "top" }]}
              placeholder="Secțiune, funcție, temă neacoperită..."
              placeholderTextColor={theme.colors.textDisabled}
              multiline
              value={improvement}
              onChangeText={setImprovement}
            />

            <Text style={styles.q}>7. Ce ți s-a părut cel mai util până acum?</Text>
            <View style={styles.chipsRow}>
              {MOST_USEFUL_OPTS.map((o) => (
                <ChipToggle key={o.key} label={o.label} selected={mostUseful.includes(o.key)} onPress={() => toggleMostUseful(o.key)} />
              ))}
            </View>

            <TouchableOpacity testID="fb-submit" style={[styles.submitBtn, saving && { opacity: 0.6 }]} onPress={onSubmit} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{alreadySubmitted ? "Actualizează feedback-ul" : "Trimite feedback-ul"}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "700", color: theme.colors.textPrimary },
  subtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  infoBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.colors.primary + "11", borderRadius: 12, padding: 12, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: theme.colors.primary },
  infoBannerText: { flex: 1, fontSize: 12, color: theme.colors.textPrimary },
  q: { fontSize: 14, fontWeight: "700", color: theme.colors.textPrimary, marginTop: 22, marginBottom: 10 },
  input: { backgroundColor: theme.colors.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: theme.colors.textPrimary, borderWidth: 1, borderColor: theme.colors.border },
  choice: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: theme.colors.surface, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: theme.colors.border },
  choiceActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + "0D" },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: theme.colors.border, alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: theme.colors.primary },
  radioDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: theme.colors.primary },
  choiceText: { flex: 1, fontSize: 13, color: theme.colors.textPrimary },
  choiceTextActive: { fontWeight: "600" },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 13, color: theme.colors.textPrimary },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  submitBtn: { backgroundColor: theme.colors.primary, borderRadius: 999, paddingVertical: 16, alignItems: "center", marginTop: 30 },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
