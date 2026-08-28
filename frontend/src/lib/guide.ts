export type GuideSection = {
  id: string;
  number: number;
  title: string;
  content: string[]; // paragraphs
  bullets?: { title?: string; items: string[] }[];
  table?: { headers: string[]; rows: string[][] };
};

export const GUIDE_TITLE = "Navigând Lumea Copilului Supradotat";
export const GUIDE_SUBTITLE = "Ghid Practic pentru Părinți";
export const GUIDE_INTRO =
  "Supradotarea reprezintă un construct psihopedagogic multidimensional, o realitate umană fascinantă care depășește cu mult granițele succesului școlar sau ale unui coeficient de inteligență ridicat. Pentru a înțelege profunzimea acestui fenomen, trebuie să privim dincolo de suprafață și să analizăm interacțiunea subtilă dintre potențialul nativ și mediul în care acesta se manifestă.";

export const GUIDE: GuideSection[] = [
  {
    id: "s1",
    number: 1,
    title: "Introducere: Înțelegerea Supradotării ca Sistem Dinamic",
    content: [
      "În viziunea specialiștilor E. Landau și J.S. Renzulli, supradotarea nu este o trăsătură statică, ci un sistem complex de influențe corelative. Erika Landau subliniază importanța mediului, care are rolul de a provoca și stimula inteligența și creativitatea, oferind copilului „curajul de a-și încerca șansele”. Fără acest context favorabil, motivația de a persevera poate rămâne latentă.",
      "Sinteza acestor perspective ne arată că, în timp ce Renzulli se concentrează pe trăsăturile interne necesare performanței, Landau evidențiază necesitatea unui „ecou” exterior. Joseph Renzulli definește acest comportament prin intersecția a trei factori esențiali:",
      "„Comportamentul aptitudinal înalt reflectă o interacțiune între trei grupuri fundamentale de trăsături umane: aptitudini generale și specifice supramedii, niveluri înalte de angajare în sarcină și niveluri înalte de creativitate.”",
      "Astfel, un copil supradotat nu este doar cel care „posedă” informație, ci cel care manifestă o motivație intrinsecă puternică și o capacitate creativă de a aplica aceste aptitudini în domenii de performanță diverse.",
    ],
  },
  {
    id: "s2",
    number: 2,
    title: "Portretul Copilului cu Abilități Înalte",
    content: [
      "Copiii cu dotare aptitudinală înaltă prezintă o configurație unică de trăsături. Deși nu sunt un grup omogen, următoarele caracteristici sunt indicatori frecvenți în procesul de identificare:",
    ],
    bullets: [
      {
        title: "Cognitiv (Disponibilități aptitudinale)",
        items: [
          "Vocabular precoce și nuanțat: structuri gramaticale complexe și metafore încă de la vârste fragede.",
          "Memorie superioară: capacitate excepțională de stocare și recuperare.",
          "Gândire abstractă și logică: idei complexe, perspicacitate, originalitate.",
          "Învățare rapidă: dobândirea abilităților cu efort minim și puține repetiții.",
          "Curiozitate investigativă: întrebări de sondare și dorința de a experimenta.",
        ],
      },
      {
        title: "Afectiv (Sensibilitate și intensitate)",
        items: [
          "Sensibilitate mărită: reacții emoționale intense la stimuli banali pentru alții.",
          "Idealism și simțul dreptății: preocupare timpurie pentru valori morale.",
          "Simțul umorului dezvoltat: adesea abstract sau neobișnuit pentru vârstă.",
          "Anxietate existențială: izolare generată de procesarea profundă a realității.",
        ],
      },
      {
        title: "Personalitate (Trăsături motivaționale)",
        items: [
          "Perseverență: angajament puternic în sarcinile de interes.",
          "Spirit de inițiativă și voluntarism: dorința de a influența mediul.",
          "Dorința de a organiza: structurarea prin scheme și jocuri complexe.",
          "Sentimentul de a fi diferit: conștientizarea discrepanței cu grupul.",
        ],
      },
    ],
  },
  {
    id: "s3",
    number: 3,
    title: "Heterocronia Dezvoltării Psihice",
    content: [
      "Un concept fundamental în managementul supradotării este Heterocronia dezvoltării psihice (dezvoltarea asincronă). Aceasta descrie decalajul adesea frapant între dezvoltarea intelectuală accelerată și maturitatea emoțională sau psihomotorie care poate corespunde vârstei cronologice.",
      "Această asincronie este o sursă majoră de tensiune internă. Capacitățile cognitive de tip „adult” îi permit copilului să acceseze și să analizeze informații globale traumatizante (război, moarte, nedreptate), însă sistemul său emoțional „de copil” nu posedă încă mecanismele de adaptare necesare pentru a procesa groaza existențială rezultată. Această discrepanță generează adesea anxietate severă și frustrare, necesitând o intervenție empatică din partea adulților.",
    ],
  },
  {
    id: "s-adhd",
    number: 4,
    title: "ADHD — Profilul Complet: Subtipuri, Simptome și Realitatea la Fete",
    content: [
      "ADHD (Tulburarea de Deficit de Atenție/Hiperactivitate) este o afecțiune de neurodezvoltare, nu o problemă de caracter sau de disciplină. Creierul unui copil cu ADHD procesează diferit funcțiile executive — planificarea, memoria de lucru, autoreglarea impulsurilor și a atenției — indiferent cât de motivat sau inteligent este copilul.",
      "DSM-5 descrie trei tipare de bază, care pot apărea separat sau combinate:",
    ],
    bullets: [
      {
        title: "Cele trei subtipuri",
        items: [
          "Predominant neatent: uită frecvent lucruri, pierde obiecte, pare „în lună”, are dificultăți la organizarea sarcinilor — fără agitație vizibilă.",
          "Predominant hiperactiv-impulsiv: neastâmpăr motor, vorbește excesiv, întrerupe, are dificultăți să aștepte rândul.",
          "Combinat: prezintă ambele tipare simultan — cea mai frecventă formă diagnosticată la băieți.",
        ],
      },
      {
        title: "ADHD-ul „invizibil” la fete",
        items: [
          "Visare cu ochii deschiși, minte „pierdută” — confundată adesea cu neatenția obișnuită sau cu timiditatea.",
          "Dezorganizare cronică: uită temele, obiectele personale, pașii unei sarcini.",
          "Perfecționism epuizant și autocritică severă („nu sunt destul de bună”), care maschează dificultatea reală de autoreglare.",
          "Oboseală emoțională disproporționată față de efortul depus vizibil.",
          "Hipersensibilitate socială — evită conflictul, se retrage, e etichetată „copil bun/cuminte”.",
        ],
      },
      {
        title: "Comorbidități frecvente",
        items: [
          "Anxietate și tulburări de dispoziție — apar la o proporție semnificativă a copiilor cu ADHD.",
          "Dificultăți specifice de învățare (dislexie, discalculie) — necesită evaluare separată.",
          "Tulburări de somn — adormire dificilă, somn agitat.",
          "Comportament opozant — reacție secundară la frustrarea cronică, nu trăsătură de bază.",
        ],
      },
    ],
  },
  {
    id: "s-autism",
    number: 5,
    title: "Tulburarea de Spectru Autist (TSA): Trăsături, Forțe și Sprijin Practic",
    content: [
      "Spectrul autist descrie o gamă largă de moduri de a percepe, procesa și relaționa cu lumea — de aceea „dacă ai cunoscut un copil cu autism, ai cunoscut UN copil cu autism”. Nu există un singur tipar; profilul senzorial, de comunicare și social variază enorm de la un copil la altul.",
      "TSA se poate suprapune cu supradotarea sau cu ADHD (profil „AuDHD”), ceea ce complică adesea identificarea — trăsăturile unei condiții pot masca sau fi confundate cu ale celeilalte.",
    ],
    bullets: [
      {
        title: "Trăsături frecvente",
        items: [
          "Procesare senzorială diferită: hipersensibilitate (zgomot, texturi, lumini) sau hiposensibilitate la anumiți stimuli.",
          "Nevoie de predictibilitate și rutină — schimbările neanunțate pot genera stres intens.",
          "Interese intense și focalizate, adesea aprofundate până la nivel de expertiză.",
          "Comunicare socială diferită: limbaj literal, dificultate în a „citi” indicii sociale nescrise, contact vizual inconfortabil.",
          "Autoreglare prin mișcări repetitive (stimming) — un mecanism de calmare, nu un comportament de eliminat.",
        ],
      },
      {
        title: "Puncte forte adesea neobservate",
        items: [
          "Onestitate și directețe — spun exact ce gândesc, fără jocuri sociale ascunse.",
          "Recunoașterea tiparelor și atenția excepțională la detalii.",
          "Loialitate profundă și memorie foarte bună pentru domeniile de interes.",
          "Gândire „în afara cutiei” — soluții neconvenționale la probleme.",
        ],
      },
      {
        title: "Strategii practice pentru părinți",
        items: [
          "Folosește programe vizuale pentru rutina zilnică — reduce anxietatea legată de necunoscut.",
          "Anunță din timp tranzițiile („mai sunt 5 minute până plecăm”) în loc de schimbări bruște.",
          "Respectă nevoile senzoriale — nu forța contactul vizual sau tolerarea unui stimul deranjant.",
          "Folosește interesul special al copilului ca punte de conectare și motivație pentru învățare.",
          "Vorbește direct și concret; evită sarcasmul sau instrucțiunile ambigue.",
        ],
      },
    ],
  },
  {
    id: "s-diagnostic-medical",
    number: 6,
    title: "Diagnostic Diferențial Medical: Cauze Fizice Care Imită ADHD sau Autismul",
    content: [
      "Înainte sau în paralel cu o evaluare psihologică pentru ADHD, autism sau alte profile atipice, merită verificate câteva cauze medicale frecvente și ieftine, care pot produce simptome aproape identice — agitație, neatenție, iritabilitate, somn agitat. Sunt situații în care copilul NU are de fapt ADHD sau autism, ci o problemă fizică ușor de tratat, care se „ascunde” în spatele acelorași manifestări.",
      "Nu este vorba despre analize scumpe sau greu accesibile — sunt investigații uzuale, pe care orice medic de familie sau pediatru le poate recomanda, și care merită discutate înainte de a trage o concluzie definitivă. Această listă NU este un ghid de autodiagnostic și nu înlocuiește un medic — interpretarea rezultatelor și decizia privind orice tratament rămân exclusiv la medicul de familie/pediatru. Dacă rezultatele ies normale, ai eliminat o cauză fizică; dacă nu, uneori soluția e mult mai simplă decât se anticipa inițial.",
    ],
    bullets: [
      {
        title: "Analize simple, de discutat cu pediatrul",
        items: [
          "Hemoleucogramă + Sideremie + Feritină (anemia feriprivă): fierul scăzut — chiar și în jumătatea inferioară a intervalului normal, nu doar sub el — poate produce agitație, neastâmpăr și somn agitat, ușor confundate cu ADHD.",
          "Profil tiroidian (TSH, T3, T4) — plus ecografie tiroidiană dacă există boli tiroidiene în familie: atât hipertiroidismul (agitație, neatenție), cât și hipotiroidismul (oboseală, lentoare) pot mima sau agrava un tablou de tip ADHD.",
          "25-OH-Vitamina D: un nivel scăzut a fost asociat în mai multe studii cu dificultăți de atenție și reglare comportamentală la copii — analiză simplă și larg disponibilă.",
          "Coproparazitologie (test de scaun pentru paraziți intestinali, inclusiv testul pentru oxiuri): paraziții intestinali sunt frecvenți la vârsta preșcolară/școlară și pot cauza iritabilitate, somn agitat și dificultăți de concentrare.",
        ],
      },
    ],
  },
  {
    id: "s4",
    number: 7,
    title: "ADHD versus Energie Normală și Supradotare",
    content: [
      "Diferențierea corectă între un temperament activ, specific supradotării, și tulburarea de hiperactivitate cu deficit de atenție (ADHD) este vitală pentru a evita etichetarea eronată. Conform criteriilor „Rei Alternative Center”, diagnosticul de ADHD necesită persistența simptomelor în cel puțin două contexte diferite (de exemplu, atât acasă, cât și la școală).",
    ],
    table: {
      headers: ["Energie Normală / Supradotare", "Indicatori ADHD"],
      rows: [
        ["Contextual: hiperfocalizare în activități de interes.", "Generalizat: dificultăți persistente chiar în sarcini preferate."],
        ["Adaptabil: agitația scade în medii stimulante sau calme.", "Inflexibil: agitația persistă indiferent de context."],
        ["Reactiv: comportament disruptiv la plictiseală.", "Neurodezvoltare: incapacitate constantă de autoreglare."],
        ["Temporal: legat de faze de dezvoltare sau stres.", "Cronic: simptomele persistă peste 6 luni."],
      ],
    },
  },
  {
    id: "s5",
    number: 8,
    title: "Profiluri Tipologice ale Copiilor Supradotați",
    content: [
      "Înțelegerea modului în care acești copii se raportează la sistemul educațional ne ajută să personalizăm sprijinul oferit:",
    ],
    bullets: [
      {
        items: [
          "TIP I: Câștigătorul (The Successful) — elevul adaptat, dependent de aprobare, evită riscurile.",
          "TIP II: Provocatorul (The Challenger) — creativ și nonconformist, perceput ca perturbator.",
          "TIP III: Supradotatul Ascuns (The Underground) — își neagă abilitățile pentru acceptare socială.",
          "TIP IV: Cei care abandonează (The Dropouts) — subrealizare școlară cronică, abandon.",
          "TIP V: Tipul cu două etichete (Double-Labeled) — supradotare + dificultate de învățare.",
          "TIP VI: Elevul autonom (Autonomous Learner) — prototipul succesului pe termen lung.",
        ],
      },
    ],
  },
  {
    id: "s6",
    number: 9,
    title: "Gestionarea Emoțiilor și Riscurile Specifice",
    content: [
      "Identificarea tardivă sau absența unui suport adecvat expune copilul la riscuri psihosociale majore:",
    ],
    bullets: [
      {
        items: [
          "Izolarea socială: dificultatea de a rezona cu grupul de vârstă.",
          "Subrealizarea școlară (Underachievement): performanță sub potențial.",
          "„Depresia succesului”: incapacitatea de a gestiona un eșec accidental.",
          "Riscul neidentificării: ignorarea celor din medii defavorizate sau atipici.",
        ],
      },
    ],
  },
  {
    id: "s7",
    number: 10,
    title: "Strategii Practice pentru Părinți: Disciplină și Comunicare",
    content: [
      "Rolul părintelui trebuie să evolueze de la cel de „judecător” la cel de „observator asertiv”. Disciplina în cazul copilului supradotat funcționează cel mai bine atunci când este colaborativă, nu punitivă.",
    ],
    bullets: [
      {
        title: "Sfaturi Rapide pentru Conectare și Validare",
        items: [
          "Observă activ: ce declanșează curiozitatea și ce provoacă suprasolicitarea?",
          "Ascultă dincolo de cuvinte: validarea emoțiilor este primul pas în reglare.",
          "Managementul deciziilor: implică-ți copilul; nevoia de autonomie reduce opoziționismul.",
          "Cere sprijin specializat: o evaluare psihopedagogică este claritate, nu etichetă.",
        ],
      },
    ],
  },
  {
    id: "s8",
    number: 11,
    title: "Identificarea și Evaluarea: Primii Pași spre Succes",
    content: [
      "Identificarea timpurie este esențială pentru a preveni pierderea disponibilităților aptitudinale. Un proces de evaluare riguros este multidimensional și include:",
    ],
    bullets: [
      {
        items: [
          "Interviuri clinice și observație comportamentală.",
          "Teste psihologice standardizate pentru profilul intelectual.",
          "Chestionare de nominalizare (părinți, profesori și colegi — peer nomination).",
        ],
      },
      {
        title: "Beneficiile Evaluării",
        items: [
          "Claritate: înțelegerea modului unic de procesare a informației.",
          "Sprijin adecvat: curriculum diferențiat și învățare experiențială.",
          "Prevenția etichetării eronate: evitarea diagnosticelor greșite de ADHD.",
        ],
      },
    ],
  },
  // ===== Ghidul Avansat =====
  {
    id: "s9",
    number: 12,
    title: "Fundamentele Supradotării: Definiții și Paradigme",
    content: [
      "Supradotarea este o manifestare umană multidimensională, definită prin intersecția dintre potențialul biologic și mediul favorizant. Paradigmele actuale depășesc viziunea pur academică:",
    ],
    bullets: [
      {
        items: [
          "Modelul J.S. Renzulli (1990): interacțiunea dintre interese/aptitudini peste medie, angajament în sarcină și creativitate.",
          "Perspectiva E. Landau (1991): sistem de influențe corelative; stimulii exteriori generează „curajul de a-și încerca șansele”.",
          "Abordarea Ontario (1984): experiențe de învățare diferențiate prin volum și profunzime.",
          "Raportul Maryland: capacitate intelectuală generală, academică specifică, gândire creativă, leadership, arte, aptitudini psihomotorii.",
          "Constructul Carmen Crețu: conceptul de „Succes Global” pe scara ontogenezei (motivațional + afectiv + recunoaștere socială).",
        ],
      },
    ],
  },
  {
    id: "s10",
    number: 13,
    title: "Elevul Strălucitor vs. Elevul Supradotat",
    content: [
      "Erorile de diagnostic pedagogic apar adesea din confundarea conformismului academic cu supradotarea:",
    ],
    bullets: [
      {
        title: "Elevul Strălucitor (Înzestrat)",
        items: [
          "Memorie bună și vocabular extensiv.",
          "Abilități bune de rezolvare a problemelor.",
          "Manifestă compasiune, se adaptează sistemului.",
          "Oferă răspunsurile așteptate.",
        ],
      },
      {
        title: "Elevul Supradotat",
        items: [
          "Interes intens pentru a experimenta și face diferit.",
          "Poate părea neatent (daydreamer) — procesează planuri paralele.",
          "Pune întrebări de sondare incomode.",
          "Respinge manualele depășite.",
        ],
      },
    ],
  },
  {
    id: "s11",
    number: 14,
    title: "Tipologia Supradotării (Betts & Neihart)",
    content: [
      "Cele 6 profiluri psihologice și nevoile lor specifice:",
    ],
    bullets: [
      {
        items: [
          "Tip I — Câștigătorul: bine adaptat, dependent de aprobare. Nevoie: provocări cu risc de eșec, reziliență.",
          "Tip II — Provocatorul: creativ, în conflict cu autoritatea. Nevoie: validarea ideilor nonconformiste.",
          "Tip III — Supradotatul Ascuns: își neagă abilitățile (frecvent la fete). Nevoie: siguranță și modele.",
          "Tip IV — Cei în eșec/Abandon: stimă de sine scăzută, risc de abandon. Nevoie: consiliere intensă.",
          "Tip V — Dublu-etichetat (2e): supradotare + dizabilitate. Nevoie: accent pe punctele tari.",
          "Tip VI — Elevul Autonom: independent, autoreglat. Nevoie: mentorat și libertate.",
        ],
      },
    ],
  },
  {
    id: "s12",
    number: 15,
    title: "Diagnostic Diferențial: Activ, Supradotat sau ADHD?",
    content: [
      "Diferența cheie rezidă în capacitatea de autoreglare și adaptabilitate la context:",
    ],
    table: {
      headers: ["Copil Activ / Supradotat", "Copil cu ADHD"],
      rows: [
        ["Atenție: concentrare profundă în activități de interes.", "Atenție: dificultăți chiar în activitățile preferate."],
        ["Memorie de lucru excelentă.", "Memorie de lucru slabă."],
        ["Se adaptează în medii calme/stimulante.", "Incapacitate de autoreglare indiferent de context."],
        ["Agitația dispare în medii stimulante.", "Simptome în 2+ medii (acasă, școală)."],
        ["Situativă (ex: plictiseală).", "Simptome constante de cel puțin 6 luni."],
      ],
    },
  },
  {
    id: "s13",
    number: 16,
    title: "Riscuri Specifice și Dezvoltarea Asincronă",
    content: [
      "Conceptul de heterocronie explică decalajul dintre cognitivul avansat și motorul/emoționalul rămas în urmă. Riscurile majore:",
    ],
    bullets: [
      {
        items: [
          "Inhibiția intelectuală: temporară („scăderea tensiunii”) sau definitivă („lumina care se stinge”), ca mecanism de apărare.",
          "Depresia succesului și risc de suicid: apare la cei obișnuiți doar cu victoria, fără mecanisme de coping pentru eșec.",
          "Izolarea socială: vocabular și interese discrepante duc la însingurare sau ostilitate din partea egalilor.",
          "Subrealizarea școlară: lipsa motivației într-un mediu standardizat neadecvat.",
        ],
      },
    ],
  },
  {
    id: "s14",
    number: 17,
    title: "Strategii de Intervenție și Management Educațional",
    content: [
      "Trei categorii de soluții pentru personalizarea parcursului educațional:",
    ],
    bullets: [
      {
        title: "Soluții Structurale",
        items: [
          "Accelerarea studiilor — parcurgerea rapidă a programei.",
          "Clase separate — gruparea pe abilități în școli obișnuite.",
          "Homeschooling — personalizare maximă a ritmului.",
        ],
      },
      {
        title: "Soluții Funcționale",
        items: [
          "Gruparea pe abilități — interacțiunea cu egali intelectuali.",
          "Îmbogățirea (Enrichment) — experiențe suplimentare în profunzime și volum.",
        ],
      },
      {
        title: "Diferențierea Curriculară",
        items: [
          "Nivel ridicat de abstractizare și complexitate.",
          "Focalizare pe gândire critică și rezolvare de probleme.",
          "Ritm individualizat.",
        ],
      },
    ],
  },
  {
    id: "s15",
    number: 18,
    title: "Clubul de Origami (6-10 ani)",
    content: [
      "Modelul „Clubului de Origami” este o strategie experiențială care folosește rigoarea pliului pentru a accesa „alfabetul emoțiilor”.",
    ],
    bullets: [
      {
        title: "Activități specifice",
        items: [
          "Povestea fetiței de la Hiroșima și a cocorilor — empatie și reziliență.",
          "Dansul emoțiilor — identificarea trăirilor corporale.",
          "Lupta cu furtuna / Avioane de salvare — managementul stresului și cooperare.",
          "Vrăjitoarea trebuie să moară — procesarea fricilor și conflictelor interioare.",
          "Drumul printre planete — explorarea identității și locului în lume.",
        ],
      },
      {
        title: "Obiective practice",
        items: [
          "Managementul frustrării (acceptarea încercărilor repetate).",
          "Comunicarea asertivă în grup.",
          "Dezvoltarea răbdării secvențiale.",
        ],
      },
    ],
  },
  {
    id: "s16",
    number: 19,
    title: "Ghid de Îndrumare pentru Părinți — FAQ",
    content: [
      "Părinții trebuie să fie observatori, nu evaluatori. Evaluarea psihologică nu este o etichetă, ci o sursă de claritate pentru a oferi sprijinul adecvat.",
    ],
    bullets: [
      {
        items: [
          "Copilul meu are note mici, poate fi supradotat? Da — plictiseala sau viteza minții ce depășește viteza scrierii pot duce la subrealizare.",
          "De ce este atât de sensibil la nedreptate? Idealismul precoce este o trăsătură centrală; procesează probleme globale înainte de a avea maturitatea emoțională.",
          "Ar trebui să îi spun că este supradotat? Accentul cade pe înțelegerea modului său unic de a gândi. Specialistul prezintă rezultatele ca pe o hartă a resurselor.",
        ],
      },
    ],
  },
  {
    id: "s17",
    number: 20,
    title: "Concluzii: Dincolo de Performanță",
    content: [
      "Supradotarea este o invitație la răbdare și conectare reală. Copiii cu abilități înalte nu sunt „proiecte de succes”, ci ființe complexe care au nevoie să fie văzute în întregul lor — cu tot potențialul fantastic, dar și cu vulnerabilitățile lor profunde.",
      "Rolul nostru, ca părinți și profesori, este de a fi parteneri într-un proces de maturizare care să îi facă nu doar performanți, ci, mai presus de toate, fericiți.",
    ],
  },
];
