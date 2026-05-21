import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/lib/api";
import { theme } from "@/src/lib/theme";

type Axis = "gift" | "adhd" | "emo";
type Question = { q: string; opts: { label: string; axis: Axis; score: number }[] };

const QUESTIONS: Question[] = [
  { q: "La ce vârstă a început copilul tău să vorbească în propoziții complete?", opts: [
    { label: "Înainte de 2 ani", axis: "gift", score: 3 },
    { label: "În jur de 2 ani", axis: "gift", score: 1 },
    { label: "După 2.5 ani", axis: "gift", score: 0 },
  ]},
  { q: "Cum reacționează la activități care nu îl interesează?", opts: [
    { label: "Pare neatent peste tot, chiar și la lucruri preferate", axis: "adhd", score: 3 },
    { label: "Se plictisește repede dar e foarte atent la pasiunile lui", axis: "gift", score: 2 },
    { label: "Acceptă rutina fără probleme", axis: "emo", score: 0 },
  ]},
  { q: "Cât de intense sunt reacțiile lui emoționale la nedreptate?", opts: [
    { label: "Extreme — plânge sau intervine vehement", axis: "emo", score: 3 },
    { label: "Moderate", axis: "emo", score: 1 },
    { label: "Slabe — pare să nu observe", axis: "emo", score: 0 },
  ]},
  { q: "Câte ore consecutive poate sta concentrat pe ceva ce-i place?", opts: [
    { label: "Peste 2 ore — uită de mâncare/joc", axis: "gift", score: 3 },
    { label: "30-60 minute", axis: "gift", score: 1 },
    { label: "Sub 15 minute, indiferent de activitate", axis: "adhd", score: 3 },
  ]},
  { q: "Cum se manifestă agitația lui acasă vs la școală?", opts: [
    { label: "Agitat în ambele medii constant", axis: "adhd", score: 3 },
    { label: "Agitat când e plictisit, calm când e provocat", axis: "gift", score: 2 },
    { label: "Calm în general", axis: "emo", score: 0 },
  ]},
  { q: "Pune întrebări „filozofice” incomode pentru vârsta lui?", opts: [
    { label: "Da, frecvent (moarte, justiție, univers)", axis: "gift", score: 3 },
    { label: "Ocazional", axis: "gift", score: 1 },
    { label: "Rar sau deloc", axis: "emo", score: 0 },
  ]},
  { q: "Reacționează exagerat la stimuli senzoriali (zgomot, etichete, lumini)?", opts: [
    { label: "Da, foarte des", axis: "emo", score: 3 },
    { label: "Uneori", axis: "emo", score: 1 },
    { label: "Nu deosebit", axis: "adhd", score: 0 },
  ]},
  { q: "Cum se înțelege cu copiii de vârsta lui?", opts: [
    { label: "Preferă copii mai mari sau adulții", axis: "gift", score: 3 },
    { label: "Are 1-2 prieteni apropiați", axis: "emo", score: 1 },
    { label: "Are dificultăți de relaționare la grup", axis: "adhd", score: 2 },
  ]},
  { q: "Își termină de obicei sarcinile începute?", opts: [
    { label: "Nu — sare de la una la alta constant", axis: "adhd", score: 3 },
    { label: "Doar dacă îl interesează profund", axis: "gift", score: 2 },
    { label: "Da, le duce la capăt", axis: "emo", score: 0 },
  ]},
  { q: "Care e atitudinea lui față de reguli?", opts: [
    { label: "Le respectă dacă înțelege logica", axis: "gift", score: 2 },
    { label: "Le contestă constant — vrea „de ce?”", axis: "gift", score: 3 },
    { label: "Le respectă fără să întrebe", axis: "emo", score: 0 },
  ]},
  { q: "Are dificultăți la scris/citit deși vorbește avansat?", opts: [
    { label: "Da — discrepanță evidentă", axis: "adhd", score: 3 },
    { label: "Uneori, dar progresează", axis: "gift", score: 1 },
    { label: "Nu, totul e armonios", axis: "emo", score: 0 },
  ]},
  { q: "Cum gestionează un eșec/dezamăgire mică?", opts: [
    { label: "Cu meltdown disproporționat", axis: "emo", score: 3 },
    { label: "Cu frustrare moderată dar revine repede", axis: "gift", score: 1 },
    { label: "Aproape nu îl afectează", axis: "adhd", score: 0 },
  ]},
];

type Profile = {
  title: string;
  color: string;
  icon: string;
  description: string;
  bettsType?: string;
  bettsDesc?: string;
  recommendation: string;
};

