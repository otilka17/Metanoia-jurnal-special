import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable
} from "react-native";
import { Alert } from "@/src/lib/alert";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { api } from "@/src/lib/api";
import { theme, moods } from "@/src/lib/theme";
import {
  getReminderSettings, saveReminderSettings, requestNotificationPermission,
  scheduleDailyReminder, cancelAllJournalReminders, openAppSettings,
  type ReminderSettings,
} from "@/src/lib/notifications";

type Entry = { id: string; title: string; note: string; mood: string; triggers: string; category_id?: string; created_at: string; author_name?: string; is_mine?: boolean; user_id?: string };
type Cat = { id: string; title: string; color: string };

function pad(n: number) { return n.toString().padStart(2, "0"); }

export default function JournalScreen() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [stats, setStats] = useState<{ total: number; moods: Record<string, number>; categories: Record<string, number> } | null>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [mood, setMood] = useState("calm");
  const [triggers, setTriggers] = useState("");
  const [catId, setCatId] = useState("");
  const [saving, setSaving] = useState(false);
  const [filterMood, setFilterMood] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [patternsText, setPatternsText] = useState<string>("");
  const [patternsLoading, setPatternsLoading] = useState(false);

  // Reminder state
  const [reminder, setReminder] = useState<ReminderSettings>({ enabled: false, hour: 20, minute: 0 });
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showPrePerm, setShowPrePerm] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);

  useEffect(() => {
    (async () => { setReminder(await getReminderSettings()); })();
  }, []);

  const fetchPatterns = async () => {
    setPatternsLoading(true);
    try { const r: any = await api.journalPatterns(); setPatternsText(r.insight); }
    catch (e: any) { setPatternsText("Eroare: " + (e.message || "")); }
    finally { setPatternsLoading(false); }
  };

  useEffect(() => {
    (async () => {
      try {
        const r: any = await api.getCategories();
        setCats(r.categories.map((c: any) => ({ id: c.id, title: c.title, color: c.color })));
      } catch {}
    })();
  }, []);

  const load = async () => {
    try {
      const r: any = await api.listJournal();
      setEntries(r.entries);
      const s: any = await api.journalStats();
      setStats(s);
    } catch (e) { console.warn(e); }
  };

  useFocusEffect(useCallback(() => {
    (async () => { setLoading(true); await load(); setLoading(false); })();
  }, []));

  const submit = async () => {
    if (!title.trim() || !note.trim()) { Alert.alert("Atenție", "Completează titlul și nota."); return; }
    setSaving(true);
    try {
      await api.createJournal({ title: title.trim(), note: note.trim(), mood, triggers: triggers.trim(), category_id: catId });
      setTitle(""); setNote(""); setMood("calm"); setTriggers(""); setCatId("");
      setShowForm(false);
      await load();
    } catch (e: any) { Alert.alert("Eroare", e.message); }
    finally { setSaving(false); }
  };

  const removeEntry = (id: string) => {
    Alert.alert("Șterge", "Sigur ștergi această însemnare?", [
      { text: "Anulează", style: "cancel" },
      { text: "Șterge", style: "destructive", onPress: async () => { await api.deleteJournal(id); await load(); } },
    ]);
  };

  // ============ REMINDER ACTIONS ============
  const openReminderPanel = async () => {
    setReminder(await getReminderSettings());
    setShowReminderModal(true);
  };

  const proceedEnableReminder = async (h: number, m: number) => {
    setReminderBusy(true);
    try {
      const perm = await requestNotificationPermission();
      if (!perm.granted) {
        if (!perm.canAskAgain) {
          Alert.alert(
            "Permisiuni dezactivate",
            "Te rog activează notificările din Setări pentru a primi reminderul zilnic.",
            [
              { text: "Anulează", style: "cancel" },
              { text: "Deschide setări", onPress: () => openAppSettings() },
            ]
          );
        } else {
          Alert.alert("Permisiune respinsă", "Reminderul nu poate fi activat fără permisiunea pentru notificări.");
        }
        return;
      }
      const ok = await scheduleDailyReminder(h, m);
      if (!ok) {
        Alert.alert("Eroare", "Nu am putut programa notificarea. Încearcă din nou.");
        return;
      }
      const s: ReminderSettings = { enabled: true, hour: h, minute: m };
      await saveReminderSettings(s);
      setReminder(s);
      Alert.alert("Reminder activ ✓", `Vei primi notificarea zilnic la ${pad(h)}:${pad(m)}.`);
    } finally {
      setReminderBusy(false);
    }
  };

  const handleEnableTap = async () => {
    // Show pre-permission explanation first
    setShowPrePerm(true);
  };

  const disableReminder = async () => {
    setReminderBusy(true);
    try {
      await cancelAllJournalReminders();
      const s: ReminderSettings = { ...reminder, enabled: false };
      await saveReminderSettings(s);
      setReminder(s);
    } finally {
      setReminderBusy(false);
    }
  };

  const onTimePicked = async (event: any, date?: Date) => {
    setShowTimePicker(false);
    if (event?.type === "dismissed" || !date) return;
    const h = date.getHours();
    const m = date.getMinutes();
    if (reminder.enabled) {
      // Reschedule with new time
      await proceedEnableReminder(h, m);
    } else {
      // Just save the time preference (not yet enabled)
      const s: ReminderSettings = { ...reminder, hour: h, minute: m };
      await saveReminderSettings(s);
      setReminder(s);
    }
  };

  const getMood = (k: string) => moods.find((m) => m.key === k) || moods[0];
  const getCat = (id: string) => cats.find((c) => c.id === id);

  const filtered = entries.filter((e) =>
    (!filterMood || e.mood === filterMood) &&
    (!filterCat || e.category_id === filterCat)
  );

  const moodMax = stats ? Math.max(1, ...Object.values(stats.moods)) : 1;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Jurnal Părinte</Text>
          <Text style={styles.subtitle}>Notițe și statistici lunare</Text>
        </View>
        <TouchableOpacity testID="open-reminder-button" style={styles.iconCircle} onPress={openReminderPanel}>
          <Ionicons name={reminder.enabled ? "notifications" : "notifications-outline"} size={20} color={reminder.enabled ? theme.colors.primary : theme.colors.textSecondary} />
          {reminder.enabled && <View style={styles.bellDot} />}
        </TouchableOpacity>
        <TouchableOpacity testID="open-stats-button" style={styles.iconCircle} onPress={() => setShowStats(true)}>
          <Ionicons name="stats-chart" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity testID="open-journal-form-button" style={styles.fab} onPress={() => setShowForm(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 40, marginBottom: 4 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        {moods.map((m) => {
          const active = filterMood === m.key;
          return (
            <TouchableOpacity key={m.key} testID={`fm-${m.key}`} onPress={() => setFilterMood(active ? null : m.key)} style={[styles.chip, { borderColor: m.color }, active && { backgroundColor: m.color }]}>
              <Text>{m.emoji}</Text>
              <Text style={[styles.chipText, active && { color: "#fff", fontWeight: "600" }]}>{m.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 40, marginBottom: 8 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        {cats.map((c) => {
          const active = filterCat === c.id;
          return (
            <TouchableOpacity key={c.id} testID={`fc-${c.id}`} onPress={() => setFilterCat(active ? null : c.id)} style={[styles.chip, { borderColor: c.color }, active && { backgroundColor: c.color }]}>
              <View style={[styles.dot, { backgroundColor: active ? "#fff" : c.color }]} />
              <Text style={[styles.chipText, active && { color: "#fff", fontWeight: "600" }]} numberOfLines={1}>
                {c.title.length > 18 ? c.title.slice(0, 18) + "…" : c.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} /> : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="book-outline" size={56} color={theme.colors.textDisabled} />
          <Text style={styles.emptyTitle}>{entries.length === 0 ? "Nicio însemnare încă" : "Niciun rezultat pentru filtrele alese"}</Text>
          <Text style={styles.emptyText}>{entries.length === 0 ? "Notează observații pentru a identifica tipare." : "Resetează filtrele de mai sus."}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          {filtered.map((e, idx) => {
            const m = getMood(e.mood);
            const c = e.category_id ? getCat(e.category_id) : null;
            return (
              <View key={e.id} style={styles.entry} testID={`journal-entry-${idx}`}>
                <View style={styles.entryHeader}>
                  <View style={[styles.moodBadge, { backgroundColor: m.color + "22" }]}>
                    <Text>{m.emoji}</Text>
                    <Text style={[styles.moodText, { color: m.color }]}>{m.label}</Text>
                  </View>
                  {c && (
                    <View style={[styles.catTag, { borderColor: c.color }]}>
                      <View style={[styles.dot, { backgroundColor: c.color }]} />
                      <Text style={[styles.catTagText, { color: c.color }]} numberOfLines={1}>{c.title.length > 20 ? c.title.slice(0,20)+'…' : c.title}</Text>
                    </View>
                  )}
                  <TouchableOpacity onPress={() => removeEntry(e.id)} testID={`del-${idx}`}>
                    <Ionicons name="trash-outline" size={18} color={theme.colors.textDisabled} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.entryTitle}>{e.title}</Text>
                {!e.is_mine && e.author_name && (
                  <View style={styles.authorTag}>
                    <Ionicons name="person-circle" size={12} color={theme.colors.primary} />
                    <Text style={styles.authorTagText}>{e.author_name}</Text>
                  </View>
                )}
                <Text style={styles.entryNote}>{e.note}</Text>
                {!!e.triggers && <View style={styles.triggersBox}><Text style={styles.triggersLabel}>Declanșatori</Text><Text style={styles.triggersText}>{e.triggers}</Text></View>}
                <Text style={styles.entryDate}>{new Date(e.created_at).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" })}</Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* STATS MODAL */}
      <Modal visible={showStats} animationType="slide" onRequestClose={() => setShowStats(false)}>
        <SafeAreaView style={styles.safe} edges={["top","bottom"]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowStats(false)}><Ionicons name="close" size={26} color={theme.colors.textPrimary} /></TouchableOpacity>
            <Text style={styles.modalTitle}>Statistici 30 zile</Text>
            <View style={{ width: 26 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <View style={styles.statHero}>
              <Text style={styles.statBig}>{stats?.total || 0}</Text>
              <Text style={styles.statBigLabel}>însemnări în ultimele 30 zile</Text>
            </View>
            <Text style={styles.statSection}>Stări dominante</Text>
            {moods.map((m) => {
              const v = stats?.moods?.[m.key] || 0;
              const pct = (v / moodMax) * 100;
              return (
                <View key={m.key} style={styles.barRow}>
                  <Text style={styles.barLabel}>{m.emoji} {m.label}</Text>
                  <View style={styles.barTrack}><View style={[styles.barFill, { width: `${pct}%`, backgroundColor: m.color }]} /></View>
                  <Text style={[styles.barVal, { color: m.color }]}>{v}</Text>
                </View>
              );
            })}
            <Text style={styles.statSection}>Categorii observate</Text>
            {cats.map((c) => {
              const v = stats?.categories?.[c.id] || 0;
              if (!v) return null;
              return (
                <View key={c.id} style={styles.catStatRow}>
                  <View style={[styles.dot, { backgroundColor: c.color }]} />
                  <Text style={styles.catStatTitle} numberOfLines={1}>{c.title}</Text>
                  <Text style={[styles.catStatVal, { color: c.color }]}>{v}</Text>
                </View>
              );
            })}

            <Text style={styles.statSection}>🔍 Analiză AI de tipare</Text>
            {!patternsText && !patternsLoading && (
              <TouchableOpacity testID="patterns-btn" style={styles.primaryBtn} onPress={fetchPatterns}>
                <Text style={styles.primaryBtnText}>Generează analiză</Text>
              </TouchableOpacity>
            )}
            {patternsLoading && <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 12 }} />}
            {!!patternsText && (
              <View style={styles.patternsBox}>
                <Text style={styles.patternsText}>{patternsText}</Text>
                <TouchableOpacity onPress={fetchPatterns} style={{ alignSelf: "flex-start", marginTop: 8 }}>
                  <Text style={{ color: theme.colors.primary, fontWeight: "600", fontSize: 12 }}>↻ Regenerează</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* FORM MODAL */}
      <Modal visible={showForm} animationType="slide" onRequestClose={() => setShowForm(false)}>
        <SafeAreaView style={styles.safe} edges={["top","bottom"]}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowForm(false)}><Ionicons name="close" size={26} color={theme.colors.textPrimary} /></TouchableOpacity>
              <Text style={styles.modalTitle}>Însemnare nouă</Text>
              <View style={{ width: 26 }} />
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>STARE</Text>
              <View style={styles.wrapRow}>
                {moods.map((m) => (
                  <TouchableOpacity key={m.key} testID={`mood-${m.key}`} style={[styles.moodOption, { borderColor: m.color }, mood === m.key && { backgroundColor: m.color + "22" }]} onPress={() => setMood(m.key)}>
                    <Text>{m.emoji}</Text>
                    <Text style={[styles.moodLabel, mood === m.key && { color: m.color, fontWeight: "600" }]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>CATEGORIE (OPȚIONAL)</Text>
              <View style={styles.wrapRow}>
                {cats.map((c) => (
                  <TouchableOpacity key={c.id} testID={`pc-${c.id}`} onPress={() => setCatId(catId === c.id ? "" : c.id)} style={[styles.moodOption, { borderColor: c.color }, catId === c.id && { backgroundColor: c.color + "22" }]}>
                    <View style={[styles.dot, { backgroundColor: c.color }]} />
                    <Text style={[styles.moodLabel, catId === c.id && { color: c.color, fontWeight: "600" }]} numberOfLines={1}>{c.title.length > 16 ? c.title.slice(0,16)+'…' : c.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>TITLU</Text>
              <TextInput testID="journal-title-input" style={styles.input} placeholder="Ex: Criză înainte de școală" placeholderTextColor={theme.colors.textDisabled} value={title} onChangeText={setTitle} />
              <Text style={styles.label}>NOTĂ</Text>
              <TextInput testID="journal-note-input" style={[styles.input, { minHeight: 100, textAlignVertical: "top" }]} placeholder="Descrie situația..." placeholderTextColor={theme.colors.textDisabled} multiline value={note} onChangeText={setNote} />
              <Text style={styles.label}>DECLANȘATORI (OPȚIONAL)</Text>
              <TextInput testID="journal-triggers-input" style={styles.input} placeholder="Foame, oboseală..." placeholderTextColor={theme.colors.textDisabled} value={triggers} onChangeText={setTriggers} />

              <TouchableOpacity testID="save-journal-button" style={[styles.primaryBtn, { marginTop: 24 }, saving && { opacity: 0.6 }]} onPress={submit} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Salvează</Text>}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* REMINDER MODAL */}
      <Modal visible={showReminderModal} transparent animationType="fade" onRequestClose={() => setShowReminderModal(false)}>
        <Pressable style={styles.sheetBg} onPress={() => setShowReminderModal(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetIcon}><Ionicons name="notifications" size={28} color={theme.colors.primary} /></View>
            <Text style={styles.sheetTitle}>Reminder zilnic jurnal</Text>
            <Text style={styles.sheetDesc}>
              {reminder.enabled
                ? "Primești o notificare zilnică ca să nu uiți să adaugi o însemnare."
                : "Activează un reminder care îți amintește zilnic să adaugi o însemnare scurtă în jurnal."
              }
            </Text>

            <TouchableOpacity testID="reminder-time-btn" style={styles.timeButton} onPress={() => setShowTimePicker(true)}>
              <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.timeButtonText}>{pad(reminder.hour)}:{pad(reminder.minute)}</Text>
              <Text style={styles.timeButtonHint}>Apasă pentru a schimba</Text>
            </TouchableOpacity>

            {reminder.enabled ? (
              <TouchableOpacity testID="reminder-disable-btn" style={[styles.dangerBtn, reminderBusy && { opacity: 0.6 }]} onPress={disableReminder} disabled={reminderBusy}>
                {reminderBusy ? <ActivityIndicator color="#B56B6B" /> : (
                  <>
                    <Ionicons name="notifications-off" size={18} color="#B56B6B" />
                    <Text style={styles.dangerBtnText}>Dezactivează reminder</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity testID="reminder-enable-btn" style={[styles.primaryBtn, { marginTop: 16, flexDirection: "row", gap: 8 }, reminderBusy && { opacity: 0.6 }]} onPress={handleEnableTap} disabled={reminderBusy}>
                {reminderBusy ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Ionicons name="notifications" size={18} color="#fff" />
                    <Text style={styles.primaryBtnText}>Activează reminder</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => setShowReminderModal(false)} style={{ marginTop: 12, alignSelf: "center" }}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>Închide</Text>
            </TouchableOpacity>

            {showTimePicker && (
              <DateTimePicker
                value={(() => { const d = new Date(); d.setHours(reminder.hour); d.setMinutes(reminder.minute); d.setSeconds(0); return d; })()}
                mode="time"
                is24Hour
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onTimePicked}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* PRE-PERMISSION EXPLANATION */}
      <Modal visible={showPrePerm} transparent animationType="fade" onRequestClose={() => setShowPrePerm(false)}>
        <View style={styles.permBg}>
          <View style={styles.permBox}>
            <View style={styles.permIcon}><Ionicons name="notifications" size={32} color={theme.colors.primary} /></View>
            <Text style={styles.permTitle}>Permite notificările</Text>
            <Text style={styles.permDesc}>
              Vom programa o notificare zilnică la <Text style={{ fontWeight: "700", color: theme.colors.primary }}>{pad(reminder.hour)}:{pad(reminder.minute)}</Text> care te va întreba dacă vrei să adaugi o însemnare în jurnal.
            </Text>
            <Text style={styles.permDescSmall}>
              Notificarea rămâne pe device — datele tale nu sunt trimise nicăieri.
            </Text>
            <TouchableOpacity testID="perm-accept" style={styles.primaryBtn} onPress={async () => { setShowPrePerm(false); await proceedEnableReminder(reminder.hour, reminder.minute); }}>
              <Text style={styles.primaryBtnText}>Da, activează</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowPrePerm(false)} style={{ marginTop: 8, paddingVertical: 12 }}>
              <Text style={{ color: theme.colors.textSecondary, textAlign: "center" }}>Acum nu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  title: { ...theme.font.h1, color: theme.colors.textPrimary },
  subtitle: { ...theme.font.body, color: theme.colors.textSecondary, marginTop: 2 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  bellDot: { position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary, borderWidth: 2, borderColor: theme.colors.surface },
  fab: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  sheetBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border, alignSelf: "center", marginBottom: 12 },
  sheetIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primary + "22", alignSelf: "center", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: theme.colors.textPrimary, textAlign: "center", marginBottom: 6 },
  sheetDesc: { fontSize: 13, color: theme.colors.textSecondary, textAlign: "center", marginBottom: 18, lineHeight: 19 },
  timeButton: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: theme.colors.bg, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 12 },
  timeButtonText: { fontSize: 22, fontWeight: "700", color: theme.colors.primary, fontVariant: ["tabular-nums"] },
  timeButtonHint: { flex: 1, fontSize: 11, color: theme.colors.textSecondary, textAlign: "right" },
  dangerBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#B56B6B22", borderRadius: 999, paddingVertical: 14, marginTop: 16 },
  dangerBtnText: { color: "#B56B6B", fontWeight: "700" },
  permBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 24 },
  permBox: { width: "100%", maxWidth: 360, backgroundColor: theme.colors.surface, borderRadius: 20, padding: 24, alignItems: "stretch" },
  permIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.primary + "22", alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 14 },
  permTitle: { fontSize: 18, fontWeight: "700", color: theme.colors.textPrimary, textAlign: "center", marginBottom: 8 },
  permDesc: { fontSize: 14, color: theme.colors.textPrimary, textAlign: "center", lineHeight: 21, marginBottom: 10 },
  permDescSmall: { fontSize: 12, color: theme.colors.textSecondary, textAlign: "center", marginBottom: 20, lineHeight: 17 },
  chip: { flexDirection: "row", alignItems: "center", flexShrink: 0, gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5, backgroundColor: theme.colors.surface },
  chipText: { fontSize: 12, color: theme.colors.textPrimary, maxWidth: 160 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  empty: { alignItems: "center", marginTop: 40, paddingHorizontal: 32 },
  emptyTitle: { ...theme.font.h3, color: theme.colors.textPrimary, marginTop: 16, textAlign: "center" },
  emptyText: { ...theme.font.body, color: theme.colors.textSecondary, marginTop: 8, textAlign: "center" },
  primaryBtn: { backgroundColor: theme.colors.primary, borderRadius: 999, paddingVertical: 14, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "600" },
  entry: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
  entryHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  moodBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  moodText: { fontSize: 12, fontWeight: "600" },
  catTag: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  catTagText: { fontSize: 11, fontWeight: "600", flex: 1 },
  entryTitle: { fontSize: 16, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 4 },
  authorTag: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: theme.colors.primary + "11", alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginBottom: 6 },
  authorTagText: { fontSize: 11, color: theme.colors.primary, fontWeight: "600" },
  entryNote: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20 },
  triggersBox: { backgroundColor: theme.colors.surfaceElevated, borderRadius: 8, padding: 10, marginTop: 8 },
  triggersLabel: { fontSize: 10, fontWeight: "600", color: theme.colors.textSecondary, letterSpacing: 1, marginBottom: 2 },
  triggersText: { fontSize: 13, color: theme.colors.textPrimary },
  entryDate: { fontSize: 11, color: theme.colors.textDisabled, marginTop: 8 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  modalTitle: { ...theme.font.h3, color: theme.colors.textPrimary },
  label: { ...theme.font.label, color: theme.colors.textSecondary, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: theme.colors.surfaceElevated, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: theme.colors.textPrimary },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  moodOption: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, borderWidth: 1.5, backgroundColor: theme.colors.surface },
  moodLabel: { fontSize: 13, color: theme.colors.textPrimary },
  statHero: { alignItems: "center", paddingVertical: 24, backgroundColor: theme.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border },
  statBig: { fontSize: 56, fontWeight: "700", color: theme.colors.primary },
  statBigLabel: { ...theme.font.body, color: theme.colors.textSecondary },
  statSection: { ...theme.font.h3, color: theme.colors.textPrimary, marginTop: 24, marginBottom: 12 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  barLabel: { width: 100, fontSize: 13, color: theme.colors.textPrimary },
  barTrack: { flex: 1, height: 12, backgroundColor: theme.colors.surfaceElevated, borderRadius: 6, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 6 },
  barVal: { width: 32, textAlign: "right", fontSize: 13, fontWeight: "700" },
  catStatRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  catStatTitle: { flex: 1, fontSize: 13, color: theme.colors.textPrimary },
  catStatVal: { fontSize: 14, fontWeight: "700" },
  patternsBox: { backgroundColor: theme.colors.primary + "11", padding: 14, borderRadius: 12, borderLeftWidth: 3, borderLeftColor: theme.colors.primary },
  patternsText: { fontSize: 13, color: theme.colors.textPrimary, lineHeight: 20 },
});
