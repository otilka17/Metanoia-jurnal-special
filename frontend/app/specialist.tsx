import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking, ActivityIndicator, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Alert } from "@/src/lib/alert";
import { api } from "@/src/lib/api";
import { theme } from "@/src/lib/theme";

type Specialist = { id: string; name: string; title: string; specialization: string; calendly_url: string };

export default function SpecialistScreen() {
  const router = useRouter();
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await api.listSpecialists();
        setSpecialists(res.specialists || []);
      } catch (e) { console.warn(e); }
      setLoading(false);
    })();
  }, []);

  const openBooking = async (url: string) => {
    try {
      await Linking.openURL(url);
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
            <Text style={styles.subtitle}>Consultații individuale, programate online</Text>
          </View>
        </View>
      </SafeAreaView>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : specialists.length === 0 ? (
        <View style={styles.container}>
          <View style={styles.iconWrap}>
            <Ionicons name="calendar" size={40} color={theme.colors.primary} />
          </View>
          <Text style={styles.heading}>Ai nevoie de sprijin dincolo de ce poate oferi aplicația?</Text>
          <View style={styles.comingSoon}>
            <Ionicons name="time-outline" size={18} color={theme.colors.textSecondary} />
            <Text style={styles.comingSoonText}>Programările online vor fi disponibile în curând.</Text>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={styles.intro}>
            Programează o consultație individuală, plătită online, direct din calendarul specialistului ales.
          </Text>
          {specialists.map((s) => (
            <View key={s.id} style={styles.card} testID={`specialist-${s.id}`}>
              <View style={styles.cardAvatar}>
                <Ionicons name="person" size={24} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{s.name}</Text>
                {!!s.title && <Text style={styles.cardTitleText}>{s.title}</Text>}
                {!!s.specialization && <Text style={styles.cardSpec}>{s.specialization}</Text>}
                <TouchableOpacity testID={`book-${s.id}`} style={styles.bookBtn} onPress={() => openBooking(s.calendly_url)}>
                  <Ionicons name="calendar-outline" size={16} color="#fff" />
                  <Text style={styles.bookBtnText}>Programează</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <View style={styles.disclaimerBox}>
            <Ionicons name="information-circle" size={16} color={theme.colors.primary} />
            <Text style={styles.disclaimerText}>
              Vei fi redirecționat către o pagină externă de programare, unde alegi ora și plătești consultația.
            </Text>
          </View>
        </ScrollView>
      )}
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
  heading: { ...theme.font.h3, color: theme.colors.textPrimary, textAlign: "center", marginBottom: 20 },
  comingSoon: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 12 },
  comingSoonText: { fontSize: 13, color: theme.colors.textSecondary },
  intro: { ...theme.font.body, color: theme.colors.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: 20 },
  card: { flexDirection: "row", gap: 14, backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: theme.colors.border },
  cardAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.primary + "18", alignItems: "center", justifyContent: "center" },
  cardName: { fontSize: 16, fontWeight: "700", color: theme.colors.textPrimary },
  cardTitleText: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  cardSpec: { fontSize: 12, color: theme.colors.primary, fontWeight: "600", marginTop: 4 },
  bookBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: theme.colors.primary, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9, marginTop: 12 },
  bookBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  disclaimerBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: theme.colors.primary + "11", borderRadius: 12, padding: 12, marginTop: 10, borderLeftWidth: 3, borderLeftColor: theme.colors.primary },
  disclaimerText: { flex: 1, fontSize: 12, color: theme.colors.textSecondary, lineHeight: 17 },
});
