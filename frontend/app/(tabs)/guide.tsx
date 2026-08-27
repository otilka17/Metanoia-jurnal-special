import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Share, Modal, Pressable } from "react-native";
import { Alert } from "@/src/lib/alert";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";
import { storage } from "@/src/utils/storage";
import { theme } from "@/src/lib/theme";
import { GUIDE, GUIDE_INTRO, GUIDE_SUBTITLE, GUIDE_TITLE } from "@/src/lib/guide";
import { GUIDES, GuideMeta } from "@/src/lib/guides_extra";

const READ_KEY = "guide_read_ids";
const ADVANCED_START = 9;

// Build unified list: supradotare first, then extras
const ALL_GUIDES: GuideMeta[] = [
  {
    key: "supradotare",
    title: GUIDE_TITLE,
    subtitle: GUIDE_SUBTITLE,
    intro: GUIDE_INTRO,
    icon: "sparkles",
    color: "#5E8B7E",
    sections: GUIDE,
  },
  ...GUIDES,
];

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export default function GuideScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const positions = useRef<Record<string, number>>({});
  const [activeGuideKey, setActiveGuideKey] = useState<string>("supradotare");
  const [active, setActive] = useState("s1");
  const [read, setRead] = useState<Record<string, boolean>>({});
  const [exporting, setExporting] = useState(false);
  const [actionText, setActionText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showGuidePicker, setShowGuidePicker] = useState(false);

  const activeGuide = ALL_GUIDES.find(g => g.key === activeGuideKey) || ALL_GUIDES[0];
  const ACTIVE_SECTIONS = activeGuide.sections;

  const onCopy = async () => {
    if (!actionText) return;
    await Clipboard.setStringAsync(actionText);
    setCopied(true);
    setTimeout(() => { setCopied(false); setActionText(null); }, 1000);
  };

  const onShare = async () => {
    if (!actionText) return;
    try {
      await Share.share({ message: actionText });
      setActionText(null);
    } catch {}
  };

  useEffect(() => {
    (async () => {
      const raw = await storage.getItem(READ_KEY, "");
      if (raw) { try { setRead(JSON.parse(raw)); } catch {} }
    })();
  }, []);

  const saveRead = async (next: Record<string, boolean>) => {
    setRead(next);
    await storage.setItem(READ_KEY, JSON.stringify(next));
  };

  const toggleRead = (id: string) => {
    const next = { ...read, [id]: !read[id] };
    if (!next[id]) delete next[id];
    saveRead(next);
  };

  const scrollTo = (id: string) => {
    const y = positions.current[id] || 0;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
    setActive(id);
  };

  const readCount = Object.values(read).filter(Boolean).length;
  const total = GUIDE.length;
  const pct = Math.round((readCount / total) * 100);

  const exportPdf = async () => {
    setExporting(true);
    try {
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
body { font-family: -apple-system, system-ui, sans-serif; color:#2D3A35; padding:32px; line-height:1.55; }
h1 { font-size:26px; color:#2D3A35; margin:0 0 4px; }
.sub { color:#5C6B64; font-size:14px; margin-bottom:16px; }
.bar { width:56px; height:4px; background:#5E8B7E; border-radius:2px; margin-bottom:18px; }
.intro { font-size:13px; }
h2 { font-size:16px; color:#5E8B7E; margin-top:28px; border-bottom:1px solid #E6E4DD; padding-bottom:6px; }
.section-num { display:inline-block; width:24px; height:24px; line-height:24px; border-radius:12px; background:#5E8B7E; color:#fff; font-size:12px; text-align:center; font-weight:700; margin-right:8px; vertical-align:middle; }
p { font-size:13px; margin:6px 0; }
.quote { border-left:3px solid #5E8B7E; padding-left:10px; font-style:italic; }
ul { padding-left:18px; font-size:12px; }
li { margin-bottom:5px; }
.bhead { color:#5E8B7E; font-weight:700; font-size:13px; margin-top:8px; }
table { width:100%; border-collapse:collapse; margin-top:8px; }
th { background:#5E8B7E; color:#fff; padding:8px; font-size:11px; text-align:left; }
td { border:1px solid #E6E4DD; padding:8px; font-size:11px; }
.divider { background:#DE8F6E; color:#fff; padding:12px; border-radius:8px; margin:32px 0 12px; text-align:center; font-weight:700; }
.footer { margin-top:32px; font-size:10px; color:#888; text-align:center; }
</style></head><body>
<h1>${escapeHtml(GUIDE_TITLE)}</h1>
<div class="sub">${escapeHtml(GUIDE_SUBTITLE)}</div>
<div class="bar"></div>
<p class="intro">${escapeHtml(GUIDE_INTRO)}</p>
${GUIDE.map((s) => `
  ${s.number === ADVANCED_START ? '<div class="divider">GHIDUL AVANSAT — Strategii pentru Părinți și Profesori</div>' : ""}
  <h2><span class="section-num">${s.number}</span>${escapeHtml(s.title)}</h2>
  ${s.content.map((p, i) => `<p class="${i === 2 && s.id === "s1" ? "quote" : ""}">${escapeHtml(p)}</p>`).join("")}
  ${(s.bullets || []).map((b) => `${b.title ? `<div class="bhead">${escapeHtml(b.title)}</div>` : ""}<ul>${b.items.map(it => `<li>${escapeHtml(it)}</li>`).join("")}</ul>`).join("")}
  ${s.table ? `<table><tr>${s.table.headers.map(h => `<th>${escapeHtml(h)}</th>`).join("")}</tr>${s.table.rows.map(r => `<tr>${r.map(c => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("")}</table>` : ""}
`).join("")}
<div class="footer">Ghid Părinte — Educația Copilului Supradotat / Hiperactiv</div>
</body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Ghidul Specialistului" });
      }
    } catch (e: any) { Alert.alert("Eroare PDF", e.message || "Nu am putut exporta"); }
    finally { setExporting(false); }
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.progressText}>{readCount}/{total} capitole citite · {pct}%</Text>
        </View>
        <TouchableOpacity testID="export-pdf-button" onPress={exportPdf} disabled={exporting} style={styles.pdfBtn}>
          {exporting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="download-outline" size={18} color="#fff" />}
          <Text style={styles.pdfBtnText}>PDF</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.nav} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: "center" }}>
        {GUIDE.map((s) => (
          <TouchableOpacity
            key={s.id}
            testID={`guide-nav-${s.id}`}
            onPress={() => scrollTo(s.id)}
            style={[
              styles.navChip,
              active === s.id && styles.navChipActive,
              read[s.id] && !(active === s.id) && styles.navChipRead,
              s.number === ADVANCED_START && { borderLeftWidth: 3, borderLeftColor: "#DE8F6E", marginLeft: 6 },
            ]}
          >
            <Text style={[
              styles.navNum,
              active === s.id && { color: "#fff" },
              read[s.id] && !(active === s.id) && { color: theme.colors.primary },
            ]}>{s.number}</Text>
            {read[s.id] && (
              <View style={styles.checkDot}><Ionicons name="checkmark" size={9} color="#fff" /></View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.badge}>GHIDUL SPECIALISTULUI</Text>
          <Text style={styles.heroTitle}>{GUIDE_TITLE}</Text>
          <Text style={styles.heroSub}>{GUIDE_SUBTITLE}</Text>
          <View style={styles.bar} />
          <Text style={styles.intro}>{GUIDE_INTRO}</Text>
        </View>

        {GUIDE.map((s) => (
          <View
            key={s.id}
            onLayout={(e) => { positions.current[s.id] = e.nativeEvent.layout.y; }}
            style={styles.section}
          >
            {s.number === ADVANCED_START && (
              <View style={styles.divider}>
                <Ionicons name="library" size={16} color="#fff" />
                <Text style={styles.dividerText}>GHIDUL AVANSAT — Strategii pentru Părinți și Profesori</Text>
              </View>
            )}
            <View style={styles.sectionHead}>
              <View style={[styles.sectionBadge, s.number >= ADVANCED_START && { backgroundColor: "#DE8F6E" }]}>
                <Text style={styles.sectionBadgeText}>{s.number}</Text>
              </View>
              <Text style={styles.sectionTitle}>{s.title}</Text>
            </View>

            {s.content.map((p, i) => (
              <TouchableOpacity
                key={i}
                testID={`para-${s.id}-${i}`}
                activeOpacity={0.6}
                onLongPress={() => setActionText(p)}
                delayLongPress={350}
              >
                <Text style={i === 2 && s.id === "s1" ? styles.quote : styles.paragraph}>{p}</Text>
              </TouchableOpacity>
            ))}

            {s.bullets?.map((b, bi) => (
              <View key={bi} style={styles.bulletBlock}>
                {b.title && <Text style={styles.bulletHead}>{b.title}</Text>}
                {b.items.map((it, ii) => (
                  <View key={ii} style={styles.bulletRow}>
                    <View style={[styles.bulletDot, s.number >= ADVANCED_START && { backgroundColor: "#DE8F6E" }]} />
                    <Text style={styles.bulletText}>{it}</Text>
                  </View>
                ))}
              </View>
            ))}

            {s.table && (
              <View style={styles.table}>
                <View style={[styles.tableHeaderRow, s.number >= ADVANCED_START && { backgroundColor: "#DE8F6E" }]}>
                  {s.table.headers.map((h, hi) => (
                    <Text key={hi} style={styles.tableHeader}>{h}</Text>
                  ))}
                </View>
                {s.table.rows.map((row, ri) => (
                  <View key={ri} style={[styles.tableRow, ri % 2 === 1 && { backgroundColor: theme.colors.surfaceElevated }]}>
                    {row.map((cell, ci) => (
                      <Text key={ci} style={styles.tableCell}>{cell}</Text>
                    ))}
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              testID={`read-${s.id}`}
              onPress={() => toggleRead(s.id)}
              style={[styles.readBtn, read[s.id] && styles.readBtnDone]}
            >
              <Ionicons
                name={read[s.id] ? "checkmark-circle" : "ellipse-outline"}
                size={18}
                color={read[s.id] ? "#fff" : theme.colors.primary}
              />
              <Text style={[styles.readBtnText, read[s.id] && { color: "#fff" }]}>
                {read[s.id] ? "Capitol citit" : "Marchează ca citit"}
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.footer}>
          <Ionicons name="leaf" size={20} color={theme.colors.primary} />
          <Text style={styles.footerText}>Ghid Părinte — sursă: documentele specialistului</Text>
        </View>
      </ScrollView>

      <Modal visible={!!actionText} transparent animationType="fade" onRequestClose={() => setActionText(null)}>
        <Pressable style={styles.modalBg} onPress={() => setActionText(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Ionicons name="document-text-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.modalTitle}>Paragraf</Text>
              <TouchableOpacity onPress={() => setActionText(null)}><Ionicons name="close" size={22} color={theme.colors.textSecondary} /></TouchableOpacity>
            </View>
            <Text style={styles.modalQuote} numberOfLines={6}>{actionText}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity testID="copy-paragraph" style={styles.modalBtn} onPress={onCopy}>
                <Ionicons name={copied ? "checkmark" : "copy-outline"} size={18} color={theme.colors.primary} />
                <Text style={styles.modalBtnText}>{copied ? "Copiat!" : "Copiază"}</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="share-paragraph" style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={onShare}>
                <Ionicons name="share-social-outline" size={18} color="#fff" />
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>Share</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  progressTrack: { height: 8, backgroundColor: theme.colors.surfaceElevated, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: theme.colors.primary, borderRadius: 4 },
  progressText: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 4 },
  pdfBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  pdfBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  nav: { maxHeight: 48, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface },
  navChip: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: theme.colors.bg, position: "relative" },
  navChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  navChipRead: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + "11" },
  navNum: { fontSize: 13, fontWeight: "700", color: theme.colors.textPrimary },
  checkDot: { position: "absolute", top: -2, right: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: theme.colors.surface },
  hero: { marginBottom: 20 },
  badge: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2, color: theme.colors.primary, marginBottom: 8 },
  heroTitle: { ...theme.font.h1, color: theme.colors.textPrimary },
  heroSub: { ...theme.font.bodyL, color: theme.colors.textSecondary, marginTop: 6 },
  bar: { width: 56, height: 4, borderRadius: 2, backgroundColor: theme.colors.primary, marginTop: 12, marginBottom: 16 },
  intro: { ...theme.font.body, color: theme.colors.textPrimary, lineHeight: 24 },
  divider: { backgroundColor: "#DE8F6E", padding: 12, borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 8, marginTop: 24, marginBottom: 16 },
  dividerText: { color: "#fff", fontWeight: "700", fontSize: 12, letterSpacing: 0.5, flex: 1 },
  section: { marginTop: 24 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  sectionBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  sectionBadgeText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  sectionTitle: { ...theme.font.h3, color: theme.colors.textPrimary, flex: 1 },
  paragraph: { ...theme.font.body, color: theme.colors.textPrimary, lineHeight: 23, marginBottom: 10 },
  quote: { ...theme.font.body, color: theme.colors.textPrimary, fontStyle: "italic", borderLeftWidth: 3, borderLeftColor: theme.colors.primary, paddingLeft: 12, marginVertical: 12, lineHeight: 23 },
  bulletBlock: { marginTop: 8, marginBottom: 12 },
  bulletHead: { fontSize: 14, fontWeight: "700", color: theme.colors.primary, marginBottom: 8 },
  bulletRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.primary, marginTop: 9 },
  bulletText: { flex: 1, fontSize: 14, color: theme.colors.textPrimary, lineHeight: 21 },
  table: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, overflow: "hidden", marginTop: 8 },
  tableHeaderRow: { flexDirection: "row", backgroundColor: theme.colors.primary },
  tableHeader: { flex: 1, padding: 10, color: "#fff", fontWeight: "700", fontSize: 12 },
  tableRow: { flexDirection: "row" },
  tableCell: { flex: 1, padding: 10, fontSize: 12, color: theme.colors.textPrimary, lineHeight: 17 },
  readBtn: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", marginTop: 16, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1.5, borderColor: theme.colors.primary },
  readBtnDone: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  readBtnText: { fontSize: 13, fontWeight: "600", color: theme.colors.primary },
  footer: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center", marginTop: 32, paddingTop: 20, borderTopWidth: 1, borderTopColor: theme.colors.border },
  footerText: { fontSize: 11, color: theme.colors.textDisabled },
});
