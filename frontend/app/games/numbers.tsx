import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "@/src/lib/api";
import { theme } from "@/src/lib/theme";
import { GradientButton } from "@/src/components/games/GradientButton";
import { GradientCircleIcon } from "@/src/components/games/GradientCircleIcon";
import { RecordBadge } from "@/src/components/games/RecordBadge";

const NUMBERS_GRADIENT: [string, string] = ["#7A9E9F", "#4F6C6D"];

const BOARD_W = 300;
const BOARD_H = 380;
const NODE_SIZE = 44;
const START_COUNT = 5;

type Node = { num: number; x: number; y: number };
type Phase = "idle" | "playing" | "gameover";

function generatePositions(count: number): Node[] {
  const placed: { x: number; y: number }[] = [];
  const maxX = BOARD_W - NODE_SIZE;
  const maxY = BOARD_H - NODE_SIZE;
  for (let i = 0; i < count; i++) {
    let x = 0, y = 0, tries = 0;
    do {
      x = Math.random() * maxX;
      y = Math.random() * maxY;
      tries++;
    } while (
      tries < 40 &&
      placed.some((p) => Math.hypot(p.x - x, p.y - y) < NODE_SIZE * 1.05)
    );
    placed.push({ x, y });
  }
  const numbers = Array.from({ length: count }, (_, i) => i + 1);
  return placed.map((p, i) => ({ num: numbers[i], x: p.x, y: p.y }));
}

export default function NumbersGameScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [level, setLevel] = useState(START_COUNT);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [nextExpected, setNextExpected] = useState(1);
  const [tapped, setTapped] = useState<Set<number>>(new Set());
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await api.myGameScores();
        setBestScore(res.scores?.numbers || 0);
      } catch (e) { console.warn(e); }
    })();
    return () => { timeouts.current.forEach(clearTimeout); };
  }, []);

  const clearTimers = () => { timeouts.current.forEach(clearTimeout); timeouts.current = []; };
  const after = (ms: number, fn: () => void) => { timeouts.current.push(setTimeout(fn, ms)); };

  const submitScore = async (finalScore: number) => {
    try {
      const res: any = await api.submitGameScore("numbers", finalScore);
      if (res.is_new_best) setBestScore(finalScore);
    } catch (e) { console.warn(e); }
  };

  const startRound = (count: number) => {
    setNodes(generatePositions(count));
    setNextExpected(1);
    setTapped(new Set());
  };

  const startGame = () => {
    clearTimers();
    setLevel(START_COUNT);
    setScore(0);
    setPhase("playing");
    startRound(START_COUNT);
  };

  const onTapNode = (num: number) => {
    if (phase !== "playing") return;
    if (num === nextExpected) {
      const newTapped = new Set(tapped); newTapped.add(num);
      setTapped(newTapped);
      if (num === level) {
        setScore(level);
        after(450, () => {
          const nextLevel = level + 1;
          setLevel(nextLevel);
          startRound(nextLevel);
        });
      } else {
        setNextExpected(num + 1);
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
            <Text style={styles.title}>Ordinea Numerelor</Text>
            <Text style={styles.subtitle}>Record: {bestScore}</Text>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        {phase === "idle" && (
          <View style={styles.center}>
            <GradientCircleIcon icon="locate" colors={NUMBERS_GRADIENT} />
            <Text style={styles.introText}>Numerele sunt împrăștiate pe ecran. Apasă-le în ordine, de la 1 în sus, cât mai repede. La fiecare rundă se adaugă un număr în plus.</Text>
            <GradientButton testID="numbers-start" label="Începe jocul" colors={NUMBERS_GRADIENT} onPress={startGame} />
          </View>
        )}

        {phase === "playing" && (
          <>
            <View style={styles.statusRow}>
              <Text style={styles.levelText}>Nivel {level}</Text>
              <Text style={styles.nextText}>Următorul: {nextExpected}</Text>
            </View>
            <View style={styles.board}>
              {nodes.map((n) => {
                const isTapped = tapped.has(n.num);
                return (
                  <TouchableOpacity
                    key={n.num}
                    testID={`numbers-node-${n.num}`}
                    disabled={isTapped}
                    onPress={() => onTapNode(n.num)}
                    activeOpacity={0.75}
                    style={[styles.nodeWrap, { left: n.x, top: n.y, opacity: isTapped ? 0.35 : 1 }]}
                  >
                    {isTapped ? (
                      <View style={[styles.node, { backgroundColor: theme.colors.border }]}>
                        <Text style={[styles.nodeText, { color: theme.colors.textDisabled }]}>{n.num}</Text>
                      </View>
                    ) : (
                      <LinearGradient colors={NUMBERS_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.node}>
                        <Text style={styles.nodeText}>{n.num}</Text>
                      </LinearGradient>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {phase === "gameover" && (
          <View style={styles.center}>
            <GradientCircleIcon icon="ribbon" colors={["#DE8F6E", "#B5654A"]} />
            <Text style={styles.gameoverTitle}>Ai ajuns la nivelul {score}!</Text>
            <RecordBadge visible={score >= bestScore && score > 0} />
            <GradientButton testID="numbers-retry" label="Joacă din nou" colors={NUMBERS_GRADIENT} onPress={startGame} />
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
  statusRow: { flexDirection: "row", justifyContent: "space-between", width: BOARD_W, marginBottom: 12 },
  levelText: { fontSize: 15, fontWeight: "700", color: theme.colors.textPrimary },
  nextText: { fontSize: 13, color: theme.colors.textSecondary },
  board: { width: BOARD_W, height: BOARD_H, backgroundColor: theme.colors.surfaceElevated, borderRadius: 20, position: "relative", overflow: "hidden" },
  nodeWrap: {
    position: "absolute", width: NODE_SIZE, height: NODE_SIZE,
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 3,
  },
  node: { width: NODE_SIZE, height: NODE_SIZE, borderRadius: NODE_SIZE / 2, alignItems: "center", justifyContent: "center" },
  nodeText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  gameoverTitle: { ...theme.font.h2, color: theme.colors.textPrimary, textAlign: "center", marginTop: 16 },
});
