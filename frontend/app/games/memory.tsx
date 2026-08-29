import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "@/src/lib/api";
import { theme } from "@/src/lib/theme";
import { PressScale } from "@/src/components/games/PressScale";
import { GradientButton } from "@/src/components/games/GradientButton";
import { GradientCircleIcon } from "@/src/components/games/GradientCircleIcon";
import { RecordBadge } from "@/src/components/games/RecordBadge";

const TILE_GRADIENTS: [string, string][] = [
  ["#5E8B7E", "#3D5A52"],
  ["#DE8F6E", "#B5654A"],
  ["#E8C37C", "#C48A1E"],
  ["#7A9E9F", "#4F6C6D"],
];
const STEP_MS = 700;

type Phase = "idle" | "showing" | "input" | "gameover";

export default function MemoryGameScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [sequence, setSequence] = useState<number[]>([]);
  const [inputIndex, setInputIndex] = useState(0);
  const [activeTile, setActiveTile] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await api.myGameScores();
        setBestScore(res.scores?.memory || 0);
      } catch (e) { console.warn(e); }
    })();
    return () => { timeouts.current.forEach(clearTimeout); };
  }, []);

  const clearTimers = () => { timeouts.current.forEach(clearTimeout); timeouts.current = []; };
  const after = (ms: number, fn: () => void) => { timeouts.current.push(setTimeout(fn, ms)); };

  const playSequence = (seq: number[]) => {
    setPhase("showing");
    setInputIndex(0);
    seq.forEach((tile, i) => {
      after(i * STEP_MS + 350, () => setActiveTile(tile));
      after(i * STEP_MS + 600, () => setActiveTile(null));
    });
    after(seq.length * STEP_MS + 150, () => setPhase("input"));
  };

  const startGame = () => {
    clearTimers();
    const first = [Math.floor(Math.random() * 4)];
    setSequence(first);
    setScore(0);
    playSequence(first);
  };

  const submitScore = async (finalScore: number) => {
    try {
      const res: any = await api.submitGameScore("memory", finalScore);
      if (res.is_new_best) setBestScore(finalScore);
    } catch (e) { console.warn(e); }
  };

  const onTilePress = (idx: number) => {
    if (phase !== "input") return;
    if (idx === sequence[inputIndex]) {
      setActiveTile(idx);
      after(200, () => setActiveTile(null));
      if (inputIndex + 1 === sequence.length) {
        const newScore = sequence.length;
        setScore(newScore);
        const nextSeq = [...sequence, Math.floor(Math.random() * 4)];
        setSequence(nextSeq);
        after(650, () => playSequence(nextSeq));
      } else {
        setInputIndex(inputIndex + 1);
      }
    } else {
      clearTimers();
      setPhase("gameover");
      submitScore(score);
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
            <Text style={styles.title}>Secvența memoriei</Text>
            <Text style={styles.subtitle}>Record: {bestScore}</Text>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        {phase === "idle" && (
          <View style={styles.center}>
            <GradientCircleIcon icon="color-palette" colors={["#5E8B7E", "#3D5A52"]} />
            <Text style={styles.introText}>Privește cu atenție culorile care se aprind, apoi repetă-le apăsând în aceeași ordine. La fiecare rundă se adaugă o culoare nouă.</Text>
            <GradientButton testID="memory-start" label="Începe jocul" colors={["#5E8B7E", "#3D5A52"]} onPress={startGame} />
          </View>
        )}

        {(phase === "showing" || phase === "input") && (
          <>
            <Text style={styles.levelText}>Nivel {sequence.length}</Text>
            <Text style={styles.hintText}>{phase === "showing" ? "Privește..." : "Rândul tău!"}</Text>
            <View style={styles.grid}>
              {TILE_GRADIENTS.map((colors, i) => (
                <PressScale
                  key={i}
                  testID={`memory-tile-${i}`}
                  disabled={phase !== "input"}
                  onPress={() => onTilePress(i)}
                  style={styles.tileWrap}
                >
                  <LinearGradient
                    colors={colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.tile, { opacity: activeTile === i ? 1 : 0.35 }]}
                  />
                </PressScale>
              ))}
            </View>
          </>
        )}

        {phase === "gameover" && (
          <View style={styles.center}>
            <GradientCircleIcon icon="ribbon" colors={["#DE8F6E", "#B5654A"]} />
            <Text style={styles.gameoverTitle}>Ai ajuns la nivelul {score}!</Text>
            <RecordBadge visible={score >= bestScore && score > 0} />
            <GradientButton testID="memory-retry" label="Joacă din nou" colors={["#5E8B7E", "#3D5A52"]} onPress={startGame} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "700", color: theme.colors.textPrimary },
  subtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  body: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  center: { alignItems: "center", maxWidth: 320 },
  introText: { ...theme.font.body, color: theme.colors.textSecondary, textAlign: "center", marginTop: 16, marginBottom: 24 },
  levelText: { ...theme.font.h2, color: theme.colors.textPrimary, marginBottom: 4 },
  hintText: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 28 },
  grid: { flexDirection: "row", flexWrap: "wrap", width: 260, height: 260, gap: 12 },
  tileWrap: {
    width: 124, height: 124, borderRadius: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3,
  },
  tile: { width: 124, height: 124, borderRadius: 20 },
  gameoverTitle: { ...theme.font.h2, color: theme.colors.textPrimary, textAlign: "center", marginTop: 16 },
});
