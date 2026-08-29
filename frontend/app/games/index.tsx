import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "@/src/lib/api";
import { theme } from "@/src/lib/theme";
import { PressScale } from "@/src/components/games/PressScale";

const GAMES = [
  {
    key: "memory",
    route: "/games/memory",
    title: "Secvența memoriei",
    desc: "Repetă o secvență de culori care crește tot mai mult. Dezvoltă memoria de lucru și atenția susținută.",
    icon: "color-palette" as const,
    colors: ["#5E8B7E", "#3D5A52"] as [string, string],
  },
  {
    key: "attention",
    route: "/games/attention",
    title: "Vânătorul de forme",
    desc: "Apasă doar când apare forma-țintă și ignoră restul. Antrenează atenția selectivă și controlul impulsurilor.",
    icon: "eye" as const,
    colors: ["#DE8F6E", "#B5654A"] as [string, string],
  },
  {
    key: "numbers",
    route: "/games/numbers",
    title: "Ordinea Numerelor",
    desc: "Apasă numerele în ordine crescătoare, cât mai repede, împrăștiate pe ecran. Antrenează atenția susținută și viteza de procesare.",
    icon: "locate" as const,
    colors: ["#7A9E9F", "#4F6C6D"] as [string, string],
  },
  {
    key: "oddoneout",
    route: "/games/oddoneout",
    title: "Vânează Intrusul",
    desc: "Găsește forma diferită ascunsă printre cele identice. Grila crește, timpul scade. Antrenează căutarea vizuală.",
    icon: "search" as const,
    colors: ["#9B8CC4", "#6F5FA0"] as [string, string],
  },
  {
    key: "stroop",
    route: "/games/stroop",
    title: "Stroop Culori",
    desc: "Apasă culoarea cernelii, nu cuvântul citit. Antrenează controlul impulsurilor, potrivit mai ales pentru copii mai mari.",
    icon: "color-filter" as const,
    colors: ["#E8B33C", "#C48A1E"] as [string, string],
  },
];

export default function GamesHubScreen() {
  const router = useRouter();
  const [scores, setScores] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      try {
        const res: any = await api.myGameScores();
        setScores(res.scores || {});
      } catch (e) { console.warn(e); }
    })();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: theme.colors.surface }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={26} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Jocuri pentru concentrare</Text>
            <Text style={styles.subtitle}>Câteva minute pe zi, joc-terapie pentru atenție</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {GAMES.map((g) => (
          <PressScale key={g.key} testID={`game-${g.key}`} onPress={() => router.push(g.route as any)} style={styles.card}>
            <LinearGradient colors={g.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.iconWrap, { shadowColor: g.colors[1] }]}>
              <Ionicons name={g.icon} size={26} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{g.title}</Text>
              <Text style={styles.cardDesc}>{g.desc}</Text>
              {scores[g.key] !== undefined && (
                <Text style={[styles.bestScore, { color: g.colors[1] }]}>Record: {scores[g.key]}</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textDisabled} />
          </PressScale>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "700", color: theme.colors.textPrimary },
  subtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  card: {
    flexDirection: "row", gap: 14, alignItems: "center", backgroundColor: theme.colors.surface,
    borderRadius: 20, padding: 16, marginBottom: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12,
    elevation: 3,
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center",
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: theme.colors.textPrimary },
  cardDesc: { fontSize: 12.5, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 17 },
  bestScore: { fontSize: 12, fontWeight: "700", marginTop: 6 },
});
