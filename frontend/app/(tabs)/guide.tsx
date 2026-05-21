import { useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/lib/theme";
import { GUIDE, GUIDE_INTRO, GUIDE_SUBTITLE, GUIDE_TITLE } from "@/src/lib/guide";

export default function GuideScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const positions = useRef<Record<string, number>>({});
  const [active, setActive] = useState("s1");

  const scrollTo = (id: string) => {
    const y = positions.current[id] || 0;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
    setActive(id);
  };

  return (
    <View style={styles.root}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.nav} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: "center" }}>
        {GUIDE.map((s) => (
          <TouchableOpacity
            key={s.id}
            testID={`guide-nav-${s.id}`}
            onPress={() => scrollTo(s.id)}
            style={[styles.navChip, active === s.id && styles.navChipActive]}
          >
            <Text style={[styles.navNum, active === s.id && { color: "#fff" }]}>{s.number}</Text>
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
            <View style={styles.sectionHead}>
              <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>{s.number}</Text></View>
              <Text style={styles.sectionTitle}>{s.title}</Text>
            </View>

            {s.content.map((p, i) => (
              <Text key={i} style={i === 2 && s.id === "s1" ? styles.quote : styles.paragraph}>{p}</Text>
            ))}

            {s.bullets?.map((b, bi) => (
              <View key={bi} style={styles.bulletBlock}>
                {b.title && <Text style={styles.bulletHead}>{b.title}</Text>}
                {b.items.map((it, ii) => (
                  <View key={ii} style={styles.bulletRow}>
                    <View style={styles.bulletDot} />
                    <Text style={styles.bulletText}>{it}</Text>
                  </View>
                ))}
              </View>
            ))}

            {s.table && (
              <View style={styles.table}>
                <View style={styles.tableHeaderRow}>
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
          </View>
        ))}

        <View style={styles.footer}>
          <Ionicons name="leaf" size={20} color={theme.colors.primary} />
          <Text style={styles.footerText}>Ghid Părinte — informații din "Navigând Lumea Copilului Supradotat"</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  nav: { maxHeight: 48, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface },
  navChip: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: theme.colors.bg },
  navChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  navNum: { fontSize: 13, fontWeight: "700", color: theme.colors.textPrimary },
  hero: { marginBottom: 20 },
  badge: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2, color: theme.colors.primary, marginBottom: 8 },
  heroTitle: { ...theme.font.h1, color: theme.colors.textPrimary },
  heroSub: { ...theme.font.bodyL, color: theme.colors.textSecondary, marginTop: 6 },
  bar: { width: 56, height: 4, borderRadius: 2, backgroundColor: theme.colors.primary, marginTop: 12, marginBottom: 16 },
  intro: { ...theme.font.body, color: theme.colors.textPrimary, lineHeight: 24 },
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
  footer: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center", marginTop: 32, paddingTop: 20, borderTopWidth: 1, borderTopColor: theme.colors.border },
  footerText: { fontSize: 11, color: theme.colors.textDisabled },
});
