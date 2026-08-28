import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, Pressable, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Alert } from "@/src/lib/alert";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";
import { storage } from "@/src/utils/storage";
import { theme } from "@/src/lib/theme";

type Category = { id: string; title: string; subtitle: string; color: string; icon: string; profiles?: string[]; subtopics: { id: string; title: string }[] };
type Review = { id: string; author_name: string; rating: number; comment: string; created_at: string; is_mine: boolean };

const PROFILE_FILTERS: { key: string; label: string }[] = [
  { key: "toate", label: "Toate" },
  { key: "supradotat", label: "Supradotat" },
  { key: "adhd", label: "ADHD" },
  { key: "autism", label: "Autism" },
  { key: "sensibil", label: "Sensibilitate emoțională" },
];
const PROFILE_KEY = "categories_profile_filter";

const DAILY_TIPS: { age: "3-6" | "6-10" | "10-14" | "14+" | "all"; text: string }[] = [
  { age: "all", text: "Conectează-te cu copilul tău înainte de a corecta. Comportamentul este o formă de comunicare." },
  { age: "all", text: "Validează emoția copilului înainte de a negocia regula: „Văd că ești supărat. Regula rămâne, dar sentimentul tău contează.”" },
  { age: "6-10", text: "Oferă două variante de alegere când vrei cooperare: autonomia reduce opoziționismul." },
  { age: "6-10", text: "Pauzele scurte de mișcare (2-3 minute) cresc concentrarea — nu sunt timp pierdut." },
  { age: "10-14", text: "Laudă efortul și strategia, nu doar rezultatul: „Văd cât te-ai gândit la pasul ăsta.”" },
  { age: "all", text: "Rămâi calm în momentul de criză. Neuronii oglindă ai copilului învață din reglarea ta." },
  { age: "all", text: "Heterocronia este reală: mintea copilului poate fi „adultă”, dar emoțiile rămân de vârsta lui." },
  { age: "3-6", text: "Întrebările incomode sunt curiozitate, nu sfidare. Răspunde cu „hai să aflăm împreună”." },
  { age: "3-6", text: "Rutina nu este rigiditate — este predictibilitate care reduce anxietatea." },
  { age: "all", text: "Sensibilitatea profundă nu se „repară”. Se înțelege și se canalizează." },
  { age: "3-6", text: "Time-in, nu time-out: prezența ta este reglator pentru sistemul lui nervos." },
  { age: "10-14", text: "Întrebarea „de ce ai făcut asta?” nu primește răspuns. Întreabă „ce ai simțit înainte?”." },
  { age: "6-10", text: "Plictiseala la școală poate masca supradotarea. Notele mici nu spun toată povestea." },
  { age: "10-14", text: "Idealismul precoce și simțul dreptății sunt trăsături centrale — nu „faze”." },
  { age: "6-10", text: "Energia debordantă nu este ADHD automat. Contextul și adaptabilitatea contează." },
  { age: "6-10", text: "Un mediu stimulant scade agitația la copilul supradotat. La cel cu ADHD persistă." },
  { age: "14+", text: "Reziliența se învață prin eșecuri mici și sigure, nu prin victorii constante." },
  { age: "14+", text: "Comunicarea asertivă în familie modelează comunicarea lui în societate." },
  { age: "all", text: "Acceptă „spikey profile”: poate fi avansat la unele lucruri și în urmă la altele." },
  { age: "all", text: "Evaluarea psihologică nu este o etichetă — este o hartă a resurselor și nevoilor." },
  { age: "6-10", text: "Sare peste recompense materiale pentru lucruri firești. Motivează intrinsec." },
  { age: "3-6", text: "Înainte de meltdown, urmărește semnalele timpurii: oboseală, foame, suprastimulare." },
  { age: "all", text: "În meltdown, prioritatea este siguranța — nu lecția. Lecția vine mai târziu, la calm." },
  { age: "6-10", text: "Respirația profundă se exersează la momente bune, nu doar în criză." },
  { age: "3-6", text: "Tehnica „locului fericit” — vizualizarea unui spațiu sigur — ajută la auto-reglare." },
  { age: "all", text: "Limbajul tău este modelul lui. Spune ce simți, nu doar ce trebuie făcut." },
  { age: "6-10", text: "Atenția selectivă a copilului supradotat e ca un far. Direcționează-o, nu o opri." },
  { age: "all", text: "Timpul special zilnic (15 min, 1-la-1, fără ecrane) construiește încrederea pe termen lung." },
  { age: "10-14", text: "Validează nemulțumirea: „E corect să fii dezamăgit.” Dar nu negocia regula." },
  { age: "all", text: "Cel mai bun părinte nu este perfect — este conștient și dispus să repare când greșește." },
];

