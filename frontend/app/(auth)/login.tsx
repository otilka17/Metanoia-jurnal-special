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
import { useAuth } from "@/src/lib/auth";
import { theme } from "@/src/lib/theme";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Atenție", "Completează emailul și parola.");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      Alert.alert("Eroare", e.message || "Autentificare eșuată");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Ionicons name="leaf" size={40} color={theme.colors.primary} />
            </View>
            <Text style={styles.brandName}>Ghid Părinte</Text>
          </View>

          {!showForm ? (
            <>
              <Text style={styles.welcomeTitle} testID="welcome-title">Bine ai venit</Text>
              <Text style={styles.welcomeSub}>
                Ghid practic pentru părinții copiilor{"\n"}supradotați și hiperactivi
              </Text>

              <View style={styles.featuresList}>
                <View style={styles.featureRow}>
                  <Ionicons name="library" size={18} color={theme.colors.primary} />
                  <Text style={styles.featureText}>17 capitole de la specialiști</Text>
                </View>
                <View style={styles.featureRow}>
                  <Ionicons name="git-network" size={18} color={theme.colors.primary} />
                  <Text style={styles.featureText}>Mind Map interactiv</Text>
                </View>
                <View style={styles.featureRow}>
                  <Ionicons name="sparkles" size={18} color={theme.colors.primary} />
                  <Text style={styles.featureText}>Articole generate de AI în română</Text>
                </View>
                <View style={styles.featureRow}>
                  <Ionicons name="book" size={18} color={theme.colors.primary} />
                  <Text style={styles.featureText}>Jurnal părinte cu statistici</Text>
                </View>
              </View>

              <TouchableOpacity testID="show-login-form" style={styles.btn} onPress={() => setShowForm(true)}>
                <Ionicons name="log-in-outline" size={18} color="#fff" />
                <Text style={styles.btnText}>Autentificare</Text>
              </TouchableOpacity>

              <TouchableOpacity testID="goto-register" style={styles.btnOutline} onPress={() => router.push("/(auth)/register")}>
                <Ionicons name="person-add-outline" size={18} color={theme.colors.primary} />
                <Text style={styles.btnOutlineText}>Creează cont nou</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={() => setShowForm(false)} style={styles.backLink}>
                <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.welcomeTitle}>Autentificare</Text>
              <Text style={styles.welcomeSub}>Introdu datele contului tău</Text>

              <View style={styles.field}>
                <Text style={styles.label}>EMAIL</Text>
                <TextInput
                  testID="login-email-input"
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
                  testID="login-password-input"
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={theme.colors.textDisabled}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              <TouchableOpacity
                testID="login-submit-button"
                style={[styles.btn, loading && { opacity: 0.6 }]}
                onPress={onSubmit}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Ionicons name="log-in" size={18} color="#fff" />
                    <Text style={styles.btnText}>Autentificare</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity testID="go-to-register-button" style={styles.linkBtn} onPress={() => router.push("/(auth)/register")}>
                <Text style={styles.linkText}>
                  Nu ai cont? <Text style={{ color: theme.colors.primary, fontWeight: "600" }}>Creează unul</Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity testID="forgot-password-link" style={styles.linkBtn} onPress={() => router.push("/(auth)/forgot-password")}>
                <Text style={[styles.linkText, { color: theme.colors.primary, fontWeight: "600" }]}>Am uitat parola</Text>
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
  container: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, flexGrow: 1 },
  logoWrap: { alignItems: "center", marginTop: 24, marginBottom: 24 },
  logoCircle: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: theme.colors.surfaceElevated,
    alignItems: "center", justifyContent: "center",
  },
  brandName: { fontSize: 14, fontWeight: "600", color: theme.colors.primary, letterSpacing: 1, marginTop: 12 },
  welcomeTitle: { ...theme.font.h1, color: theme.colors.textPrimary, textAlign: "center", marginTop: 8 },
  welcomeSub: { ...theme.font.bodyL, color: theme.colors.textSecondary, marginTop: 8, marginBottom: 32, textAlign: "center" },
  featuresList: { gap: 14, marginBottom: 36, backgroundColor: theme.colors.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: theme.colors.border },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureText: { fontSize: 14, color: theme.colors.textPrimary },
  btn: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, backgroundColor: theme.colors.primary, borderRadius: 999, paddingVertical: 16, marginTop: 8 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  btnOutline: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, borderWidth: 1.5, borderColor: theme.colors.primary, borderRadius: 999, paddingVertical: 16, marginTop: 12 },
  btnOutlineText: { color: theme.colors.primary, fontSize: 16, fontWeight: "600" },
  backLink: { alignSelf: "flex-start", paddingVertical: 8 },
  field: { marginBottom: 16 },
  label: { ...theme.font.label, color: theme.colors.textSecondary, marginBottom: 8 },
  input: { backgroundColor: theme.colors.surfaceElevated, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, fontSize: 16, color: theme.colors.textPrimary },
  linkBtn: { alignItems: "center", marginTop: 24 },
  linkText: { ...theme.font.body, color: theme.colors.textSecondary },
});
