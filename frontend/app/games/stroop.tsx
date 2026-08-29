import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/lib/api";
import { theme } from "@/src/lib/theme";

const COLOR_DEFS = [
  { name: "ROȘU", hex: "#D9534F" },
  { name: "ALBASTRU", hex: "#4A7C9E" },
  { name: "VERDE", hex: "#5E8B57" },
  { name: "GALBEN", hex: "#E8B33C" },
  { name: "MOV", hex: "#8B6FA8" },
];
const ROUND_LENGTH = 15;
const ITEM_MS = 3500;

type Round = { word: string; ink: string };
type Phase = "idle" | "playing" | "gameover";

function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

export default function StroopGameScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [round, setRound] = useState<Round | null>(null);
  const [itemIndex, setItemIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [feedback, setFeedback] = useState<"hit" | "miss" | null>(null);

  const scoreRef = useRef(0);
  const tappedRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await api.myGameScores();
        setBestScore(res.scores?.stroop || 0);
      } catch (e) { console.warn(e); }
    })();
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  const finishGame = async () => {
    setPhase("gameover");
    try {
      const res: any = await api.submitGameScore("stroop", scoreRef.current);
      if (res.is_new_best) setBestScore(scoreRef.current);
    } catch (e) { console.warn(e); }
  };

  const showRound = (idx: number) => {
    if (idx >= ROUND_LENGTH) { finishGame(); return; }
    const wordDef = pick(COLOR_DEFS);
    const inkDef = pick(COLOR_DEFS.filter((c) => c.name !== wordDef.name));
    tappedRef.current = false;
    setItemIndex(idx);
    setRound({ word: wordDef.name, ink: inkDef.hex });
    setFeedback(null);
    timer.current = setTimeout(() => showRound(idx + 1), ITEM_MS);
  };

  const startGame = () => {
    if (timer.current) clearTimeout(timer.current);
    scoreRef.current = 0;
    setScore(0);
    setPhase("playing");
    showRound(0);
  };

  const onTapColor = (hex: string) => {
    if (phase !== "playing" || tappedRef.current || !round) return;
    tappedRef.current = true;
    if (timer.current) clearTimeout(timer.current);
    if (hex === round.ink) {
      scoreRef.current += 1;
      setFeedback("hit");
    } else {
      setFeedback("miss");
    }
    setScore(scoreRef.current);
    timer.current = setTimeout(() => showRound(itemIndex + 1), 500);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: theme.colors.surface }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={26} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Stroop Culori</Text>
            <Text style={styles.subtitle}>Record: {bestScore}</Text>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        {phase === "idle" && (
          <View style={styles.center}>
            <Ionicons name="color-filter" size={48} color={theme.colors.secondary} />
            <Text style={styles.introText}>Vei vedea un cuvânt-culoare scris cu altă culoare de cerneală. Apasă culoarea cernelii, nu cuvântul citit — ignoră ce scrie!</Text>
            <TouchableOpacity testID="stroop-start" style={styles.startBtn} onPress={startGame}>
              <Text style={styles.startBtnText}>Începe jocul</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === "playing" && round && (
          <>
            <Text style={styles.progressText}>{itemIndex + 1}/{ROUND_LENGTH}</Text>
            <View style={styles.wordArea}>
              <Text style={[styles.wordText, { color: round.ink }]}>{round.word}</Text>
              {!!feedback && (
                <Text style={[styles.feedbackText, { color: feedback === "hit" ? theme.colors.primary : theme.colors.error }]}>
                  {feedback === "hit" ? "+1" : "greșit"}
                </Text>
              )}
            </View>

            <Text style={styles.scoreText}>Scor: {score}</Text>

            <View style={styles.optionsRow}>
              {COLOR_DEFS.map((c) => (
                <TouchableOpacity
                  key={c.name}
                  testID={`stroop-color-${c.name}`}
                  style={[styles.colorBtn, { backgroundColor: c.hex }]}
                  onPress={() => onTapColor(c.hex)}
                  activeOpacity={0.7}
                />
              ))}
            </View>
          </>
        )}

        {phase === "gameover" && (
          <View style={styles.center}>
            <Ionicons name="ribbon" size={48} color={theme.colors.secondary} />
            <Text style={styles.gameoverTitle}>Scor final: {score}/{ROUND_LENGTH}</Text>
            {score >= bestScore && score > 0 && <Text style={styles.newBestText}>Record nou! 🎉</Text>}
            <TouchableOpacity testID="stroop-retry" style={styles.startBtn} onPress={startGame}>
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
  progressText: { fontSize: 12, color: theme.colors.textDisabled, marginBottom: 20 },
  wordArea: { minHeight: 90, alignItems: "center", justifyContent: "center" },
  wordText: { fontSize: 40, fontWeight: "800" },
  feedbackText: { marginTop: 8, fontSize: 14, fontWeight: "700" },
  scoreText: { fontSize: 15, fontWeight: "700", color: theme.colors.textPrimary, marginTop: 8, marginBottom: 28 },
  optionsRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 14 },
  colorBtn: { width: 56, height: 56, borderRadius: 28 },
  gameoverTitle: { ...theme.font.h2, color: theme.colors.textPrimary, textAlign: "center", marginTop: 16 },
  newBestText: { fontSize: 14, fontWeight: "700", color: theme.colors.secondary, marginTop: 8, marginBottom: 8 },
});
