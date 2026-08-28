import { useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { storage } from "@/src/utils/storage";
import { theme } from "@/src/lib/theme";

const { width } = Dimensions.get("window");

const slides = [
  {
    icon: "git-network-outline" as const,
    color: "#5E8B7E",
    title: "Mind Map interactiv",
    text: "Explorează vizual structura completă a ghidului: 5 categorii, 12 teme, 40+ concepte — dintr-o singură atingere.",
  },
  {
    icon: "sparkles-outline" as const,
    color: "#DE8F6E",
    title: "Articole generate de AI",
    text: "Conținut personalizat în limba română, scris de Claude — sfaturi practice, exemple și momente când să ceri ajutor.",
  },
  {
    icon: "book-outline" as const,
    color: "#E8C37C",
    title: "Jurnal & Statistici",
    text: "Notează stările copilului, identifică tipare cu grafice lunare și salvează articolele preferate ca PDF.",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const listRef = useRef<FlatList>(null);

  const finish = async () => {
    await storage.setItem("onboarding_seen", "1");
    router.replace("/(auth)/login");
  };

  const next = () => {
    if (idx < slides.length - 1) {
      listRef.current?.scrollToOffset({ offset: (idx + 1) * width, animated: true });
      setIdx(idx + 1);
    } else finish();
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.topRow}>
        <Text style={styles.brand}>Ghid Părinte</Text>
        <TouchableOpacity testID="onboarding-skip" onPress={finish}>
          <Text style={styles.skip}>Sari peste</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.iconWrap, { backgroundColor: item.color + "22" }]}>
              <Ionicons name={item.icon} size={64} color={item.color} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.text}>{item.text}</Text>
          </View>
        )}
      />

      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View key={i} style={[styles.dot, i === idx && styles.dotActive]} />
        ))}
      </View>

      <TouchableOpacity testID="onboarding-next" style={styles.btn} onPress={next}>
        <Text style={styles.btnText}>{idx < slides.length - 1 ? "Mai departe" : "Începe"}</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingVertical: 12 },
  brand: { fontSize: 14, fontWeight: "600", color: theme.colors.primary, letterSpacing: 0.5 },
  skip: { fontSize: 14, color: theme.colors.textSecondary },
  slide: { paddingHorizontal: 32, alignItems: "center", justifyContent: "center", flex: 1 },
  iconWrap: { width: 140, height: 140, borderRadius: 70, alignItems: "center", justifyContent: "center", marginBottom: 40 },
  title: { ...theme.font.h1, color: theme.colors.textPrimary, textAlign: "center", marginBottom: 16 },
  text: { ...theme.font.bodyL, color: theme.colors.textSecondary, textAlign: "center", lineHeight: 26 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8, marginVertical: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.border },
  dotActive: { width: 24, backgroundColor: theme.colors.primary },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 24, marginBottom: 16, backgroundColor: theme.colors.primary, borderRadius: 999, paddingVertical: 16 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
