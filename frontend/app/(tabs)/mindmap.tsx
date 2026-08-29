import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  LayoutAnimation, Platform, UIManager, Modal, Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Sub = { id: string; title: string; points: string[] };
type Cat = { id: string; title: string; subtitle: string; color: string; icon: string; subtopics: Sub[]; hidden_from_mindmap?: boolean };

const MM_BG = "#0E1412";
const NODE_ROOT = "#3A4A52";
const NODE_CAT = "#4A5F58";
const NODE_LEAF = "#5E8B7E";
const TEXT_LIGHT = "#E8EFEC";
const LINE = "#3A4A52";

const animate = () =>
  LayoutAnimation.configureNext(LayoutAnimation.create(220, "easeInEaseOut", "opacity"));

export default function MindMapScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCat, setExpandedCat] = useState<Record<string, boolean>>({});
  const [expandedSub, setExpandedSub] = useState<Record<string, boolean>>({});
  const [allExpanded, setAllExpanded] = useState(false);

  const [leafModal, setLeafModal] = useState<null | {
    point: string; subtopicTitle: string; categoryTitle: string; color: string;
  }>(null);
  const [leafLoading, setLeafLoading] = useState(false);
  const [leafText, setLeafText] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res: any = await api.getCategories();
        const visible = res.categories.filter((c: Cat) => !c.hidden_from_mindmap);
        setCats(visible);
        if (visible[0]) setExpandedCat({ [visible[0].id]: true });
      } catch (e) { console.warn(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const toggleCat = (id: string) => { animate(); setExpandedCat((p) => ({ ...p, [id]: !p[id] })); };
  const toggleSub = (id: string) => { animate(); setExpandedSub((p) => ({ ...p, [id]: !p[id] })); };

  const toggleAll = () => {
    animate();
    if (allExpanded) {
      setExpandedCat({}); setExpandedSub({}); setAllExpanded(false);
    } else {
      const ec: Record<string, boolean> = {};
      const es: Record<string, boolean> = {};
      cats.forEach((c) => {
        ec[c.id] = true;
        c.subtopics.forEach((s) => { es[s.id] = true; });
      });
      setExpandedCat(ec); setExpandedSub(es); setAllExpanded(true);
    }
  };

  const openLeaf = async (point: string, sub: Sub, cat: Cat) => {
    setLeafModal({ point, subtopicTitle: sub.title, categoryTitle: cat.title, color: cat.color });
    setLeafText(""); setLeafLoading(true);
    try {
      const res: any = await api.quickExplain(point, sub.title, cat.title);
      setLeafText(res.explanation);
    } catch (e: any) {
      setLeafText("Nu am putut genera explicația. Încearcă din nou.");
    } finally { setLeafLoading(false); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Mind Map</Text>
          <Text style={styles.headerSub}>Bună, {user?.name?.split(" ")[0] || "părinte"}</Text>
        </View>
        <TouchableOpacity testID="toggle-all-button" style={styles.toggleAllBtn} onPress={toggleAll}>
          <Ionicons name={allExpanded ? "contract" : "expand"} size={14} color={NODE_LEAF} />
          <Text style={styles.toggleAllText}>{allExpanded ? "Restrânge tot" : "Extinde tot"}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={NODE_LEAF} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.rootWrap}>
            <View style={styles.rootNode}>
              <Text style={styles.rootText}>
                Educația și Disciplinarea Copilului{"\n"}Supradotat / Hiperactiv
              </Text>
            </View>
          </View>
          <View style={styles.trunk} />

          {cats.map((cat, ci) => {
            const isOpen = !!expandedCat[cat.id];
            return (
              <View key={cat.id} style={styles.catBlock}>
                <View style={styles.catRow}>
                  <View style={[styles.branchH, { backgroundColor: cat.color }]} />
                  <TouchableOpacity
                    testID={`mm-cat-${ci}`} activeOpacity={0.8}
                    onPress={() => toggleCat(cat.id)}
                    style={[styles.catNode, { borderLeftColor: cat.color }]}
                  >
                    <Ionicons name={cat.icon as any} size={16} color={cat.color} />
                    <Text style={styles.catText}>{cat.title}</Text>
                    <Ionicons name={isOpen ? "chevron-down" : "chevron-forward"} size={16} color={cat.color} />
                  </TouchableOpacity>
                </View>

                {isOpen && (
                  <View style={styles.subsContainer}>
                    <View style={[styles.vline, { backgroundColor: cat.color + "55" }]} />
                    {cat.subtopics.map((sub, si) => {
                      const subOpen = !!expandedSub[sub.id];
                      return (
                        <View key={sub.id} style={styles.subBlock}>
                          <View style={styles.subRow}>
                            <View style={[styles.branchHSmall, { backgroundColor: cat.color + "77" }]} />
                            <TouchableOpacity
                              testID={`mm-sub-${ci}-${si}`} activeOpacity={0.8}
                              onPress={() => toggleSub(sub.id)}
                              style={[styles.subNode, { borderColor: cat.color + "88" }]}
                            >
                              <Text style={styles.subText}>{sub.title}</Text>
                              <Ionicons name={subOpen ? "chevron-down" : "chevron-forward"} size={14} color={cat.color} />
                            </TouchableOpacity>
                          </View>

                          {subOpen && (
                            <View style={styles.leavesContainer}>
                              <View style={[styles.vlineSmall, { backgroundColor: cat.color + "44" }]} />
                              {sub.points.map((p, pi) => (
                                <View key={pi} style={styles.leafRow}>
                                  <View style={[styles.branchHTiny, { backgroundColor: cat.color + "55" }]} />
                                  <TouchableOpacity
                                    testID={`mm-leaf-${ci}-${si}-${pi}`}
                                    activeOpacity={0.7}
                                    onPress={() => openLeaf(p, sub, cat)}
                                    style={[styles.leafNode, { borderColor: cat.color + "55" }]}
                                  >
                                    <Text style={styles.leafText}>{p}</Text>
                                    <Ionicons name="sparkles-outline" size={12} color={cat.color + "AA"} />
                                  </TouchableOpacity>
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

      <Modal visible={!!leafModal} transparent animationType="fade" onRequestClose={() => setLeafModal(null)}>
        <Pressable style={styles.modalBg} onPress={() => setLeafModal(null)}>
          <Pressable style={[styles.modalCard, { borderTopColor: leafModal?.color || NODE_LEAF }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Ionicons name="sparkles" size={18} color={leafModal?.color || NODE_LEAF} />
              <Text style={[styles.modalBadge, { color: leafModal?.color || NODE_LEAF }]}>EXPLICAȚIE RAPIDĂ</Text>
              <TouchableOpacity onPress={() => setLeafModal(null)} testID="close-leaf-modal">
                <Ionicons name="close" size={22} color="#8FA09A" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalPoint}>{leafModal?.point}</Text>
            <View style={styles.modalDivider} />
            {leafLoading ? (
              <View style={{ paddingVertical: 24, alignItems: "center" }}>
                <ActivityIndicator color={leafModal?.color || NODE_LEAF} />
                <Text style={styles.modalLoadingText}>Generăm explicația...</Text>
              </View>
            ) : (
              <>
                <Text style={styles.modalText}>{leafText}</Text>
                <TouchableOpacity
                  testID="bookmark-leaf-button"
                  style={[styles.bookmarkLeafBtn, { borderColor: leafModal?.color || NODE_LEAF }]}
                  onPress={async () => {
                    if (!leafModal) return;
                    try {
                      const sub = cats.flatMap(c => c.subtopics.map(s => ({ s, c }))).find(x => x.s.title === leafModal.subtopicTitle);
                      if (!sub) return;
                      await api.addBookmark({
                        subtopic_id: sub.s.id, title: leafModal.subtopicTitle,
                        category_id: sub.c.id, type: "explanation",
                        point: leafModal.point, explanation: leafText,
                      });
                      setLeafModal(null);
                    } catch (e) { console.warn(e); }
                  }}
                >
                  <Ionicons name="bookmark-outline" size={14} color={leafModal?.color || NODE_LEAF} />
                  <Text style={[styles.bookmarkLeafText, { color: leafModal?.color || NODE_LEAF }]}>Salvează explicația</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: MM_BG },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: TEXT_LIGHT },
  headerSub: { fontSize: 13, color: "#8FA09A", marginTop: 2 },
  toggleAllBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#1B2521", borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: NODE_LEAF + "55",
  },
  toggleAllText: { color: NODE_LEAF, fontSize: 12, fontWeight: "600" },
  scroll: { paddingHorizontal: 12, paddingBottom: 24 },

  rootWrap: { alignItems: "center", marginTop: 12 },
  rootNode: {
    backgroundColor: NODE_ROOT, borderRadius: 12,
    paddingHorizontal: 18, paddingVertical: 14,
    borderWidth: 1.5, borderColor: "#5C7268", maxWidth: 320,
  },
  rootText: { color: TEXT_LIGHT, fontWeight: "600", textAlign: "center", fontSize: 14, lineHeight: 19 },
  trunk: { width: 2, height: 20, backgroundColor: LINE, alignSelf: "center" },

  catBlock: { marginBottom: 6 },
  catRow: { flexDirection: "row", alignItems: "center" },
  branchH: { height: 2, width: 24 },
  catNode: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: NODE_CAT, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderLeftWidth: 4, marginVertical: 4,
  },
  catText: { flex: 1, color: TEXT_LIGHT, fontWeight: "600", fontSize: 14 },

  subsContainer: { paddingLeft: 28, position: "relative" },
  vline: { position: "absolute", left: 32, top: 0, bottom: 12, width: 2 },

  subBlock: { marginVertical: 4 },
  subRow: { flexDirection: "row", alignItems: "center" },
  branchHSmall: { height: 2, width: 18 },
  subNode: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#1B2521", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1,
  },
  subText: { color: TEXT_LIGHT, fontSize: 13, flex: 1, marginRight: 8 },

  leavesContainer: { paddingLeft: 22, marginTop: 4, position: "relative" },
  vlineSmall: { position: "absolute", left: 26, top: 0, bottom: 12, width: 1.5 },

  leafRow: { flexDirection: "row", alignItems: "center", marginVertical: 3 },
  branchHTiny: { height: 1.5, width: 14 },
  leafNode: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8,
    backgroundColor: "#162520", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1,
  },
  leafText: { flex: 1, color: "#C5D4CD", fontSize: 12, lineHeight: 16 },

  readBtn: {
    alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, marginTop: 10, marginLeft: 14,
  },
  readBtnText: { color: "#fff", fontWeight: "600", fontSize: 12 },

  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", paddingHorizontal: 20 },
  modalCard: {
    backgroundColor: "#1B2521", borderRadius: 18, padding: 20,
    borderTopWidth: 4,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  modalBadge: { flex: 1, fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  modalPoint: { color: TEXT_LIGHT, fontSize: 16, fontWeight: "600", lineHeight: 22 },
  modalDivider: { height: 1, backgroundColor: "#2A3A33", marginVertical: 14 },
  modalText: { color: "#C5D4CD", fontSize: 14, lineHeight: 21 },
  modalLoadingText: { color: "#8FA09A", fontSize: 13, marginTop: 10 },
  bookmarkLeafBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start", marginTop: 16,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1.5,
  },
  bookmarkLeafText: { fontSize: 12, fontWeight: "600" },
});
