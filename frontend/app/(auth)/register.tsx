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

  const onSubmit = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert("Atenție", "Completează toate câmpurile.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Atenție", "Parola trebuie să aibă minim 6 caractere.");
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
          <Text style={styles.subtitle}>Începe călătoria ta de părinte conștient.</Text>

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

          <Text style={styles.consentText}>
            Prin crearea contului, ești de acord cu{" "}
            <Text testID="register-terms-link" style={styles.consentLink} onPress={() => router.push("/terms")}>
              Termenii și Condițiile
            </Text>{" "}
            și{" "}
            <Text testID="register-privacy-link" style={styles.consentLink} onPress={() => router.push("/privacy")}>
              Politica de Confidențialitate
            </Text>.
          </Text>

          <TouchableOpacity
            testID="register-submit-button"
            style={[styles.btn, loading && { opacity: 0.6 }]}
            onPress={onSubmit}
            disabled={loading}
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
  consentText: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 8, lineHeight: 18 },
  consentLink: { color: theme.colors.primary, fontWeight: "600" },
  btn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 999, paddingVertical: 16, alignItems: "center", marginTop: 16,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
