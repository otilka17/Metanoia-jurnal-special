import { GuideSection } from "./guide";

// ============ ADHD ============
export const ADHD_GUIDE: GuideSection[] = [
  {
    id: "adhd-1", number: 1,
    title: "Ce este ADHD-ul, de fapt?",
    content: [
      "ADHD (Tulburarea de Deficit de Atenție și Hiperactivitate) NU este un semn de „copil obraznic” sau de „părinți lipsă de disciplină”. Este o diferență neurologică — creierul funcționează într-un ritm și cu un tipar diferit față de majoritatea copiilor.",
      "Copiii cu ADHD au dificultăți reale în trei zone: **atenția susținută**, **controlul impulsurilor** și **reglarea energiei**. Nu e o alegere — e o structură cerebrală diferită, cu neurotransmițătorii (dopamina, noradrenalina) în cantități mai mici sau folosiți diferit.",
      "Aceasta înseamnă că un copil cu ADHD poate să știe exact regula, dar să nu o respecte 5 minute mai târziu. Nu vă mint — creierul lor pur și simplu „uită” regula sub presiunea impulsului. Această înțelegere schimbă radical modul cum reacționați.",
    ],
  },
  {
    id: "adhd-2", number: 2,
    title: "Cele trei tipuri de ADHD",
    content: [
      "Nu toți copiii cu ADHD sunt hiperactivi vizibil. Există trei subtipuri clinice — și cunoașterea lor vă poate ajuta să înțelegeți copilul dvs.:",
    ],
    bullets: [
      {
        title: "1. ADHD Predominant Hiperactiv-Impulsiv",
        items: [
          "Aleargă, se cațără, nu stă locului",
          "Vorbește excesiv, întrerupe des",
          "Se agită și când e restrictionat",
          "Detectat rapid (5-8 ani), mai frecvent la băieți",
        ],
      },
      {
        title: "2. ADHD Predominant Inatentiv",
        items: [
          "Visează cu ochii deschiși, pierde firul",
          "Uită temele, pierde obiecte",
          "Pare 'cu capul în nori', dar interior — haos",
          "Detectat târziu (11-25 ani), mai frecvent la fete — adesea confundat cu depresie/anxietate",
        ],
      },
      {
        title: "3. ADHD Combinat (cel mai frecvent)",
        items: [
          "Combină simptome din ambele tipuri",
          "Manifestările variază contextual",
          "Se schimbă cu vârsta — hiperactivitatea scade, inatenția rămâne",
        ],
      },
    ],
  },
  {
    id: "adhd-3", number: 3,
    title: "ADHD la fete — invisibilul care doare",
    content: [
      "Timp de decenii, ADHD-ul la fete a fost dramatic subdiagnosticat. De ce? Pentru că modelul clasic al ADHD-ului a fost construit pe băieți hiperactivi din anii '80-'90.",
      "Fetițele cu ADHD adesea NU aleargă prin clasă. În schimb:",
    ],
    bullets: [
      {
        items: [
          "Visează cu ochii deschiși — sunt „prezente absente”",
          "Compensează cu perfecționism epuizant — iau note bune, dar cu efort uriaș",
          "Se ascund social — hipervigilente, evită conflicte, mimică perfectă",
          "Uită temele acasă (nu la școală) — sunt „copil bun/cuminte”",
          "Autocritică severă — „sunt proastă”, „nu sunt destul de bună”",
          "Oboseală emoțională cronică, plâns în camera lor",
        ],
      },
    ],
    table: undefined,
  },
  {
    id: "adhd-4", number: 4,
    title: "Cum reacționați acasă — 5 strategii",
    content: [
      "Nu trebuie să deveniți un părinte perfect. Doar unul care înțelege. Iată strategii testate care ajută zilnic:",
    ],
    bullets: [
      {
        title: "1. Structură vizibilă (NU verbală)",
        items: [
          "Copiii cu ADHD nu procesează bine liste orale. Puneți programul zilei pe frigider, cu poze/desene.",
          "Folosiți timere vizuale (aplicații sau ceas de nisip) pentru sarcini — copilul „vede” cât mai are.",
        ],
      },
      {
        title: "2. Sarcini scurte + pauze de mișcare",
        items: [
          "Regulă simplă: 15-20 minute concentrare, apoi 5 min mișcare (sărituri, tobogan, dans).",
          "Pauzele de mișcare NU sunt răsfăț — sunt oxigenare cerebrală necesară.",
        ],
      },
      {
        title: "3. Validați efortul, nu rezultatul",
        items: [
          "Evitați „Bravo, ai luat 10!”. Preferați: „Am văzut cât te-ai chinuit să stai concentrat — asta contează cel mai mult.”",
          "Copiii cu ADHD trăiesc într-o lume care le spune constant „nu ești suficient”. Voi puteți fi vocea contrară.",
        ],
      },
      {
        title: "4. Anticipați tranzițiile",
        items: [
          "Nu spuneți brusc „gata, plecăm”. Anunțați: „Peste 10 minute plecăm. Peste 5 minute. Acum, ultimul minut.”",
          "Creierul cu ADHD are nevoie de rampe, nu de treceri bruște.",
        ],
      },
      {
        title: "5. Somnul e sacru",
        items: [
          "Copiii cu ADHD au frecvent tulburări de somn — adorm greu, se trezesc obosiți.",
          "Rutina de seară previzibilă (baie, poveste, lumină joasă) e prima intervenție. Un copil nedormit are ADHD amplificat de 3x.",
        ],
      },
    ],
  },
  {
    id: "adhd-5", number: 5,
    title: "Când mergem la specialist?",
    content: [
      "Nu așteptați să „treacă de la sine”. ADHD-ul netratat afectează stima de sine, relațiile, performanța școlară și — în adolescență — riscul de anxietate, depresie și comportamente periculoase.",
      "Consultați un **psiholog clinician pediatric** sau **psihiatru pediatru** dacă:",
    ],
    bullets: [
      {
        items: [
          "Simptomele persistă peste 6 luni în MAI MULTE contexte (acasă + școală + activități)",
          "Afectează școala, prieteniile, somnul sau starea emoțională",
          "Copilul devine anxios sau are stima de sine scăzută",
          "Aveți suspiciuni și fata dvs. are visare/perfecționism epuizant (ADHD invizibil)",
        ],
      },
    ],
    table: {
      headers: ["Specialist", "Ce face"],
      rows: [
        ["Psiholog clinician pediatric", "Evaluare, teste standardizate, terapie comportamentală, sfat părinți"],
        ["Psihiatru pediatru", "Diagnostic oficial, medicație dacă e cazul"],
        ["Neurolog pediatru", "Exclude alte cauze neurologice"],
        ["Logoped/Terapeut ocupațional", "Ajutor pentru dificultăți specifice de învățare sau motorii"],
      ],
    },
  },
];

