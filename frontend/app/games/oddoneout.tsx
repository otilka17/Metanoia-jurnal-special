import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/lib/api";
import { theme } from "@/src/lib/theme";

const SHAPES = ["ellipse", "square", "triangle", "star"] as const;
type Shape = typeof SHAPES[number];
const COLORS = [theme.colors.primary, theme.colors.secondary, "#7A9E9F", "#9B8CC4", theme.colors.warning];

type Item = { shape: Shape; color: string };
type Phase = "idle" | "playing" | "gameover";

function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function differentFrom<T>(arr: readonly T[], value: T): T {
  const rest = arr.filter((v) => v !== value);
  return pick(rest);
}
function itemCountFor(level: number) { return Math.min(8 + (level - 1) * 4, 32); }
function timeMsFor(level: number) { return Math.max(3000, 8000 - (level - 1) * 500); }

export default function OddOneOutGameScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [level, setLevel] = useState(1);
  const [items, setItems] = useState<Item[]>([]);
  const [oddIndex, setOddIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  const levelRef = useRef(1);
  const scoreRef = useRef(0);
  const oddIndexRef = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await api.myGameScores();
        setBestScore(res.scores?.oddoneout || 0);
      } catch (e) { console.warn(e); }
    })();
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  const submitScore = async (finalScore: number) => {
    try {
      const res: any = await api.submitGameScore("oddoneout", finalScore);
      if (res.is_new_best) setBestScore(finalScore);
    } catch (e) { console.warn(e); }
  };

  const endGame = () => {
    if (timer.current) clearTimeout(timer.current);
    setPhase("gameover");
    submitScore(scoreRef.current);
  };

  const startRound = (lvl: number) => {
    const count = itemCountFor(lvl);
    const baseShape = pick(SHAPES);
    const baseColor = pick(COLORS);
    const idx = Math.floor(Math.random() * count);
    const diffByColor = Math.random() < 0.5;
    const oddItem: Item = diffByColor
      ? { shape: baseShape, color: differentFrom(COLORS, baseColor) }
      : { shape: differentFrom(SHAPES, baseShape), color: baseColor };
    const arr: Item[] = Array.from({ length: count }, () => ({ shape: baseShape, color: baseColor }));
    arr[idx] = oddItem;
    setItems(arr);
    setOddIndex(idx);
    oddIndexRef.current = idx;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(endGame, timeMsFor(lvl));
  };

  const startGame = () => {
    levelRef.current = 1;
    scoreRef.current = 0;
    setLevel(1);
    setScore(0);
    setPhase("playing");
    startRound(1);
  };

  const onTapItem = (idx: number) => {
    if (phase !== "playing") return;
    if (idx === oddIndexRef.current) {
      scoreRef.current = levelRef.current;
      setScore(scoreRef.current);
      const nextLevel = levelRef.current + 1;
      levelRef.current = nextLevel;
      setLevel(nextLevel);
      startRound(nextLevel);
    } else {
      endGame();
    }
  };

  const columns = Math.ceil(Math.sqrt(items.length || 1));
  const cellSize = Math.min(72, Math.floor(300 / columns) - 8);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: theme.colors.surface }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={26} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Vânează Intrusul</Text>
            <Text style={styles.subtitle}>Record: {bestScore}</Text>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        {phase === "idle" && (
          <View style={styles.center}>
            <Ionicons name="search" size={48} color={theme.colors.secondary} />
            <Text style={styles.introText}>Printre formele identice se ascunde una diferită — de culoare sau de formă. Găsește-o cât mai repede. La fiecare rundă apar mai multe forme și mai puțin timp.</Text>
            <TouchableOpacity testID="oddoneout-start" style={styles.startBtn} onPress={startGame}>
              <Text style={styles.startBtnText}>Începe jocul</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === "playing" && (
          <>
            <Text style={styles.levelText}>Nivel {level}</Text>
            <View style={[styles.grid, { width: columns * (cellSize + 8) }]}>
              {items.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  testID={`oddoneout-item-${i}`}
                  onPress={() => onTapItem(i)}
                  style={[styles.cell, { width: cellSize, height: cellSize }]}
                >
                  <Ionicons name={item.shape} size={cellSize * 0.6} color={item.color} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {phase === "gameover" && (
          <View style={styles.center}>
            <Ionicons name="ribbon" size={48} color={theme.colors.secondary} />
            <Text style={styles.gameoverTitle}>Ai ajuns la nivelul {score}!</Text>
            {score >= bestScore && score > 0 && <Text style={styles.newBestText}>Record nou! 🎉</Text>}
            <TouchableOpacity testID="oddoneout-retry" style={styles.startBtn} onPress={startGame}>
              <Text style={styles.startBtnText}>Joacă din nou</Text>
            </TouchableOpacity>
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
  startBtn: { backgroundColor: theme.colors.primary, borderRadius: 999, paddingHorizontal: 32, paddingVertical: 14 },
  startBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  levelText: { ...theme.font.h2, color: theme.colors.textPrimary, marginBottom: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  cell: { alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surfaceElevated, borderRadius: 14 },
  gameoverTitle: { ...theme.font.h2, color: theme.colors.textPrimary, textAlign: "center", marginTop: 16 },
  newBestText: { fontSize: 14, fontWeight: "700", color: theme.colors.secondary, marginTop: 8, marginBottom: 8 },
});
