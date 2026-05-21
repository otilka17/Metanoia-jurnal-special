import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";

type Sub = { id: string; title: string; points: string[] };
type Cat = { id: string; title: string; subtitle: string; color: string; icon: string; subtopics: Sub[] };

const MM_BG = "#0E1412";
const NODE_ROOT = "#3A4A52";
const NODE_CAT = "#4A5F58";
const NODE_LEAF = "#5E8B7E";
const TEXT_LIGHT = "#E8EFEC";
const LINE = "#3A4A52";

export default function MindMapScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCat, setExpandedCat] = useState<Record<string, boolean>>({});
  const [expandedSub, setExpandedSub] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const res: any = await api.getCategories();
        setCats(res.categories);
        // expand first by default
        if (res.categories[0]) setExpandedCat({ [res.categories[0].id]: true });
      } catch (e) { console.warn(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const toggleCat = (id: string) =>
    setExpandedCat((p) => ({ ...p, [id]: !p[id] }));
  const toggleSub = (id: string) =>
    setExpandedSub((p) => ({ ...p, [id]: !p[id] }));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mind Map</Text>
          <Text style={styles.headerSub}>Bună, {user?.name?.split(" ")[0] || "părinte"} — explorează structura ghidului</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={NODE_LEAF} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ROOT NODE */}
          <View style={styles.rootWrap}>
            <View style={styles.rootNode}>
              <Text style={styles.rootText}>
                Educația și Disciplinarea Copilului{"\n"}Supradotat / Hiperactiv
              </Text>
            </View>
          </View>

          {/* TRUNK LINE */}
          <View style={styles.trunk} />

          {/* CATEGORIES */}
          {cats.map((cat, ci) => {
            const isLast = ci === cats.length - 1;
            const isOpen = !!expandedCat[cat.id];
            return (
              <View key={cat.id} style={styles.catBlock}>
                <View style={styles.catRow}>
                  <View style={[styles.branchH, { backgroundColor: cat.color }]} />
                  <TouchableOpacity
                    testID={`mm-cat-${ci}`}
                    activeOpacity={0.8}
                    onPress={() => toggleCat(cat.id)}
                    style={[styles.catNode, { borderColor: cat.color }]}
                  >
                    <Ionicons name={cat.icon as any} size={16} color={cat.color} />
                    <Text style={styles.catText}>{cat.title}</Text>
                    <Ionicons
                      name={isOpen ? "chevron-down" : "chevron-forward"}
                      size={16}
                      color={cat.color}
                    />
                  </TouchableOpacity>
                </View>

                {isOpen && (
                  <View style={styles.subsContainer}>
                    {/* vertical line for subs */}
                    <View style={[styles.vline, { backgroundColor: cat.color + "55" }]} />
                    {cat.subtopics.map((sub, si) => {
                      const subOpen = !!expandedSub[sub.id];
                      return (
                        <View key={sub.id} style={styles.subBlock}>
                          <View style={styles.subRow}>
                            <View style={[styles.branchHSmall, { backgroundColor: cat.color + "77" }]} />
                            <TouchableOpacity
                              testID={`mm-sub-${ci}-${si}`}
                              activeOpacity={0.8}
                              onPress={() => toggleSub(sub.id)}
                              style={[styles.subNode, { borderColor: cat.color + "88" }]}
                            >
                              <Text style={styles.subText}>{sub.title}</Text>
                              <Ionicons
                                name={subOpen ? "chevron-down" : "chevron-forward"}
                                size={14}
                                color={cat.color}
                              />
                            </TouchableOpacity>
                          </View>

                          {subOpen && (
                            <View style={styles.leavesContainer}>
                              <View style={[styles.vlineSmall, { backgroundColor: cat.color + "44" }]} />
                              {sub.points.map((p, pi) => (
                                <View key={pi} style={styles.leafRow}>
                                  <View style={[styles.branchHTiny, { backgroundColor: cat.color + "55" }]} />
                                  <View style={[styles.leafNode, { borderColor: cat.color + "55" }]}>
                                    <Text style={styles.leafText}>{p}</Text>
                                  </View>
                                </View>
                              ))}
                              <TouchableOpacity
                                testID={`mm-read-${ci}-${si}`}
                                style={[styles.readBtn, { backgroundColor: cat.color }]}
                                onPress={() => router.push(`/article/${sub.id}`)}
                              >
                                <Ionicons name="book-outline" size={14} color="#fff" />
                                <Text style={styles.readBtnText}>Citește articolul complet</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: MM_BG },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: TEXT_LIGHT },
  headerSub: { fontSize: 13, color: "#8FA09A", marginTop: 4 },
  scroll: { paddingHorizontal: 12, paddingBottom: 24 },

  rootWrap: { alignItems: "center", marginTop: 12 },
  rootNode: {
    backgroundColor: NODE_ROOT,
    borderRadius: 12,
    paddingHorizontal: 18, paddingVertical: 14,
    borderWidth: 1.5, borderColor: "#5C7268",
    maxWidth: 320,
  },
  rootText: { color: TEXT_LIGHT, fontWeight: "600", textAlign: "center", fontSize: 14, lineHeight: 19 },
  trunk: { width: 2, height: 20, backgroundColor: LINE, alignSelf: "center" },

  catBlock: { marginBottom: 6 },
  catRow: { flexDirection: "row", alignItems: "center" },
  branchH: { height: 2, width: 24 },
  catNode: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: NODE_CAT,
    borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderLeftWidth: 4,
    marginVertical: 4,
  },
  catText: { flex: 1, color: TEXT_LIGHT, fontWeight: "600", fontSize: 14 },

  subsContainer: { paddingLeft: 28, position: "relative" },
  vline: { position: "absolute", left: 32, top: 0, bottom: 12, width: 2 },

  subBlock: { marginVertical: 4 },
  subRow: { flexDirection: "row", alignItems: "center" },
  branchHSmall: { height: 2, width: 18 },
  subNode: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#1B2521",
    borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1,
  },
  subText: { color: TEXT_LIGHT, fontSize: 13, flex: 1, marginRight: 8 },

  leavesContainer: { paddingLeft: 22, marginTop: 4, position: "relative" },
  vlineSmall: { position: "absolute", left: 26, top: 0, bottom: 12, width: 1.5 },

  leafRow: { flexDirection: "row", alignItems: "center", marginVertical: 3 },
  branchHTiny: { height: 1.5, width: 14 },
  leafNode: {
    flex: 1, backgroundColor: "#162520",
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1,
  },
  leafText: { color: "#C5D4CD", fontSize: 12, lineHeight: 16 },

  readBtn: {
    alignSelf: "flex-start",
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, marginTop: 10, marginLeft: 14,
  },
  readBtnText: { color: "#fff", fontWeight: "600", fontSize: 12 },
});