// ============ AUTISM (TSA) ============
export const ASD_GUIDE: GuideSection[] = [
  {
    id: "asd-1", number: 1,
    title: "Ce este autismul (TSA)?",
    content: [
      "TSA (Tulburarea de Spectru Autist) NU este o boală. Este o diferență în felul în care creierul procesează informațiile — mai ales cele sociale, senzoriale și de comunicare.",
      "Cuvântul „spectru” e important: fiecare copil cu TSA este UNIC. Un copil poate să vorbească fluent la 3 ani, altul deloc. Unul poate învăța matematică la 6 ani, altul are dificultăți motorii mari. Nu există „ADHD-ul tipic” — există o rețea vastă de manifestări.",
      "TSA nu se vindecă și nu trebuie „reparat”. Copilul cu TSA are nevoie de un mediu care să-l înțeleagă și de sprijin pentru zone specifice (comunicare, socializare, sensibilități senzoriale). Cu sprijin corect, mulți duc vieți împlinite și autonome.",
    ],
  },
  {
    id: "asd-2", number: 2,
    title: "Semne timpurii (0-3 ani)",
    content: [
      "Detectarea timpurie face o diferență enormă. Iată semne care merită o evaluare la un specialist în neurodezvoltare:",
    ],
    bullets: [
      {
        title: "Comunicare",
        items: [
          "Nu răspunde la nume până la 12 luni",
          "Nu arată cu degetul lucruri interesante până la 14 luni",
          "Nu face jocuri de tip „bau-bau” sau imitație",
          "Regres în limbaj — pierde cuvinte pe care le știa",
        ],
      },
      {
        title: "Socializare",
        items: [
          "Contact vizual redus sau evitat",
          "Nu împărtășește emoții cu părintele („uite ce am făcut!”)",
          "Nu se joacă simbolic (a face de mâncare cu jucării, cu păpuși)",
        ],
      },
      {
        title: "Comportament repetitiv / senzorial",
        items: [
          "Aliniază obiecte compulsiv, învârte roțile mașinilor",
          "Fluturare mâini, mișcări repetitive (stimming)",
          "Sensibilitate extremă la zgomote/texturi/gust — refuz alimentar sever",
          "Rutine strict necesare, criză la schimbare",
        ],
      },
    ],
  },
  {
    id: "asd-3", number: 3,
    title: "Autismul „înalt funcțional” — și de ce e o etichetă înșelătoare",
    content: [
      "Termenul „autism înalt funcțional” sau „Asperger” (nu mai e diagnostic oficial) descrie copii cu TSA care au inteligență medie sau superioară și vorbesc fluent.",
      "Dar „înalt funcțional” NU înseamnă „ușor”. Acești copii:",
    ],
    bullets: [
      {
        items: [
          "Se maschează social — imită reacții pe care nu le simt",
          "Se epuizează după interacțiuni sociale („autistic burnout”)",
          "Au anxietate ridicată — pentru că lumea le pare imprevizibilă",
          "Au adesea și ADHD, anxietate, tulburări senzoriale",
          "Adolescența și viața adultă pot fi extrem de dificile — depresie, izolare",
        ],
      },
    ],
    content_extra: undefined,
  } as any,
  {
    id: "asd-4", number: 4,
    title: "Sensibilitățile senzoriale — cheia zilei",
    content: [
      "Cel mai des ignorat aspect al TSA este suprasensibilitatea sau hiposensibilitatea senzorială. Pentru un copil cu TSA, lumea poate „țipa” la volumul maxim:",
    ],
    bullets: [
      {
        items: [
          "**Sunete**: aspiratorul, mixerul, mulțimea îl pot dezechilibra fizic",
          "**Lumini**: neonul din supermarket devine dureros",
          "**Texturi**: eticheta din tricou, șosetele „cu cusătură” sunt greu de suportat",
          "**Miroase**: parfumul mătușii poate declanșa criză",
          "**Gust/temperatură**: refuz alimentar sever — nu e „mofturi”",
        ],
      },
    ],
    table: {
      headers: ["Semnal", "Ce ajută"],
      rows: [
        ["Refuză supermarketul", "Căști antifonice + vizite scurte în oră de zi"],
        ["Refuză hainele", "Îndepărtați etichetele, cumpărați cu copilul, texturi moi"],
        ["Refuză mâncarea", "Nu forțați. Terapeut ocupațional specialist SOS Feeding"],
        ["Criză la zgomot", "Coloșca liniștită în cameră cu lumină slabă"],
      ],
    },
  },
  {
    id: "asd-5", number: 5,
    title: "Cum sprijiniți acasă",
    content: [
      "Cheia este mediul previzibil, comunicarea clară și acceptarea diferenței:",
    ],
    bullets: [
      {
        title: "1. Rutine vizuale",
        items: [
          "Program zilnic cu poze pe frigider — copilul vede ce urmează",
          "Anunțați schimbările din timp cu suport vizual",
          "Evitați surprizele „pozitive” care sunt de fapt anxiogene",
        ],
      },
      {
        title: "2. Comunicare simplă și literală",
        items: [
          "Fraze scurte, directe, un mesaj o dată",
          "Evitați ironia și metaforele — pot fi luate literal",
          "Acordați timp de răspuns (7-10 secunde, nu 2)",
        ],
      },
      {
        title: "3. Interese speciale — folosiți-le",
        items: [
          "Dacă copilul e obsedat de trenuri, învățați matematica cu trenurile",
          "Interesele speciale sunt puncte de forță, nu problemă",
        ],
      },
      {
        title: "4. Terapii dovedite",
        items: [
          "Terapie ABA (dacă e etică și centrată pe copil, NU aversivă)",
          "Terapie ocupațională (senzorială)",
          "Logopedie",
          "Terapie relațională (DIR/Floortime, PLAY Project)",
        ],
      },
    ],
  },
];

