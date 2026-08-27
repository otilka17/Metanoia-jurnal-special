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
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/lib/api";
import { theme } from "@/src/lib/theme";

type Step = "email" | "code" | "success";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const submitEmail = async () => {
    const e = email.trim().toLowerCase();
    if (!e || !e.includes("@")) {
      Alert.alert("Email invalid", "Te rog introdu un email valid.");
      return;
    }
    setLoading(true);
    try {
      await api.forgotPassword(e);
      Alert.alert("Verifică emailul", "Dacă emailul este înregistrat, vei primi un cod de resetare în câteva secunde.");
      setStep("code");
    } catch (err: any) {
      Alert.alert("Eroare", err.message || "A apărut o problemă. Încearcă din nou.");
    } finally { setLoading(false); }
  };

  const submitReset = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      Alert.alert("Cod invalid", "Codul trebuie să aibă 6 cifre.");
      return;
    }
    if (newPass.length < 6) {
      Alert.alert("Parolă prea scurtă", "Parola nouă trebuie să aibă minim 6 caractere.");
      return;
    }
    if (newPass !== confirmPass) {
      Alert.alert("Neconcordanță", "Parolele nu se potrivesc.");
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(email.trim().toLowerCase(), code.trim(), newPass);
      setStep("success");
    } catch (err: any) {
      Alert.alert("Eroare", err.message || "Cod incorect sau expirat.");
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Ionicons name={step === "success" ? "checkmark-circle" : "lock-open"} size={40} color={theme.colors.primary} />
            </View>
          </View>

          {step === "email" && (
            <>
              <Text style={styles.title}>Am uitat parola</Text>
              <Text style={styles.desc}>Introdu emailul contului tău. Îți vom trimite un cod de resetare valabil 15 minute.</Text>

              <View style={styles.field}>
                <Text style={styles.label}>EMAIL</Text>
                <TextInput
                  testID="fp-email"
                  style={styles.input}
                  placeholder="exemplu@email.ro"
                  placeholderTextColor={theme.colors.textDisabled}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <TouchableOpacity testID="fp-send-email" style={[styles.btn, loading && { opacity: 0.5 }]} onPress={submitEmail} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Ionicons name="mail" size={18} color="#fff" />
                    <Text style={styles.btnText}>Trimite codul</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {step === "code" && (
            <>
              <Text style={styles.title}>Introdu codul</Text>
              <Text style={styles.desc}>Am trimis un cod de 6 cifre la <Text style={{ fontWeight: "700", color: theme.colors.primary }}>{email}</Text>. Verifică inbox-ul (și spam-ul).</Text>

              <View style={styles.field}>
                <Text style={styles.label}>COD (6 CIFRE)</Text>
                <TextInput
                  testID="fp-code"
                  style={[styles.input, styles.codeInput]}
                  placeholder="000000"
                  placeholderTextColor={theme.colors.textDisabled}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/\D/g, ""))}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>PAROLĂ NOUĂ</Text>
                <View style={styles.passRow}>
                  <TextInput
                    testID="fp-newpass"
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Minim 6 caractere"
                    placeholderTextColor={theme.colors.textDisabled}
                    secureTextEntry={!showPass}
                    value={newPass}
                    onChangeText={setNewPass}
                  />
                  <TouchableOpacity onPress={() => setShowPass(v => !v)} style={styles.eyeBtn}>
                    <Ionicons name={showPass ? "eye-off" : "eye"} size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>CONFIRMĂ PAROLA</Text>
                <TextInput
                  testID="fp-confirmpass"
                  style={styles.input}
                  placeholder="Repetă parola"
                  placeholderTextColor={theme.colors.textDisabled}
                  secureTextEntry={!showPass}
                  value={confirmPass}
                  onChangeText={setConfirmPass}
                />
              </View>

              <TouchableOpacity testID="fp-reset" style={[styles.btn, loading && { opacity: 0.5 }]} onPress={submitReset} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.btnText}>Resetează parola</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity testID="fp-back-email" onPress={() => setStep("email")} style={styles.linkBtn}>
                <Text style={styles.linkText}>Nu am primit codul — trimite din nou</Text>
              </TouchableOpacity>
            </>
          )}

          {step === "success" && (
            <>
              <Text style={styles.title}>Parolă resetată!</Text>
              <Text style={styles.desc}>Poți acum să te autentifici cu noua parolă.</Text>
              <TouchableOpacity testID="fp-goto-login" style={styles.btn} onPress={() => router.replace("/(auth)/login")}>
                <Ionicons name="log-in" size={18} color="#fff" />
                <Text style={styles.btnText}>Autentificare</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  container: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40, flexGrow: 1 },
  backLink: { alignSelf: "flex-start", paddingVertical: 8 },
  logoWrap: { alignItems: "center", marginTop: 8, marginBottom: 20 },
  logoCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: theme.colors.surfaceElevated, alignItems: "center", justifyContent: "center" },
  title: { ...theme.font.h1, color: theme.colors.textPrimary, textAlign: "center", marginTop: 8 },
  desc: { ...theme.font.body, color: theme.colors.textSecondary, marginTop: 8, marginBottom: 24, textAlign: "center", lineHeight: 20 },
  field: { marginBottom: 16 },
  label: { ...theme.font.label, color: theme.colors.textSecondary, marginBottom: 8 },
  input: { backgroundColor: theme.colors.surfaceElevated, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: theme.colors.textPrimary },
  codeInput: { fontSize: 28, fontWeight: "700", letterSpacing: 12, textAlign: "center", fontVariant: ["tabular-nums"] },
  passRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  eyeBtn: { padding: 12 },
  btn: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, backgroundColor: theme.colors.primary, borderRadius: 999, paddingVertical: 14, marginTop: 8 },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  linkBtn: { alignItems: "center", marginTop: 16 },
  linkText: { ...theme.font.body, color: theme.colors.primary, fontWeight: "600" },
});
