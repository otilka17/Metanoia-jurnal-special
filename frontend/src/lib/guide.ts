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
    id: "s4",
    number: 4,
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
    number: 5,
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
    number: 6,
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
    number: 7,
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
    number: 8,
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
];