// ============ ANXIETATE ȘI SENSIBILITATE EMOȚIONALĂ ============
export const ANXIETY_GUIDE: GuideSection[] = [
  {
    id: "anx-1", number: 1,
    title: "Anxietate vs frică normală",
    content: [
      "Toți copiii au frici — de întuneric, de străini, de eșec. Este NORMAL. Diferența dintre o frică sănătoasă și anxietate patologică:",
    ],
    table: {
      headers: ["Frica normală", "Anxietate"],
      rows: [
        ["Apare la stimuli reali", "Apare fără cauză vizibilă"],
        ["Durează minute/ore", "Persistă zile/săptămâni"],
        ["Copilul o depășește", "Se blochează, evită situația"],
        ["Nu afectează funcționarea", "Afectează școala, somnul, relațiile"],
        ["Se atenuează cu explicații", "NU cedează la logică"],
      ],
    },
  },
  {
    id: "anx-2", number: 2,
    title: "Cum arată anxietatea la copil (nu doar prin cuvinte)",
    content: [
      "Copiii mici nu spun „am anxietate”. O arată prin corp și comportament:",
    ],
    bullets: [
      {
        items: [
          "**Dureri fizice**: burtă, cap, greață — mai ales dimineața la școală",
          "**Somn**: adorm greu, coșmaruri, se trezesc noaptea",
          "**Alimentație**: refuză să mănânce, sau mănâncă compulsiv",
          "**Comportament**: refuză școala, plâng la despărțire, se agață",
          "**Perfecționism**: nu duc temele pentru că „nu ies destul de bine”",
          "**Iritabilitate**: par „obraznici” — dar de fapt sunt copleșiți",
          "**Comportamente ritualice**: verifică ușa, spală mâinile obsesiv",
        ],
      },
    ],
  },
  {
    id: "anx-3", number: 3,
    title: "Copilul înalt sensibil emoțional (HSP)",
    content: [
      "15-20% din copii se nasc cu un sistem nervos mai receptiv. Aceasta NU este o tulburare — este un temperament (Dr. Elaine Aron).",
      "Copiii înalt sensibili (HSP - Highly Sensitive Person):",
    ],
    bullets: [
      {
        items: [
          "Procesează informația mai profund — observă detalii pe care alții nu le văd",
          "Sunt copleșiți de stimuli intenși (mulțime, zgomot, ritm rapid)",
          "Empatie extremă — plâng la un film trist, la un accident la stradă",
          "Reacții emoționale intense la mustrare (chiar și blândă)",
          "Prefer jocuri liniștite, singurătatea sau 1-2 prieteni",
        ],
      },
    ],
    content_extra: [
      "Dacă copilul dvs. e HSP, NU aveți nevoie de terapie — aveți nevoie să înțelegeți temperamentul. Cu susținere corectă, HSP-urile devin adulți creativi, empatici, profunzi.",
      "Dar dacă sensibilitatea se transformă în FRICĂ CONSTANTĂ sau ANHEDONIE (nimic nu-l mai bucură), atunci vorbim de anxietate/depresie — și e nevoie de consult psihologic.",
    ],
  } as any,
  {
    id: "anx-4", number: 4,
    title: "Cum reacționați — 6 principii",
    content: [
      "Cea mai comună greșeală: raționalizăm. „Nu e nimic de care să te temi.” Nu funcționează. Anxietatea NU cedează la logică.",
      "În schimb:",
    ],
    bullets: [
      {
        title: "1. Validați emoția, apoi acționați",
        items: [
          "„Văd că îți e frică. Frica ta e reală. Sunt aici cu tine.”",
          "Nu spuneți „nu fi prost, nu e nimic” — invalidați și amplificați.",
        ],
      },
      {
        title: "2. Numiți emoția",
        items: [
          "„Corpul tău îți spune că e prea mult acum.”",
          "Copilul învață că emoțiile pot fi observate, nu doar trăite.",
        ],
      },
      {
        title: "3. Respirație și corp",
        items: [
          "Respirație 4-4-4 (inspiră 4, ține 4, expiră 4)",
          "Îmbrățișări strânse, pături grele — presiunea profundă calmează",
        ],
      },
      {
        title: "4. NU evitați (dar cu pași mici)",
        items: [
          "Evitarea totală întărește anxietatea",
          "Expuneri graduale: „Astăzi mergem doar la parc 5 minute”",
        ],
      },
      {
        title: "5. Rutina previzibilă",
        items: [
          "Anxietatea urăște surprizele — dați copilului predictibilitate",
        ],
      },
      {
        title: "6. Voi înșivă",
        items: [
          "Anxietatea copilului rezonează cu a voastră. Un părinte anxios crește un copil anxios. Îngrijiți-vă și dvs.",
        ],
      },
    ],
  },
  {
    id: "anx-5", number: 5,
    title: "Semnale roșii — consult psihiatric URGENT",
    content: [
      "Nu ezitați. NU sunt lucruri „de așteptat”. Consultați un psihiatru pediatru sau psiholog clinician URGENT dacă copilul:",
    ],
    bullets: [
      {
        items: [
          "Menționează moartea, dispariția — chiar și „aș vrea să nu mai fiu”",
          "Se izolează total 2+ săptămâni",
          "Refuză școala peste 3 zile consecutive",
          "Nu mai mănâncă/nu mai bea normal",
          "Are atacuri de panică frecvente",
          "Rănire autoîndreptată (zgârieturi, mușcături)",
          "Rețea persistentă de gânduri fixe (OCD)",
        ],
      },
    ],
    content_extra: [
      "**IMPORTANT**: pentru gânduri autolezante sau suicidare, sunați la 112 sau mergeți direct la Urgențe pediatrice. Nu așteptați programare la psiholog.",
    ],
  } as any,
];


