import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/lib/theme";

export default function TermsScreen() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: theme.colors.surface }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={26} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Termeni și Condiții</Text>
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.updated}>Ultima actualizare: august 2026</Text>

        <Text style={styles.p}>
          Prin crearea unui cont și folosirea aplicației Jurnal Părinte (Metanoia), ești de acord cu acești
          termeni. Te rugăm să-i citești cu atenție.
        </Text>

        <Text style={styles.h}>1. Ce este aplicația</Text>
        <Text style={styles.p}>
          Jurnal Părinte este o aplicație de monitorizare și sprijin educațional pentru părinții copiilor cu
          profiluri atipice (supradotați, ADHD, autism, sensibilitate emoțională). Aplicația oferă jurnal
          pentru urmărirea evoluției copilului, teste orientative, conținut informativ, un asistent AI
          conversațional și o comunitate de părinți.
        </Text>

        <Text style={styles.h}>2. Nu este consult medical sau psihologic</Text>
        <Text style={styles.p}>
          Conținutul aplicației — inclusiv răspunsurile AI, testele și tabelele comparative — este strict
          educațional și NU constituie diagnostic, tratament sau consult de specialitate. Aplicația nu
          înlocuiește evaluarea unui psiholog, psihiatru sau medic pediatru. Pentru orice îngrijorare
          reală despre sănătatea sau dezvoltarea copilului tău, consultă un specialist.
        </Text>
        <Text style={styles.p}>
          Această aplicație nu oferă terapie (ABA, logopedie, kinetoterapie etc.), evaluare clinică sau
          diagnostic medical și nu înlocuiește echipa multidisciplinară de specialiști care monitorizează
          copilul tău.
        </Text>

        <Text style={styles.h}>3. Contul tău</Text>
        <Text style={styles.li}>• Ești responsabil pentru confidențialitatea parolei tale.</Text>
        <Text style={styles.li}>• Datele introduse (nume, email) trebuie să fie corecte.</Text>
        <Text style={styles.li}>• Poți cere oricând ștergerea contului, scriindu-ne la otilia.ioana96@gmail.com.</Text>

        <Text style={styles.h}>4. Comunitatea</Text>
        <Text style={styles.p}>
          Secțiunea de comunitate permite postări anonime sau pseudonime. Este interzis conținutul
          abuziv, discriminatoriu, ilegal sau care distribuie informații medicale false. Postările pot fi
          raportate de alți utilizatori și șterse de administrator, la discreția acestuia.
        </Text>

        <Text style={styles.h}>5. Conținut generat de AI</Text>
        <Text style={styles.p}>
          Răspunsurile AI (articole, explicații, „Întreabă specialistul", tabele comparative) sunt generate
          automat de un model de limbaj (Claude, Anthropic), fără verificare individuală pentru fiecare
          răspuns. Pot conține inexactități — verifică întotdeauna informațiile importante cu un specialist.
        </Text>

        <Text style={styles.h}>6. Proprietate intelectuală</Text>
        <Text style={styles.p}>
          Conținutul original al Ghidului Specialistului, structura aplicației și materialele proprii
          aparțin Metanoia. Nu ai voie să copiezi sau redistribui conținutul fără acord scris.
        </Text>

        <Text style={styles.h}>7. Limitarea răspunderii</Text>
        <Text style={styles.p}>
          Aplicația este oferită „ca atare". Nu ne asumăm răspunderea pentru decizii luate exclusiv pe
          baza conținutului aplicației, fără consultarea unui specialist atunci când situația o cere.
        </Text>

        <Text style={styles.h}>8. Modificări</Text>
        <Text style={styles.p}>
          Putem actualiza acești termeni periodic. Continuarea folosirii aplicației după o actualizare
          înseamnă acceptarea noilor termeni.
        </Text>

        <Text style={styles.h}>9. Contact</Text>
        <Text style={styles.p}>
          Pentru întrebări despre acești termeni, scrie-ne la{" "}
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
});