function computeProfile(scores: Record<Axis, number>): Profile {
  const total = scores.gift + scores.adhd + scores.emo;
  const giftRatio = scores.gift / Math.max(1, total);
  const adhdRatio = scores.adhd / Math.max(1, total);
  const emoRatio = scores.emo / Math.max(1, total);

  // Determine primary profile
  const isHighGift = scores.gift >= 12;
  const isHighAdhd = scores.adhd >= 9;
  const isHighEmo = scores.emo >= 9;

  let bettsType = "";
  let bettsDesc = "";
  if (isHighGift) {
    if (adhdRatio > 0.3) { bettsType = "Tip II — Provocatorul"; bettsDesc = "Creativ, nonconformist, contestă autoritatea. Are nevoie de validarea ideilor și flexibilitate."; }
    else if (emoRatio > 0.35) { bettsType = "Tip III — Supradotatul Ascuns"; bettsDesc = "Își poate nega abilitățile pentru acceptare socială. Are nevoie de siguranță emoțională."; }
    else if (giftRatio > 0.5) { bettsType = "Tip VI — Elevul Autonom"; bettsDesc = "Independent, automotivat, gestionează singur învățarea. Are nevoie de mentorat și libertate."; }
    else { bettsType = "Tip I — Câștigătorul"; bettsDesc = "Bine adaptat sistemului, dependent de aprobarea adultului. Are nevoie de provocări cu risc de eșec."; }
  }

  if (isHighGift && isHighAdhd) {
    return {
      title: "Profil 2e — Dublă Excepționalitate",
      color: "#7A9E9F",
      icon: "diamond",
      description: "Răspunsurile sugerează un profil de supradotare combinat cu trăsături de hiperactivitate/ADHD. Este o combinație care necesită evaluare specializată pentru a confirma — supradotarea poate masca dificultățile, iar ADHD poate masca supradotarea.",
      bettsType: "Tip V — Dublu-Etichetat (2e)",
      bettsDesc: "Supradotare + posibilă dificultate. Are nevoie de accent pe punctele tari, nu doar pe remedierea deficienței.",
      recommendation: "Recomandare: evaluare psihopedagogică completă (IQ + atenție + funcții executive). Citește capitolele 3, 4 și 5 din Ghidul Specialistului.",
    };
  }
  if (isHighGift) {
    return {
      title: "Profil de Supradotare",
      color: "#5E8B7E",
      icon: "sparkles",
      description: "Răspunsurile sugerează un profil de supradotare cu sensibilitate ridicată. Heterocronia (decalaj cognitiv-emoțional) poate genera frustrare. Curiozitatea intensă și gândirea complexă sunt resurse, dar pot fi epuizante pentru copil.",
      bettsType, bettsDesc,
      recommendation: "Recomandare: evaluare psihopedagogică pentru confirmare. Citește capitolele 1, 2 și 6 din Ghid. Curriculum diferențiat poate fi util.",
    };
  }
  if (isHighAdhd) {
    return {
      title: "Posibile Trăsături ADHD",
      color: "#DE8F6E",
      icon: "flash",
      description: "Răspunsurile indică trăsături compatibile cu ADHD: dificultăți de atenție/autoreglare în contexte multiple. Important: doar un specialist poate stabili un diagnostic. Multe trăsături similare apar și la copiii activi normali sau supradotați.",
      recommendation: "Recomandare: consult psihologic/psihiatric pediatric pentru evaluare. Citește capitolul 4 din Ghidul Specialistului (diagnostic diferențial).",
    };
  }
  if (isHighEmo) {
    return {
      title: "Sensibilitate Emoțională Ridicată",
      color: "#E8C37C",
      icon: "heart",
      description: "Răspunsurile arată un copil cu sensibilitate emoțională marcată. Aceasta poate fi una dintre cele 5 supraexcitabilități descrise de Dabrowski (frecventă la copii supradotați), dar și un trait separat.",
      recommendation: "Recomandare: citește capitolele despre gestionarea emoțiilor și capitolul 2 din Ghid. Tehnicile de respirație și validare emoțională sunt esențiale.",
    };
  }
  return {
    title: "Profil în Limite Normale",
    color: "#5E8B7E",
    icon: "leaf",
    description: "Răspunsurile sugerează un profil în limite obișnuite pentru vârstă. Aceasta nu exclude potențialul aptitudinal — multe trăsături se dezvoltă în timp. Continuă să observi și să stimulezi.",
    recommendation: "Recomandare: stimulare echilibrată, observație activă, refă testul peste 6 luni dacă apar semnale noi.",
  };
}

