import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/lib/theme";

export default function PrivacyScreen() {
  const router = useRouter();

  const changeCookiePreference = () => {
    if (Platform.OS !== "web") return;
    try {
      window.localStorage.removeItem("cookie_consent");
    } catch {}
    window.location.reload();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: theme.colors.surface }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={26} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Politica de Confidențialitate</Text>
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.updated}>Ultima actualizare: august 2026</Text>

        <Text style={styles.p}>
          Jurnal Părinte (Metanoia) respectă confidențialitatea datelor tale și ale familiei tale. Acest
          document explică ce date colectăm, de ce, cu cine le partajăm și ce drepturi ai, în conformitate
          cu Regulamentul General privind Protecția Datelor (GDPR).
        </Text>

        <Text style={styles.h}>1. Ce date colectăm</Text>
        <Text style={styles.li}>• Date de cont: nume, adresă de email, parolă (stocată criptat, niciodată în text simplu).</Text>
        <Text style={styles.li}>• Conținut generat de tine: însemnări de jurnal, întrebări către asistentul AI, rezultate ale testului de profil, postări/răspunsuri în comunitate, recenzii.</Text>
        <Text style={styles.li}>• Date tehnice minime necesare funcționării (ex. jetoane de autentificare).</Text>
        <Text style={styles.p}>
          Nu colectăm date direct de la copii — aplicația este destinată părinților/adulților, care pot
          alege ce informații despre copilul lor introduc în jurnal, în testul de profil sau în
          conversațiile cu AI (ex. profil, note, vârstă). Aceste informații sunt legate strict de contul
          tău și sunt vizibile doar pentru tine — părintele/tutorele legal care le-a introdus — și, dacă
          alegi să te alături unei familii în aplicație, pentru ceilalți membri ai familiei tale. Nu sunt
          niciodată vizibile altor utilizatori.
        </Text>

        <Text style={styles.h}>2. De ce folosim aceste date</Text>
        <Text style={styles.li}>• Pentru a-ți crea și administra contul.</Text>
        <Text style={styles.li}>• Pentru a genera răspunsuri AI personalizate (articole, explicații, „Întreabă specialistul").</Text>
        <Text style={styles.li}>• Pentru a-ți arăta propriile statistici și progres.</Text>
        <Text style={styles.li}>• Pentru a-ți trimite emailuri esențiale (bun venit, resetare parolă, notificări de familie).</Text>
        <Text style={styles.li}>• Pentru a-ți trimite, ocazional, anunțuri despre noutăți în aplicație — te poți dezabona oricând din Profil.</Text>

        <Text style={styles.h}>3. Cu cine partajăm datele</Text>
        <Text style={styles.p}>Nu vindem datele tale. Le partajăm strict cu furnizorii tehnici necesari funcționării aplicației:</Text>
        <Text style={styles.li}>• <Text style={styles.b}>Anthropic (Claude)</Text> — procesează textul trimis către funcțiile AI (jurnal, întrebări, articole), pentru a genera răspunsul.</Text>
        <Text style={styles.li}>• <Text style={styles.b}>MongoDB Atlas</Text> — găzduiește baza de date unde sunt stocate informațiile contului tău.</Text>
        <Text style={styles.li}>• <Text style={styles.b}>Render</Text> — găzduiește serverul aplicației.</Text>
        <Text style={styles.li}>• <Text style={styles.b}>Resend</Text> — trimite emailurile aplicației (bun venit, resetare parolă).</Text>

        <Text style={styles.h}>4. Cât timp păstrăm datele</Text>
        <Text style={styles.p}>
          Păstrăm datele cât timp contul tău este activ. Poți cere oricând ștergerea completă a contului
          și a tuturor datelor asociate (jurnal, teste, postări, recenzii) — vezi secțiunea „Drepturile tale".
        </Text>

        <Text style={styles.h}>5. Drepturile tale (GDPR)</Text>
        <Text style={styles.li}>• Dreptul de acces — poți vedea ce date avem despre tine (ecranul Profil).</Text>
        <Text style={styles.li}>• Dreptul de rectificare — poți corecta oricând datele contului.</Text>
        <Text style={styles.li}>• Dreptul de ștergere („dreptul de a fi uitat") — poți să-ți ștergi singur/ă contul și toate datele asociate, oricând, din Profil → „Șterge contul și toate datele mele".</Text>
        <Text style={styles.li}>• Dreptul de portabilitate — poți cere o copie a datelor tale într-un format uzual.</Text>
        <Text style={styles.li}>• Dreptul de opoziție — te poți dezabona oricând de la emailurile aplicației din Profil → „Dezabonează-te de la emailuri", sau te poți opune altor prelucrări scriindu-ne.</Text>
        <Text style={styles.p}>
          Pentru orice altă solicitare legată de aceste drepturi, scrie-ne la {" "}
          <Text style={styles.b}>otilia.ioana96@gmail.com</Text>. Răspundem în cel mult 30 de zile.
        </Text>

        <Text style={styles.h}>6. Securitate</Text>
        <Text style={styles.p}>
          Parolele sunt stocate criptat (hash bcrypt), niciodată în text simplu. Comunicarea cu serverul
          se face criptat (HTTPS). Accesul la datele administrative este limitat la un singur cont
          administrator.
        </Text>

        <Text style={styles.h}>7. Cookie-uri</Text>
        <Text style={styles.p}>
          Aplicația în sine (contul tău, jurnalul, testele) nu folosește cookie-uri proprii — datele de
          autentificare sunt stocate local pe dispozitivul tău, nu în cookie-uri.
        </Text>
        <Text style={styles.p}>
          Widget-ul de chat live (<Text style={styles.b}>Tawk.to</Text>) folosește cookie-uri proprii, terțe,
          pentru a ține minte conversația și vizitatorul. Acesta se încarcă doar dacă alegi „Accept" la
          banner-ul afișat la prima vizită — dacă alegi „Refuz", widget-ul de chat nu se încarcă și nu se
          setează niciun cookie.
        </Text>
        {Platform.OS === "web" && (
          <TouchableOpacity onPress={changeCookiePreference} style={styles.cookieBtn}>
            <Ionicons name="refresh-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.cookieBtnText}>Schimbă preferința despre cookie-uri</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.h}>8. Contact</Text>
        <Text style={styles.p}>
          Pentru orice întrebare despre confidențialitate, ne poți scrie la{" "}
          <Text style={styles.b}>otilia.ioana96@gmail.com</Text>.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontWeight: "700", color: theme.colors.textPrimary, flex: 1 },
  container: { padding: 20, paddingBottom: 40 },
  updated: { fontSize: 12, color: theme.colors.textDisabled, marginBottom: 16, fontStyle: "italic" },
  h: { fontSize: 16, fontWeight: "700", color: theme.colors.textPrimary, marginTop: 20, marginBottom: 8 },
  p: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 21, marginBottom: 10 },
  li: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 21, marginBottom: 6, paddingLeft: 4 },
  b: { fontWeight: "700", color: theme.colors.textPrimary },
  cookieBtn: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", backgroundColor: theme.colors.surfaceElevated, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, marginTop: 4 },
  cookieBtnText: { fontSize: 12.5, color: theme.colors.primary, fontWeight: "600" },
});
