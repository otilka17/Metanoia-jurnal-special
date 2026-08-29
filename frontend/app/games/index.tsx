import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/lib/api";
import { theme } from "@/src/lib/theme";

const GAMES = [
  {
    key: "memory",
    route: "/games/memory",
    title: "Secvența memoriei",
    desc: "Repetă o secvență de culori care crește tot mai mult. Dezvoltă memoria de lucru și atenția susținută.",
    icon: "color-palette" as const,
    color: "#5E8B7E",
  },
  {
    key: "attention",
    route: "/games/attention",
    title: "Vânătorul de forme",
    desc: "Apasă doar când apare forma-țintă și ignoră restul. Antrenează atenția selectivă și controlul impulsurilor.",
    icon: "eye" as const,
    color: "#DE8F6E",
  },
  {
    key: "numbers",
    route: "/games/numbers",
    title: "Ordinea Numerelor",
    desc: "Apasă numerele în ordine crescătoare, cât mai repede, împrăștiate pe ecran. Antrenează atenția susținută și viteza de procesare.",
    icon: "locate" as const,
    color: "#7A9E9F",
  },
  {
    key: "oddoneout",
    route: "/games/oddoneout",
    title: "Vânează Intrusul",
    desc: "Găsește forma diferită ascunsă printre cele identice. Grila crește, timpul scade. Antrenează căutarea vizuală.",
    icon: "search" as const,
    color: "#9B8CC4",
  },
  {
    key: "stroop",
    route: "/games/stroop",
    title: "Stroop Culori",
    desc: "Apasă culoarea cernelii, nu cuvântul citit. Antrenează controlul impulsurilor, potrivit mai ales pentru copii mai mari.",
    icon: "color-filter" as const,
    color: "#E8B33C",
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
          <TouchableOpacity key={g.key} testID={`game-${g.key}`} style={styles.card} onPress={() => router.push(g.route as any)}>
            <View style={[styles.iconWrap, { backgroundColor: g.color + "22" }]}>
              <Ionicons name={g.icon} size={26} color={g.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{g.title}</Text>
              <Text style={styles.cardDesc}>{g.desc}</Text>
              {scores[g.key] !== undefined && (
                <Text style={[styles.bestScore, { color: g.color }]}>Record: {scores[g.key]}</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textDisabled} />
          </TouchableOpacity>
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
  card: { flexDirection: "row", gap: 14, alignItems: "center", backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: theme.colors.border },
  iconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 16, fontWeight: "700", color: theme.colors.textPrimary },
  cardDesc: { fontSize: 12.5, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 17 },
  bestScore: { fontSize: 12, fontWeight: "700", marginTop: 6 },
});