const AGE_KEY = "child_age_group";

function getDailyTip(filter: string): { text: string; age: string } {
  const pool = filter === "all" ? DAILY_TIPS : DAILY_TIPS.filter(t => t.age === filter || t.age === "all");
  const start = new Date(2025, 0, 1).getTime();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dayIdx = Math.floor((today.getTime() - start) / 86400000);
  const tip = pool[((dayIdx % pool.length) + pool.length) % pool.length];
  return { text: tip.text, age: tip.age };
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ageGroup, setAgeGroup] = useState<string>("all");
  const [profileFilter, setProfileFilter] = useState<string>("toate");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsAvg, setReviewsAvg] = useState(0);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  const load = async () => {
    try { const res: any = await api.getCategories(); setCats(res.categories); } catch (e) { console.warn(e); }
  };
  const loadReviews = async () => {
    try {
      const res: any = await api.listReviews();
      setReviews(res.reviews || []);
      setReviewsAvg(res.average || 0);
      setReviewsCount(res.count || 0);
    } catch (e) { console.warn(e); }
  };
  useEffect(() => {
    (async () => {
      const saved = await storage.getItem(AGE_KEY, "all");
      setAgeGroup(saved || "all");
      const savedProfile = await storage.getItem(PROFILE_KEY, "toate");
      setProfileFilter(savedProfile || "toate");
      await Promise.all([load(), loadReviews()]);
      setLoading(false);
    })();
  }, []);
  const onRefresh = async () => { setRefreshing(true); await Promise.all([load(), loadReviews()]); setRefreshing(false); };
  const changeAge = async (a: string) => { setAgeGroup(a); await storage.setItem(AGE_KEY, a); };

  const myReview = reviews.find(r => r.is_mine);
  const openReviewModal = () => {
    setMyRating(myReview?.rating || 0);
    setMyComment(myReview?.comment || "");
    setShowReviewModal(true);
  };
  const saveReview = async () => {
    if (myRating < 1) { Alert.alert("Alege un rating", "Selectează cel puțin o stea."); return; }
    setSavingReview(true);
    try {
      await api.upsertReview(myRating, myComment.trim());
      setShowReviewModal(false);
      await loadReviews();
    } catch (e: any) {
      Alert.alert("Eroare", e.message || "Nu am putut salva recenzia");
    } finally {
      setSavingReview(false);
    }
  };
  const deleteReview = (r: Review) => {
    Alert.alert("Șterge recenzia?", "", [
      { text: "Anulează", style: "cancel" },
      {
        text: "Șterge", style: "destructive", onPress: async () => {
          try {
            if (r.is_mine) await api.deleteMyReview();
            else await api.adminDeleteReview(r.id);
            await loadReviews();
          } catch (e: any) { Alert.alert("Eroare", e.message || "Eroare la ștergere"); }
        },
      },
    ]);
  };
  const changeProfile = async (p: string) => { setProfileFilter(p); await storage.setItem(PROFILE_KEY, p); };

  const visibleCats = profileFilter === "toate" ? cats : cats.filter(c => c.profiles?.includes(profileFilter));

  const tip = getDailyTip(ageGroup);

  return (
    <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greet}>Bună, {user?.name?.split(" ")[0] || "părinte"} 🌿</Text>
          <Text style={styles.subgreet}>Ghidul tău pentru o parentalitate conștientă</Text>
        </View>
      </View>

      <TouchableOpacity testID="open-mindmap" style={styles.mmCard} onPress={() => router.push("/(tabs)/mindmap")}>
        <View style={styles.mmIcon}><Ionicons name="git-network" size={24} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.mmTitle}>Vezi Mind Map-ul complet</Text>
          <Text style={styles.mmText}>Schema vizuală a întregului ghid — click-click prin noduri</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity testID="open-guide" style={styles.guideCard} onPress={() => router.push("/(tabs)/guide")}>
        <View style={styles.guideIcon}><Ionicons name="library" size={22} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.guideTitle}>Ghidul Specialistului</Text>
          <Text style={styles.guideText}>"Navigând Lumea Copilului Supradotat" + Ghidul Avansat — 20 capitole</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity testID="open-forum" style={styles.forumCard} onPress={() => router.push("/forum")}>
        <View style={styles.forumIcon}><Ionicons name="people" size={22} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.forumTitle}>Comunitate</Text>
          <Text style={styles.forumText}>Întreabă și răspunde anonim alături de alți părinți</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity testID="open-family" style={styles.familyCard} onPress={() => router.push("/family")}>
        <View style={styles.familyIcon}><Ionicons name="people-circle" size={22} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.familyTitle}>Familie</Text>
          <Text style={styles.familyText}>Partajează jurnalul și testul cu partenerul tău</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity testID="open-compare" style={styles.compareCard} onPress={() => router.push("/compare")}>
        <View style={styles.compareIcon}><Ionicons name="grid" size={22} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.compareTitle}>Tabele comparative</Text>
          <Text style={styles.compareText}>ADHD la fete, ticuri vs hiperkinezie, și 8 comparări</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#fff" />
      </TouchableOpacity>

      <View style={styles.heroCard}>
        <Ionicons name="bulb-outline" size={28} color={theme.colors.primary} />
        <Text style={styles.heroTitle}>Sfatul zilei</Text>
        <Text style={styles.heroDate}>{new Date().toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long" })}</Text>
        <Text style={styles.heroText}>{tip.text}</Text>
        <Text style={styles.ageSelectorLabel}>VÂRSTA COPILULUI</Text>
        <View style={styles.ageRow}>
          {["all", "3-6", "6-10", "10-14", "14+"].map((a) => (
            <TouchableOpacity key={a} testID={`age-${a}`} onPress={() => changeAge(a)} style={[styles.ageChip, ageGroup === a && styles.ageChipActive]}>
              <Text style={[styles.ageChipText, ageGroup === a && { color: "#fff", fontWeight: "700" }]}>{a === "all" ? "Toate" : a + " ani"}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.quickRow}>
        <TouchableOpacity testID="open-test" style={[styles.quickCard, { backgroundColor: "#7A9E9F" }]} onPress={() => router.push("/(tabs)/test")}>
          <Ionicons name="clipboard-outline" size={22} color="#fff" />
          <Text style={styles.quickTitle}>Test profil copil</Text>
          <Text style={styles.quickText}>12 întrebări</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="open-ask" style={[styles.quickCard, { backgroundColor: "#E8C37C" }]} onPress={() => router.push("/(tabs)/ask")}>
          <Ionicons name="chatbubbles-outline" size={22} color="#fff" />
          <Text style={styles.quickTitle}>Întreabă AI</Text>
          <Text style={styles.quickText}>Răspuns instant</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Categorii</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexShrink: 0, marginBottom: 12 }} contentContainerStyle={{ gap: 8 }}>
        {PROFILE_FILTERS.map((p) => (
          <TouchableOpacity
            key={p.key}
            testID={`profile-filter-${p.key}`}
            onPress={() => changeProfile(p.key)}
            style={[styles.profileChip, profileFilter === p.key && styles.profileChipActive]}
          >
            <Text style={[styles.profileChipText, profileFilter === p.key && { color: "#fff", fontWeight: "700" }]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {loading ? <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 32 }} /> : visibleCats.length === 0 ? (
        <Text style={styles.emptyCatsText}>Nicio categorie etichetată pentru acest profil încă.</Text>
      ) : visibleCats.map((c, idx) => (
        <TouchableOpacity key={c.id} testID={`category-card-${idx}`} style={[styles.catCard, { borderLeftColor: c.color }]} onPress={() => router.push(`/category/${c.id}`)} activeOpacity={0.7}>
          <View style={[styles.catIcon, { backgroundColor: c.color + "22" }]}>
            <Ionicons name={c.icon as any} size={26} color={c.color} />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.catTitle}>{c.title}</Text>
            <Text style={styles.catSubtitle}>{c.subtitle}</Text>
            <Text style={[styles.catCount, { color: c.color }]}>{c.subtopics.length} teme</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={theme.colors.textDisabled} />
        </TouchableOpacity>
      ))}

      <View style={styles.reviewsHeader}>
        <Text style={styles.sectionTitle}>Recenzii</Text>
        {reviewsCount > 0 && (
          <View style={styles.reviewsAvgRow}>
            <Ionicons name="star" size={16} color="#E8C37C" />
            <Text style={styles.reviewsAvgText}>{reviewsAvg.toFixed(1)} · {reviewsCount} {reviewsCount === 1 ? "recenzie" : "recenzii"}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity testID="add-review-btn" style={styles.addReviewBtn} onPress={openReviewModal}>
        <Ionicons name={myReview ? "create-outline" : "star-outline"} size={18} color={theme.colors.primary} />
        <Text style={styles.addReviewText}>{myReview ? "Editează recenzia mea" : "Lasă o recenzie"}</Text>
      </TouchableOpacity>

      {reviews.length === 0 ? (
        <Text style={styles.emptyCatsText}>Nicio recenzie încă. Fii prima!</Text>
      ) : reviews.map((r) => (
        <View key={r.id} style={styles.reviewCard} testID={`review-${r.id}`}>
          <View style={styles.reviewHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.reviewAuthor}>{r.author_name}{r.is_mine ? " (tu)" : ""}</Text>
              <View style={styles.reviewStars}>
                {[1, 2, 3, 4, 5].map(i => (
                  <Ionicons key={i} name={i <= r.rating ? "star" : "star-outline"} size={13} color="#E8C37C" />
                ))}
              </View>
            </View>
            {(r.is_mine || user?.is_admin) && (
              <TouchableOpacity testID={`delete-review-${r.id}`} onPress={() => deleteReview(r)}>
                <Ionicons name="trash-outline" size={16} color={theme.colors.textDisabled} />
              </TouchableOpacity>
            )}
          </View>
          {!!r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}
        </View>
      ))}

      <Modal visible={showReviewModal} transparent animationType="fade" onRequestClose={() => !savingReview && setShowReviewModal(false)}>
        <Pressable style={styles.modalBg} onPress={() => !savingReview && setShowReviewModal(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{myReview ? "Editează recenzia" : "Lasă o recenzie"}</Text>
            <View style={styles.starPicker}>
              {[1, 2, 3, 4, 5].map(i => (
                <TouchableOpacity key={i} testID={`star-${i}`} onPress={() => setMyRating(i)}>
                  <Ionicons name={i <= myRating ? "star" : "star-outline"} size={34} color="#E8C37C" style={{ marginHorizontal: 3 }} />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              testID="review-comment-input"
              style={styles.modalInput}
              placeholder="Ce ți-a plăcut / ce ai îmbunătăți? (opțional)"
              placeholderTextColor={theme.colors.textDisabled}
              value={myComment}
              onChangeText={setMyComment}
              multiline
              maxLength={500}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity testID="review-cancel" style={styles.modalBtnOutline} onPress={() => setShowReviewModal(false)} disabled={savingReview}>
                <Text style={styles.modalBtnOutlineText}>Anulează</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="review-save" style={[styles.modalBtn, savingReview && { opacity: 0.5 }]} onPress={saveReview} disabled={savingReview}>
                {savingReview ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnText}>Salvează</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  greet: { ...theme.font.h2, color: theme.colors.textPrimary },
  subgreet: { ...theme.font.body, color: theme.colors.textSecondary, marginTop: 4 },
  mmCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: theme.colors.primary, borderRadius: 16, padding: 16, marginBottom: 12 },
  mmIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  mmTitle: { color: "#fff", fontWeight: "700", fontSize: 15 },
  mmText: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },
  guideCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#DE8F6E", borderRadius: 16, padding: 16, marginBottom: 16 },
  guideIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  guideTitle: { color: "#fff", fontWeight: "700", fontSize: 15 },
  guideText: { color: "rgba(255,255,255,0.9)", fontSize: 12, marginTop: 2 },
  forumCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#9B8CC4", borderRadius: 16, padding: 16, marginBottom: 16 },
  forumIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  forumTitle: { color: "#fff", fontWeight: "700", fontSize: 15 },
  forumText: { color: "rgba(255,255,255,0.9)", fontSize: 12, marginTop: 2 },
  familyCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#5E8B7E", borderRadius: 16, padding: 16, marginBottom: 16 },
  familyIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  familyTitle: { color: "#fff", fontWeight: "700", fontSize: 15 },
  familyText: { color: "rgba(255,255,255,0.9)", fontSize: 12, marginTop: 2 },
  compareCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#7A9E9F", borderRadius: 16, padding: 16, marginBottom: 16 },
  compareIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  compareTitle: { color: "#fff", fontWeight: "700", fontSize: 15 },
  compareText: { color: "rgba(255,255,255,0.9)", fontSize: 12, marginTop: 2 },
  heroCard: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: theme.colors.border },
  heroTitle: { ...theme.font.h3, color: theme.colors.textPrimary, marginTop: 8, marginBottom: 2 },
  heroDate: { fontSize: 11, color: theme.colors.primary, fontWeight: "600", letterSpacing: 0.5, marginBottom: 8, textTransform: "capitalize" },
  heroText: { ...theme.font.body, color: theme.colors.textSecondary },
  ageSelectorLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1, color: theme.colors.textSecondary, marginTop: 14, marginBottom: 6 },
  ageRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  ageChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.bg },
  ageChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  ageChipText: { fontSize: 11, color: theme.colors.textPrimary, fontWeight: "500" },
  profileChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  profileChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  profileChipText: { fontSize: 12, color: theme.colors.textPrimary, fontWeight: "500" },
  emptyCatsText: { ...theme.font.body, color: theme.colors.textSecondary, textAlign: "center", paddingVertical: 24 },
  reviewsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  reviewsAvgRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  reviewsAvgText: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: "600" },
  addReviewBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 999, paddingVertical: 12, marginBottom: 14 },
  addReviewText: { color: theme.colors.primary, fontWeight: "700", fontSize: 14 },
  reviewCard: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.border },
  reviewHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  reviewAuthor: { fontSize: 13, fontWeight: "700", color: theme.colors.textPrimary },
  reviewStars: { flexDirection: "row", gap: 1, marginTop: 3 },
  reviewComment: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 19, marginTop: 8 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", paddingHorizontal: 28 },
  modalCard: { backgroundColor: theme.colors.surface, borderRadius: 20, padding: 24, alignItems: "center" },
  modalTitle: { ...theme.font.h3, color: theme.colors.textPrimary, marginBottom: 16, textAlign: "center" },
  starPicker: { flexDirection: "row", marginBottom: 18 },
  modalInput: { alignSelf: "stretch", backgroundColor: theme.colors.surfaceElevated, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: theme.colors.textPrimary, marginBottom: 16, minHeight: 70, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", gap: 10, alignSelf: "stretch" },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 999, alignItems: "center", backgroundColor: theme.colors.primary },
  modalBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  modalBtnOutline: { flex: 1, paddingVertical: 14, borderRadius: 999, alignItems: "center", borderWidth: 1.5, borderColor: theme.colors.border },
  modalBtnOutlineText: { color: theme.colors.textPrimary, fontWeight: "600", fontSize: 14 },
  quickRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  quickCard: { flex: 1, padding: 14, borderRadius: 14, alignItems: "flex-start" },
  quickTitle: { color: "#fff", fontWeight: "700", fontSize: 13, marginTop: 8 },
  quickText: { color: "rgba(255,255,255,0.85)", fontSize: 11, marginTop: 2 },
  sectionTitle: { ...theme.font.h3, color: theme.colors.textPrimary, marginTop: 4, marginBottom: 12 },
  catCard: { flexDirection: "row", alignItems: "center", backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border, borderLeftWidth: 4 },
  catIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  catTitle: { fontSize: 16, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 2 },
  catSubtitle: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },
  catCount: { fontSize: 11, marginTop: 4, fontWeight: "500" },
});
