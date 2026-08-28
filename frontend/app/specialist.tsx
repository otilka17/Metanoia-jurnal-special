import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Alert } from "@/src/lib/alert";
import { api } from "@/src/lib/api";
import { theme } from "@/src/lib/theme";

export default function SpecialistScreen() {
  const router = useRouter();
  const [calendlyUrl, setCalendlyUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await api.getCalendlySettings();
        setCalendlyUrl(res.calendly_url || "");
      } catch (e) { console.warn(e); }
      setLoading(false);
    })();
  }, []);

  const openBooking = async () => {
    try {
      await Linking.openURL(calendlyUrl);
    } catch (e) {
      Alert.alert("Eroare", "Nu am putut deschide pagina de programare.");
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
            <Text style={styles.title}>Contactează un specialist</Text>
            <Text style={styles.subtitle}>Consultație individuală, programată online</Text>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Ionicons name="calendar" size={40} color={theme.colors.primary} />
        </View>
        <Text style={styles.heading}>Ai nevoie de sprijin dincolo de ce poate oferi aplicația?</Text>
        <Text style={styles.desc}>
          Programează o consultație individuală, plătită online, direct din calendar — pentru o discuție
          personalizată despre situația copilului tău.
        </Text>

        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 24 }} />
        ) : calendlyUrl ? (
          <TouchableOpacity testID="open-calendly" style={styles.bookBtn} onPress={openBooking}>
            <Ionicons name="calendar-outline" size={20} color="#fff" />
            <Text style={styles.bookBtnText}>Programează o consultație</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.comingSoon}>
            <Ionicons name="time-outline" size={18} color={theme.colors.textSecondary} />
            <Text style={styles.comingSoonText}>Programările online vor fi disponibile în curând.</Text>
          </View>
        )}

        <View style={styles.disclaimerBox}>
          <Ionicons name="information-circle" size={16} color={theme.colors.primary} />
          <Text style={styles.disclaimerText}>
            Vei fi redirecționat către o pagină externă de programare, unde alegi ora și plătești consultația.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "700", color: theme.colors.textPrimary },
  subtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  container: { flex: 1, alignItems: "center", padding: 24, paddingTop: 40 },
  iconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: theme.colors.primary + "18", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  heading: { ...theme.font.h3, color: theme.colors.textPrimary, textAlign: "center", marginBottom: 12 },
  desc: { ...theme.font.body, color: theme.colors.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: 28 },
  bookBtn: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: theme.colors.primary, borderRadius: 999, paddingHorizontal: 28, paddingVertical: 16 },
  bookBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  comingSoon: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 12 },
  comingSoonText: { fontSize: 13, color: theme.colors.textSecondary },
  disclaimerBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: theme.colors.primary + "11", borderRadius: 12, padding: 12, marginTop: 32, borderLeftWidth: 3, borderLeftColor: theme.colors.primary, alignSelf: "stretch" },
  disclaimerText: { flex: 1, fontSize: 12, color: theme.colors.textSecondary, lineHeight: 17 },
});
