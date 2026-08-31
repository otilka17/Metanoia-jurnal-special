import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator
} from "react-native";
import { Alert } from "@/src/lib/alert";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/lib/auth";
import { theme } from "@/src/lib/theme";

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const params = useLocalSearchParams<{ ref?: string }>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState(params.ref ? String(params.ref).toUpperCase() : "");
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const onSubmit = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert("Atenție", "Completează toate câmpurile.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Atenție", "Parola trebuie să aibă minim 6 caractere.");
      return;
    }
    if (!agreed) {
      Alert.alert("Atenție", "Trebuie să fii de acord cu Termenii și Politica de Confidențialitate pentru a continua.");
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), password, name.trim(), referralCode.trim());
    } catch (e: any) {
      Alert.alert("Eroare", e.message || "Înregistrare eșuată");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity testID="back-to-login-button" onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.title} testID="register-title">Creează un cont</Text>
          <Text style={styles.subtitle}>Începe să monitorizezi dezvoltarea copilului tău, pas cu pas.</Text>

          <View style={styles.field}>
            <Text style={styles.label}>NUME</Text>
            <TextInput
              testID="register-name-input"
              style={styles.input}
              placeholder="Numele tău"
              placeholderTextColor={theme.colors.textDisabled}
              value={name}
              onChangeText={setName}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              testID="register-email-input"
              style={styles.input}
              placeholder="exemplu@email.ro"
              placeholderTextColor={theme.colors.textDisabled}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>PAROLĂ</Text>
            <TextInput
              testID="register-password-input"
              style={styles.input}
              placeholder="Minim 6 caractere"
              placeholderTextColor={theme.colors.textDisabled}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>COD DE RECOMANDARE (OPȚIONAL)</Text>
            <TextInput
              testID="register-referral-input"
              style={styles.input}
              placeholder="Ex. AB12CD"
              placeholderTextColor={theme.colors.textDisabled}
              autoCapitalize="characters"
              value={referralCode}
              onChangeText={setReferralCode}
            />
          </View>

          <Text style={styles.disclaimerText}>
            Materialele din aplicație au rol exclusiv educativ și de orientare — nu constituie diagnoză
            clinică, evaluare psihologică oficială sau tratament.
          </Text>

          <TouchableOpacity
            testID="register-consent-checkbox"
            style={styles.consentRow}
            onPress={() => setAgreed((v) => !v)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={styles.consentText}>
              Sunt de acord cu{" "}
              <Text testID="register-terms-link" style={styles.consentLink} onPress={() => router.push("/terms")}>
                Termenii și Condițiile
              </Text>{" "}
              și{" "}
              <Text testID="register-privacy-link" style={styles.consentLink} onPress={() => router.push("/privacy")}>
                Politica de Confidențialitate
              </Text>.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="register-submit-button"
            style={[styles.btn, (loading || !agreed) && { opacity: 0.5 }]}
            onPress={onSubmit}
            disabled={loading || !agreed}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Creează cont</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  container: { paddingHorizontal: 24, paddingBottom: 40, flexGrow: 1 },
  backBtn: { paddingVertical: 12, alignSelf: "flex-start" },
  title: { ...theme.font.h1, color: theme.colors.textPrimary, marginTop: 16, marginBottom: 8 },
  subtitle: { ...theme.font.body, color: theme.colors.textSecondary, marginBottom: 32 },
  field: { marginBottom: 16 },
  label: { ...theme.font.label, color: theme.colors.textSecondary, marginBottom: 8 },
  input: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16,
    fontSize: 16, color: theme.colors.textPrimary,
  },
  disclaimerText: { fontSize: 11.5, color: theme.colors.textDisabled, marginTop: 8, lineHeight: 16, fontStyle: "italic" },
  consentRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 14 },
  checkbox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: theme.colors.border,
    alignItems: "center", justifyContent: "center", marginTop: 1,
  },
  checkboxChecked: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  consentText: { flex: 1, fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18 },
  consentLink: { color: theme.colors.primary, fontWeight: "600" },
  btn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 999, paddingVertical: 16, alignItems: "center", marginTop: 16,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