// ============ ALL GUIDES ============
export type GuideMeta = {
  key: string;
  title: string;
  subtitle: string;
  intro: string;
  icon: string;
  color: string;
  sections: GuideSection[];
};

export const GUIDES: GuideMeta[] = [
  // Supradotare is loaded from the existing GUIDE export
  {
    key: "adhd",
    title: "ADHD la Copii",
    subtitle: "Ghid Practic — de la înțelegere la susținere zilnică",
    intro: "ADHD-ul nu este un semn de „copil rău” sau de „părinte neglijent”. Este o diferență neurologică reală, cu neurotransmițători în cantități mai mici. Acest ghid vă oferă înțelegere clinică accesibilă, strategii practice testate și instrumente pentru a-l însoți pe copilul dumneavoastră cu compasiune și eficiență.",
    icon: "flash",
    color: "#DE8F6E",
    sections: ADHD_GUIDE,
  },
  {
    key: "asd",
    title: "Autism (TSA) la Copii",
    subtitle: "Ghid pentru părinți — spectrul, semnele, sprijinul",
    intro: "TSA (Tulburarea de Spectru Autist) nu este o boală și nu trebuie „reparată”. Copiii cu TSA au un mod diferit de a percepe lumea — mai intens, mai literal, mai profund. Acest ghid vă ajută să înțelegeți spectrul, să detectați semne timpurii și să construiți un mediu în care copilul dvs. să prospere.",
    icon: "puzzle",
    color: "#6E8FD8",
    sections: ASD_GUIDE,
  },
  {
    key: "anxietate",
    title: "Anxietate și Sensibilitate Emoțională",
    subtitle: "Ghid pentru copilul care simte totul mai intens",
    intro: "Unii copii se nasc cu un sistem nervos mai receptiv. Alții dezvoltă anxietate în urma unor experiențe stresante. Acest ghid vă ajută să diferențiați sensibilitatea firească de anxietatea patologică și vă oferă strategii concrete pentru a susține un copil care trăiește emoțiile la volum maxim.",
    icon: "heart",
    color: "#B56B6B",
    sections: ANXIETY_GUIDE,
  },
];
