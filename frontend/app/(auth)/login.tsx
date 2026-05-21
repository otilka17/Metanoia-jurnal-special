import { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/lib/auth";
import { theme } from "@/src/lib/theme";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Ionicons name="leaf" size={36} color={theme.colors.primary} />
            </View>
          </View>
          <Text style={styles.title} testID="login-title">Bine ai revenit</Text>
          <Text style={styles.subtitle}>
            Ghid pentru părinții copiilor supradotați și hiperactivi
          </Text>

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
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Autentificare</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            testID="go-to-register-button"
            style={styles.linkBtn}
            onPress={() => router.push("/(auth)/register")}
          >
            <Text style={styles.linkText}>
              Nu ai cont? <Text style={{ color: theme.colors.primary, fontWeight: "600" }}>Creează unul</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  container: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, flexGrow: 1 },
  logoWrap: { alignItems: "center", marginTop: 24, marginBottom: 32 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.surfaceElevated,
    alignItems: "center", justifyContent: "center",
  },
  title: { ...theme.font.h1, color: theme.colors.textPrimary, marginBottom: 8 },
  subtitle: { ...theme.font.body, color: theme.colors.textSecondary, marginBottom: 32 },
  field: { marginBottom: 16 },
  label: { ...theme.font.label, color: theme.colors.textSecondary, marginBottom: 8 },
  input: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16,
    fontSize: 16, color: theme.colors.textPrimary,
    borderWidth: 1, borderColor: "transparent",
  },
  btn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 999, paddingVertical: 16, alignItems: "center", marginTop: 16,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  linkBtn: { alignItems: "center", marginTop: 24 },
  linkText: { ...theme.font.body, color: theme.colors.textSecondary },
});