export default function TestScreen() {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<{ axis: Axis; score: number }[]>([]);
  const [done, setDone] = useState(false);
  const [savedResult, setSavedResult] = useState<any>(null);
  const [loadingSaved, setLoadingSaved] = useState(true);

  // Load latest saved test result (own or partner's) on mount
  useEffect(() => {
    (async () => {
      try {
        const r: any = await api.getLatestTestResult();
        if (r.result) setSavedResult(r.result);
      } catch (e) { console.warn(e); }
      setLoadingSaved(false);
    })();
  }, []);

  const onPick = (axis: Axis, score: number) => {
    const next = [...answers, { axis, score }];
    setAnswers(next);
    if (idx < QUESTIONS.length - 1) setIdx(idx + 1);
    else {
      setDone(true);
      // Persist result on backend
      const scores: Record<Axis, number> = { gift: 0, adhd: 0, emo: 0 };
      next.forEach((a) => { scores[a.axis] += a.score; });
      const profile = computeProfile(scores);
      api.saveTestResult({
        scores,
        profile_title: profile.title,
        profile_description: profile.description,
        betts_type: profile.bettsType || "",
        betts_desc: profile.bettsDesc || "",
        recommendation: profile.recommendation,
        profile_color: profile.color,
        profile_icon: profile.icon,
      }).then((r: any) => { setSavedResult({ ...r.result, is_mine: true, author_name: "Tu" }); })
        .catch((e) => console.warn("save test result failed", e));
    }
  };

  const reset = () => { setIdx(0); setAnswers([]); setDone(false); };

  // If a saved result exists and user hasn't started a new test, show it
  if (!done && answers.length === 0 && savedResult && !loadingSaved) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {!savedResult.is_mine && (
          <View style={styles.partnerBanner}>
            <Ionicons name="people" size={18} color={theme.colors.primary} />
            <Text style={styles.partnerBannerText}>Test salvat de <Text style={{ fontWeight: "700" }}>{savedResult.author_name}</Text> · {new Date(savedResult.created_at).toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" })}</Text>
          </View>
        )}
        <View style={[styles.resultHero, { backgroundColor: savedResult.profile_color || theme.colors.primary }]}>
          <Ionicons name={(savedResult.profile_icon || "sparkles") as any} size={48} color="#fff" />
          <Text style={styles.resultTitle}>{savedResult.profile_title}</Text>
        </View>
        <Text style={styles.resultDesc}>{savedResult.profile_description}</Text>
        {savedResult.betts_type && (
          <View style={[styles.bettsBox, { borderColor: savedResult.profile_color || theme.colors.primary }]}>
            <Text style={[styles.bettsTitle, { color: savedResult.profile_color || theme.colors.primary }]}>{savedResult.betts_type}</Text>
            <Text style={styles.bettsDesc}>{savedResult.betts_desc}</Text>
          </View>
        )}
        <View style={styles.scoresBox}>
          <View style={styles.scoreRow}><Text style={styles.scoreLabel}>Supradotare</Text><Text style={[styles.scoreVal, { color: "#5E8B7E" }]}>{savedResult.scores?.gift ?? 0}</Text></View>
          <View style={styles.scoreRow}><Text style={styles.scoreLabel}>ADHD/Hiperactivitate</Text><Text style={[styles.scoreVal, { color: "#DE8F6E" }]}>{savedResult.scores?.adhd ?? 0}</Text></View>
          <View style={styles.scoreRow}><Text style={styles.scoreLabel}>Sensibilitate emoțională</Text><Text style={[styles.scoreVal, { color: "#E8C37C" }]}>{savedResult.scores?.emo ?? 0}</Text></View>
        </View>
        <View style={styles.recBox}>
          <Ionicons name="bulb" size={20} color={theme.colors.primary} />
          <Text style={styles.recText}>{savedResult.recommendation}</Text>
        </View>
        <Text style={styles.disclaimer}>⚠ Acest test este orientativ, NU un diagnostic. Pentru certitudine, consultă un psiholog specializat.</Text>
        <TouchableOpacity testID="test-restart" style={styles.btn} onPress={() => { setSavedResult(null); reset(); }}>
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.btnText}>Refă testul</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (loadingSaved) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg }}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  if (done) {
    const scores: Record<Axis, number> = { gift: 0, adhd: 0, emo: 0 };
    answers.forEach((a) => { scores[a.axis] += a.score; });
    const profile = computeProfile(scores);
    return (
      <ScrollView style={styles.root} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={[styles.resultHero, { backgroundColor: profile.color }]}>
          <Ionicons name={profile.icon as any} size={48} color="#fff" />
          <Text style={styles.resultTitle}>{profile.title}</Text>
        </View>
        <Text style={styles.resultDesc}>{profile.description}</Text>
        {profile.bettsType && (
          <View style={[styles.bettsBox, { borderColor: profile.color }]}>
            <Text style={[styles.bettsTitle, { color: profile.color }]}>{profile.bettsType}</Text>
            <Text style={styles.bettsDesc}>{profile.bettsDesc}</Text>
          </View>
        )}
        <View style={styles.scoresBox}>
          <View style={styles.scoreRow}><Text style={styles.scoreLabel}>Supradotare</Text><Text style={[styles.scoreVal, { color: "#5E8B7E" }]}>{scores.gift}</Text></View>
          <View style={styles.scoreRow}><Text style={styles.scoreLabel}>ADHD/Hiperactivitate</Text><Text style={[styles.scoreVal, { color: "#DE8F6E" }]}>{scores.adhd}</Text></View>
          <View style={styles.scoreRow}><Text style={styles.scoreLabel}>Sensibilitate emoțională</Text><Text style={[styles.scoreVal, { color: "#E8C37C" }]}>{scores.emo}</Text></View>
        </View>
        <View style={styles.recBox}>
          <Ionicons name="bulb" size={20} color={theme.colors.primary} />
          <Text style={styles.recText}>{profile.recommendation}</Text>
        </View>
        <Text style={styles.disclaimer}>⚠ Acest test este orientativ, NU un diagnostic. Pentru certitudine, consultă un psiholog specializat.</Text>
        <TouchableOpacity testID="test-restart" style={styles.btn} onPress={reset}>
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.btnText}>Refă testul</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const q = QUESTIONS[idx];
  const progress = (idx / QUESTIONS.length) * 100;

  return (
    <View style={styles.root}>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
      <Text style={styles.qCounter}>Întrebarea {idx + 1} din {QUESTIONS.length}</Text>
      <View style={styles.qContainer}>
        <Text style={styles.question}>{q.q}</Text>
        {q.opts.map((opt, i) => (
          <TouchableOpacity key={i} testID={`opt-${idx}-${i}`} style={styles.opt} onPress={() => onPick(opt.axis, opt.score)}>
            <Text style={styles.optText}>{opt.label}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  progressTrack: { height: 6, backgroundColor: theme.colors.surfaceElevated },
  progressFill: { height: "100%", backgroundColor: theme.colors.primary },
  qCounter: { fontSize: 12, color: theme.colors.textSecondary, padding: 16, fontWeight: "600", letterSpacing: 0.5 },
  qContainer: { paddingHorizontal: 20 },
  question: { ...theme.font.h2, color: theme.colors.textPrimary, marginBottom: 24 },
  opt: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: theme.colors.surface, padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.border },
  optText: { flex: 1, fontSize: 14, color: theme.colors.textPrimary, marginRight: 12 },
  resultHero: { alignItems: "center", padding: 32, borderRadius: 20, marginBottom: 20 },
  resultTitle: { color: "#fff", fontSize: 22, fontWeight: "700", textAlign: "center", marginTop: 12 },
  resultDesc: { ...theme.font.body, color: theme.colors.textPrimary, lineHeight: 22, marginBottom: 20 },
  bettsBox: { borderWidth: 1.5, borderRadius: 12, padding: 14, marginBottom: 20 },
  bettsTitle: { fontSize: 14, fontWeight: "700", marginBottom: 6 },
  bettsDesc: { fontSize: 13, color: theme.colors.textPrimary, lineHeight: 18 },
  scoresBox: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: theme.colors.border },
  scoreRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  scoreLabel: { fontSize: 14, color: theme.colors.textPrimary },
  scoreVal: { fontSize: 16, fontWeight: "700" },
  recBox: { flexDirection: "row", gap: 12, backgroundColor: theme.colors.primary + "11", padding: 16, borderRadius: 12, marginBottom: 16 },
  recText: { flex: 1, fontSize: 13, color: theme.colors.textPrimary, lineHeight: 19 },
  disclaimer: { fontSize: 12, color: theme.colors.textSecondary, fontStyle: "italic", marginBottom: 20, lineHeight: 18 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: 999 },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  partnerBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.colors.primary + "11", borderRadius: 12, padding: 12, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: theme.colors.primary },
  partnerBannerText: { flex: 1, fontSize: 12, color: theme.colors.textPrimary },
});
