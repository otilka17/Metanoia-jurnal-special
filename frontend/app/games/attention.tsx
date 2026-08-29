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

const SHAPES = ["ellipse", "square", "triangle", "star"] as const;
type Shape = typeof SHAPES[number];
const COLORS = [theme.colors.primary, theme.colors.secondary, "#7A9E9F", "#9B8CC4"];
const ROUND_LENGTH = 15;
const MATCH_COUNT = 6;
const ITEM_MS = 1200;

type Item = { shape: Shape; color: string };
type Phase = "idle" | "playing" | "gameover";

function randomItem(): Item {
  return { shape: SHAPES[Math.floor(Math.random() * SHAPES.length)], color: COLORS[Math.floor(Math.random() * COLORS.length)] };
}
function isMatch(a: Item, b: Item) { return a.shape === b.shape && a.color === b.color; }
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function AttentionGameScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [target, setTarget] = useState<Item | null>(null);
  const [current, setCurrent] = useState<Item | null>(null);
  const [itemIndex, setItemIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [feedback, setFeedback] = useState<"hit" | "false" | null>(null);

  const targetRef = useRef<Item | null>(null);
  const roundItems = useRef<Item[]>([]);
  const scoreRef = useRef(0);
  const tappedRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await api.myGameScores();
        setBestScore(res.scores?.attention || 0);
      } catch (e) { console.warn(e); }
    })();
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  const finishGame = async () => {
    setPhase("gameover");
    try {
      const res: any = await api.submitGameScore("attention", scoreRef.current);
      if (res.is_new_best) setBestScore(scoreRef.current);
    } catch (e) { console.warn(e); }
  };

  const showItem = (idx: number) => {
    if (idx >= ROUND_LENGTH) { finishGame(); return; }
    tappedRef.current = false;
    setItemIndex(idx);
    setCurrent(roundItems.current[idx]);
    setFeedback(null);
    timer.current = setTimeout(() => showItem(idx + 1), ITEM_MS);
  };

  const startGame = () => {
    if (timer.current) clearTimeout(timer.current);
    const t = randomItem();
    targetRef.current = t;
    setTarget(t);
    const items = Array.from({ length: ROUND_LENGTH }, () => randomItem());
    shuffled(Array.from({ length: ROUND_LENGTH }, (_, i) => i)).slice(0, MATCH_COUNT).forEach((i) => { items[i] = { ...t }; });
    roundItems.current = items;
    scoreRef.current = 0;
    setScore(0);
    setPhase("playing");
    showItem(0);
  };

  const onTap = () => {
    if (phase !== "playing" || tappedRef.current || !current || !targetRef.current) return;
    tappedRef.current = true;
    if (isMatch(current, targetRef.current)) {
      scoreRef.current += 1;
      setFeedback("hit");
    } else {
      scoreRef.current = Math.max(0, scoreRef.current - 1);
      setFeedback("false");
    }
    setScore(scoreRef.current);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: theme.colors.surface }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={26} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Vânătorul de forme</Text>
            <Text style={styles.subtitle}>Record: {bestScore}</Text>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        {phase === "idle" && (
          <View style={styles.center}>
            <GradientCircleIcon icon="eye" colors={["#DE8F6E", "#B5654A"]} />
            <Text style={styles.introText}>Îți arătăm o formă-țintă. Apasă butonul doar când apare exact acea formă, cu acea culoare — ignoră restul.</Text>
            <GradientButton testID="attention-start" label="Începe jocul" colors={["#DE8F6E", "#B5654A"]} onPress={startGame} />
          </View>
        )}

        {phase === "playing" && target && current && (
          <>
            <View style={styles.targetRow}>
              <Text style={styles.targetLabel}>Țintă:</Text>
              <Ionicons name={target.shape} size={22} color={target.color} />
              <Text style={styles.progressText}>{itemIndex + 1}/{ROUND_LENGTH}</Text>
            </View>

            <View style={styles.shapeArea}>
              <Ionicons name={current.shape} size={96} color={current.color} />
              {!!feedback && (
                <Text style={[styles.feedbackText, { color: feedback === "hit" ? theme.colors.primary : theme.colors.error }]}>
                  {feedback === "hit" ? "+1" : "greșit"}
                </Text>
              )}
            </View>

            <Text style={styles.scoreText}>Scor: {score}</Text>

            <PressScale testID="attention-tap" onPress={onTap} style={styles.tapBtnWrap}>
              <LinearGradient colors={["#DE8F6E", "#B5654A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tapBtn}>
                <Text style={styles.tapBtnText}>Apasă!</Text>
              </LinearGradient>
            </PressScale>
          </>
        )}

        {phase === "gameover" && (
          <View style={styles.center}>
            <GradientCircleIcon icon="ribbon" colors={["#DE8F6E", "#B5654A"]} />
            <Text style={styles.gameoverTitle}>Scor final: {score}</Text>
            <RecordBadge visible={score >= bestScore && score > 0} />
            <GradientButton testID="attention-retry" label="Joacă din nou" colors={["#DE8F6E", "#B5654A"]} onPress={startGame} />
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
  targetRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 28 },
  targetLabel: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: "600" },
  progressText: { fontSize: 12, color: theme.colors.textDisabled, marginLeft: 12 },
  shapeArea: { width: 140, height: 140, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  feedbackText: { position: "absolute", bottom: -6, fontSize: 14, fontWeight: "700" },
  scoreText: { fontSize: 15, fontWeight: "700", color: theme.colors.textPrimary, marginBottom: 24 },
  tapBtnWrap: {
    width: 140, height: 140, borderRadius: 70,
    shadowColor: "#B5654A", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 8,
  },
  tapBtn: { width: 140, height: 140, borderRadius: 70, alignItems: "center", justifyContent: "center" },
  tapBtnText: { color: "#fff", fontWeight: "700", fontSize: 18 },
  gameoverTitle: { ...theme.font.h2, color: theme.colors.textPrimary, textAlign: "center", marginTop: 16 },
});
