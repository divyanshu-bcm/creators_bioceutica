"use client";

import { Fragment, useMemo, useState } from "react";
import {
  BookOpen,
  ClipboardList,
  Languages,
  ListChecks,
  Megaphone,
  Target,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Language = "en" | "it";

type ExpandableItem = {
  title: string;
  description?: string;
  bulletPoints?: string[];
};

type ResponseSection = {
  title: string;
  points: string[];
};

type Localized = {
  pageTitle: string;
  pageSubtitle: string;
  toggleLabel: string;
  formsTitle: string;
  formsSteps: string[];
  elementsTitle: string;
  elementsIntro: string;
  elements: ExpandableItem[];
  optionsTitle: string;
  optionsSteps: string[];
  predefinedTitle: string;
  predefinedIntro: string;
  predefinedItems: ExpandableItem[];
  prospectsTitle: string;
  prospectsRows: string[];
  campaignsTitle: string;
  campaignStagesTitle: string;
  campaignStages: string[];
  campaignHowTo: string[];
  responsesTitle: string;
  responsesIntro: string;
  responsesSections: ResponseSection[];
  relationTitle: string;
  relationRows: string[];
  statusTitle: string;
  statusText: string;
};

const content: Record<Language, Localized> = {
  en: {
    pageTitle: "Platform Docs",
    pageSubtitle:
      "Simple, detailed guide for non-technical users: Forms, Prospects, and Campaigns.",
    toggleLabel: "Switch to Italian",
    formsTitle: "Forms: full creation flow",
    formsSteps: [
      "Open Forms and click New Form.",
      "A new form opens immediately with Step 1 already created.",
      "Set form title and description so people understand what they are filling.",
      "Build your structure with steps: add, rename, move order, duplicate, or remove steps.",
      "Add fields from the left panel and configure each field clearly.",
      "Use Preview to test exactly what people will see.",
      "Publish when ready. The form becomes live and shareable.",
    ],
    elementsTitle: "All form elements you can use",
    elementsIntro:
      "Each field below is expandable so users can read what it captures and how to use it correctly in real workflows.",
    elements: [
      {
        title: "Text",
        description:
          "Single-line input for short values like first name, city, role, or coupon code. Best for concise answers that should stay on one line. You can set a clear label and placeholder to reduce mistakes.",
      },
      {
        title: "Textarea",
        description:
          "Multi-line input for longer answers such as notes, special requests, delivery instructions, or content briefs. Use this when users need space to explain details instead of typing a short value.",
      },
      {
        title: "Email",
        description:
          "Input dedicated to email addresses. Use it for primary contact email and communication updates. This field type helps users understand the expected format and improves data consistency.",
      },
      {
        title: "Phone",
        description:
          "Input for contact number, including mobile or business phone. Add label guidance if your team expects country code format. Useful when campaign follow-up happens through calls or messaging apps.",
      },
      {
        title: "Number",
        description:
          "Numeric input for values like quantities, budget, age, units, or counts. Use Number when text is not appropriate and you want a clean numeric answer that is easy to read and compare.",
      },
      {
        title: "Dropdown",
        description:
          "Single-select list from predefined options (for example city, product type, region, package, or team). Excellent for standardized answers and clean reporting. Users select one value only.",
      },
      {
        title: "Checkbox",
        description:
          "Multi-select choices where users can pick multiple options. Best for interests, preferred channels, required services, available days, or any scenario where more than one answer is valid.",
      },
      {
        title: "Radio",
        description:
          "Single-choice selector from visible options. Good when you want users to quickly pick exactly one answer while seeing all choices at once (for example Beginner / Intermediate / Advanced).",
      },
      {
        title: "Date/Time",
        description:
          "Field for selecting a date, time, or both depending on setup. Use it for appointments, deadlines, delivery slots, campaign starts, or event scheduling with clear calendar context.",
      },
      {
        title: "Image",
        description:
          "Visual element to display an image inside the form, such as reference mockups, logo examples, product style guide visuals, or onboarding instructions. It supports clearer communication.",
      },
      {
        title: "Paragraph",
        description:
          "Static explanatory text block inside the form. Use it for section guidance, instructions, policy notes, expected response quality, or examples of how users should fill fields.",
      },
      {
        title: "Group",
        description:
          "Container for related fields that should stay together, such as address details, billing details, profile information, or campaign settings. Helps maintain clear structure in complex forms.",
      },
      {
        title: "Boolean (Yes/No)",
        description:
          "Binary choice for true/false decisions such as consent, eligibility, confirmation, or opt-in status. Keep label phrasing explicit so users know exactly what Yes or No means.",
      },
      {
        title: "Predefined Name",
        description:
          "Ready-made name block that can include first name, middle name, and last name style sub-fields (based on your setup). Speeds up form creation and keeps name data organized.",
      },
      {
        title: "Predefined Address",
        description:
          "Ready-made address block that can include key address components and editable labels. Useful for delivery, billing, regional targeting, and any workflow where address consistency matters.",
      },
    ],
    optionsTitle: "Dropdown options (important for city lists)",
    optionsSteps: [
      "When a dropdown is used in editable predefined sub-fields, options support bulk paste.",
      "Paste one option per line.",
      "Example: one city on each line (Milano, Roma, Napoli, etc.).",
      "Each line becomes one selectable option.",
    ],
    predefinedTitle: "Pre-created elements",
    predefinedIntro:
      "These are expandable, ready-to-use structured blocks that save setup time and improve consistency.",
    predefinedItems: [
      {
        title: "Name (predefined) & its sub-fields",
        description:
          "This block gives you a clean, reusable identity section with sensible defaults.",
        bulletPoints: [
          "Default sub-field: First Name (Text)",
          "Default sub-field: Middle Name (Text, optional)",
          "Default sub-field: Last Name (Text)",
          "All labels and placeholders are editable",
          "You can add unlimited extra sub-fields (e.g., Preferred Name, Title, Nickname)",
        ],
      },
      {
        title: "Address (predefined) & its sub-fields",
        description:
          "This block is optimized for delivery, territory, and location capture in one grouped section.",
        bulletPoints: [
          "Default sub-field: Street Address (Textarea)",
          "Default sub-field: City (Dropdown)",
          "Default sub-field: State/Province (Text)",
          "Default sub-field: Postal/ZIP Code (Number)",
          "Default sub-field: Country (Text)",
          "You can add unlimited extra sub-fields (e.g., Building Name, Floor, Delivery Notes)",
          "You can hide any default sub-field not needed by your workflow",
        ],
      },
      {
        title: "How to maximize pre-created elements",
        description:
          "Treat each predefined element as a smart container: start with defaults, then tailor it to your process.",
        bulletPoints: [
          "Open element settings and keep only the sub-fields your team uses",
          "Edit labels and placeholders to make instructions explicit",
          "Use Add Field inside the same predefined block to insert any extra field type",
          "There is no practical limit on adding additional sub-fields to the block",
          "Keep related information in one group for easier review in Responses",
        ],
      },
    ],
    prospectsTitle: "Prospects: how they are created and managed",
    prospectsRows: [
      "You can create prospects manually with Add Record in the Prospects view.",
      "Every prospect type has its own fields, and all fields are optional in the add dialog.",
      "Prospects can also come from form responses in your operational flow (form data becomes prospect work data).",
      "After creation, you can search, edit, filter, and track status from prospect pages.",
    ],
    campaignsTitle: "Campaigns: what they mean here",
    campaignStagesTitle: "Campaign stage flow",
    campaignStages: [
      "1) Contacted",
      "2) Form Filled",
      "3) Order Received",
      "4) Delivered (automatic when order is delivered)",
      "5) Published",
    ],
    campaignHowTo: [
      "Campaign starts when the form is filled.",
      "Then the team marks order received.",
      "As soon as the order is delivered, campaign status moves to Delivered automatically (the team does not mark Delivered manually).",
      "Then the team marks content published.",
      "Each prospect card can show this timeline so everyone sees the exact stage.",
    ],
    responsesTitle: "Responses page: complete guide",
    responsesIntro:
      "The Responses page is the operational inbox for submitted form data. It helps teams review, verify, and act on every submission with clear context.",
    responsesSections: [
      {
        title: "1) What the Responses page is for",
        points: [
          "It is the central place where all submitted form entries are listed after users complete a form.",
          "It allows non-technical teams to inspect submission details without opening form builder screens.",
          "It supports day-to-day execution: checking incoming data, confirming quality, and deciding the next action.",
          "It helps teams avoid missed submissions by giving one consistent review surface.",
        ],
      },
      {
        title: "2) What users typically see per response",
        points: [
          "A response record contains the values submitted for the form fields visible to the end user.",
          "The record is tied to the originating form, so teams can understand the context immediately.",
          "Structured fields (like dropdown, checkbox, predefined blocks) appear as organized values for easier reading.",
          "Long-form fields (like textarea) provide richer context for follow-up and decision making.",
        ],
      },
      {
        title: "3) Recommended daily workflow",
        points: [
          "Start by opening newest responses and scanning for urgent or high-priority submissions.",
          "Review core identity and contact values first (for example name, email, phone) to ensure follow-up is possible.",
          "Validate key business fields (service type, location, budget, requested timeline, product interest).",
          "Check optional notes to capture nuance that may affect campaign or delivery handling.",
          "Move complete, high-quality responses into your next operational step quickly to reduce response time.",
        ],
      },
      {
        title: "4) Data quality checks on responses",
        points: [
          "Look for missing essentials: if critical contact fields are empty, response may need clarification before action.",
          "Watch for contradictory answers (for example a selected service that conflicts with written notes).",
          "Confirm dropdown-based values are logically consistent with free-text details.",
          "Use consistent team review criteria so multiple reviewers evaluate responses the same way.",
          "When fields are unclear, update future form wording to reduce ambiguity in later responses.",
        ],
      },
      {
        title: "5) How Responses connect to operational work",
        points: [
          "Responses are not just records; they are actionable inputs for prospect and campaign execution.",
          "A complete response can be used to inform prospect details and planning decisions.",
          "Campaign stage progression is easier when initial response data is complete and clean.",
          "High-quality responses reduce manual back-and-forth and speed up team delivery.",
        ],
      },
      {
        title: "6) Best practices for non-technical teams",
        points: [
          "Use consistent naming in forms so response columns and values remain easy to interpret.",
          "Keep required questions focused on action-driving information, not optional noise.",
          "Use dropdown/radio/boolean where possible to standardize responses and reduce interpretation errors.",
          "Use textarea for important context, but keep prompts clear so answers stay practical.",
          "Review response trends regularly and improve forms when repeated confusion appears.",
        ],
      },
      {
        title: "7) Response troubleshooting checklist",
        points: [
          "If responses feel incomplete, review whether the form asks the right minimum questions.",
          "If responses are inconsistent, replace open text fields with constrained options where appropriate.",
          "If reviewers disagree, define a shared checklist for what qualifies as ready for next-step handling.",
          "If too many clarifications are needed, simplify language and add inline guidance in the form.",
          "If turnaround is slow, assign ownership windows for reviewing and acting on new responses.",
        ],
      },
    ],
    relationTitle: "How Forms, Prospects, and Campaigns connect",
    relationRows: [
      "Forms collect information.",
      "That information feeds prospect work.",
      "Prospects move through campaign stages.",
      "So: better form design = cleaner prospects = easier campaign execution.",
    ],
    statusTitle: "Creators & Content",
    statusText:
      "Creators and Content can be maintained in the platform, but detailed end-user documentation for those modules is still being built due to limited finalized information.",
  },
  it: {
    pageTitle: "Documentazione Piattaforma",
    pageSubtitle:
      "Guida semplice e dettagliata per utenti non tecnici: Form, Prospect e Campagne.",
    toggleLabel: "Passa a Inglese",
    formsTitle: "Form: flusso completo di creazione",
    formsSteps: [
      "Apri Forms e clicca New Form.",
      "Si apre subito un nuovo form con Step 1 già creato.",
      "Imposta titolo e descrizione del form in modo chiaro.",
      "Costruisci la struttura con gli step: aggiungi, rinomina, riordina, duplica o elimina.",
      "Aggiungi i campi dal pannello sinistro e configura ogni campo.",
      "Usa Preview per testare esattamente ciò che vedrà l'utente finale.",
      "Pubblica quando è pronto. Il form diventa live e condivisibile.",
    ],
    elementsTitle: "Tutti gli elementi che puoi usare nel form",
    elementsIntro:
      "Ogni campo qui sotto è espandibile: puoi leggere cosa raccoglie e come usarlo correttamente nei flussi reali.",
    elements: [
      {
        title: "Text",
        description:
          "Campo a riga singola per valori brevi come nome, città, ruolo o codice. Ideale quando la risposta deve restare corta e chiara.",
      },
      {
        title: "Textarea",
        description:
          "Campo multi-riga per risposte lunghe come note, richieste speciali, istruzioni o briefing. Utile quando serve contesto dettagliato.",
      },
      {
        title: "Email",
        description:
          "Campo dedicato agli indirizzi email. Utile per contatti principali e comunicazioni successive.",
      },
      {
        title: "Phone",
        description:
          "Campo per numero di telefono (mobile o aziendale). Consigliato quando il follow-up operativo avviene via chiamata o messaggi.",
      },
      {
        title: "Number",
        description:
          "Campo numerico per quantità, budget, conteggi o valori misurabili. Migliora la pulizia dei dati rispetto al testo libero.",
      },
      {
        title: "Dropdown",
        description:
          "Lista a scelta singola con opzioni predefinite. Ottima per standardizzare risposte come città, servizio, regione o pacchetto.",
      },
      {
        title: "Checkbox",
        description:
          "Selezione multipla: l'utente può scegliere più opzioni. Perfetto per preferenze, interessi o requisiti multipli.",
      },
      {
        title: "Radio",
        description:
          "Scelta singola tra opzioni visibili. Ideale quando vuoi una sola risposta e confronto immediato delle alternative.",
      },
      {
        title: "Date/Time",
        description:
          "Campo per data, ora o entrambi. Utile per appuntamenti, scadenze, pianificazioni e finestre di consegna.",
      },
      {
        title: "Image",
        description:
          "Elemento visivo da mostrare nel form (esempi, reference, linee guida). Aiuta a chiarire aspettative e qualità attesa.",
      },
      {
        title: "Paragraph",
        description:
          "Blocco testo statico per istruzioni, note operative, spiegazioni e contesto prima di compilare i campi.",
      },
      {
        title: "Group",
        description:
          "Contenitore di campi correlati (es. blocco anagrafico o blocco indirizzo). Migliora struttura e leggibilità del form.",
      },
      {
        title: "Boolean (Sì/No)",
        description:
          "Scelta binaria per conferme, consensi o condizioni vere/false. Mantieni la domanda esplicita per evitare ambiguità.",
      },
      {
        title: "Name predefinito",
        description:
          "Blocco nome pronto all'uso con sotto-campi configurabili. Riduce tempi di setup e migliora coerenza dati.",
      },
      {
        title: "Address predefinito",
        description:
          "Blocco indirizzo pronto all'uso con struttura ordinata. Utile per consegne, segmentazione territoriale e operatività.",
      },
    ],
    optionsTitle: "Opzioni dropdown (importante per liste città)",
    optionsSteps: [
      "Quando usi dropdown nei sotto-campi predefiniti modificabili, puoi incollare opzioni in blocco.",
      "Incolla una opzione per riga.",
      "Esempio: una città per riga (Milano, Roma, Napoli, ecc.).",
      "Ogni riga diventa un'opzione selezionabile.",
    ],
    predefinedTitle: "Elementi pre-creati",
    predefinedIntro:
      "Questi blocchi sono espandibili e pronti all'uso: riducono il lavoro manuale e standardizzano i dati raccolti.",
    predefinedItems: [
      {
        title: "Name (predefinito) e i suoi sotto-campi",
        description:
          "Questo blocco fornisce una sezione anagrafica ordinata e pronta all'uso.",
        bulletPoints: [
          "Sotto-campo di default: First Name (Text)",
          "Sotto-campo di default: Middle Name (Text, opzionale)",
          "Sotto-campo di default: Last Name (Text)",
          "Etichette e placeholder sono completamente modificabili",
          "Puoi aggiungere sotto-campi extra illimitati (es. Titolo, Nome preferito, Soprannome)",
        ],
      },
      {
        title: "Address (predefinito) e i suoi sotto-campi",
        description:
          "Questo blocco è pensato per raccogliere indirizzi e dettagli di consegna in modo coerente.",
        bulletPoints: [
          "Sotto-campo di default: Street Address (Textarea)",
          "Sotto-campo di default: City (Dropdown)",
          "Sotto-campo di default: State/Province (Text)",
          "Sotto-campo di default: Postal/ZIP Code (Number)",
          "Sotto-campo di default: Country (Text)",
          "Puoi aggiungere sotto-campi extra illimitati (es. Scala, Interno, Note consegna)",
          "Puoi nascondere i sotto-campi di default non necessari",
        ],
      },
      {
        title: "Come sfruttare al massimo gli elementi pre-creati",
        description:
          "Considera ogni elemento predefinito come un contenitore intelligente: parti dalla base e personalizza in base al flusso reale.",
        bulletPoints: [
          "Apri le impostazioni e mantieni solo i sotto-campi realmente utili",
          "Rendi etichette e placeholder chiari per evitare errori di compilazione",
          "Usa Add Field nello stesso blocco per aggiungere qualsiasi altro tipo di campo",
          "Non c'è un limite pratico al numero di sotto-campi aggiuntivi",
          "Mantieni i dati correlati nello stesso gruppo per facilitare la lettura in Responses",
        ],
      },
    ],
    prospectsTitle: "Prospect: come si creano e come si gestiscono",
    prospectsRows: [
      "Puoi creare prospect manualmente con Add Record nella sezione Prospects.",
      "Ogni tipo di prospect ha i suoi campi e nella finestra di creazione i campi sono opzionali.",
      "I prospect possono anche derivare dalle risposte dei form nel flusso operativo (i dati del form diventano dati prospect).",
      "Dopo la creazione, puoi cercare, modificare, filtrare e monitorare lo stato dalle pagine prospect.",
    ],
    campaignsTitle: "Campagne: cosa significa qui",
    campaignStagesTitle: "Flusso delle fasi campagna",
    campaignStages: [
      "1) Contacted",
      "2) Form Filled",
      "3) Order Received",
      "4) Delivered (automatico quando l'ordine viene consegnato)",
      "5) Published",
    ],
    campaignHowTo: [
      "La campagna parte quando il form viene compilato.",
      "Poi il team segna order received.",
      "Appena l'ordine risulta consegnato, lo stato passa automaticamente a Delivered (il team non deve marcarlo manualmente).",
      "Poi il team segna content published.",
      "Ogni prospect può mostrare questa timeline così tutti vedono subito in che fase è.",
    ],
    responsesTitle: "Pagina Responses: guida completa",
    responsesIntro:
      "La pagina Responses è la casella operativa centrale delle risposte inviate dai form. Aiuta il team a leggere, verificare e trasformare ogni invio in azione concreta.",
    responsesSections: [
      {
        title: "1) A cosa serve la pagina Responses",
        points: [
          "Raccoglie in un unico punto tutti gli invii completati dagli utenti.",
          "Permette al team non tecnico di analizzare i dati senza entrare nel builder.",
          "Supporta il lavoro quotidiano: controllo qualità, priorità, follow-up.",
          "Riduce il rischio di invii persi grazie a un flusso di revisione unico.",
        ],
      },
      {
        title: "2) Cosa contiene una risposta",
        points: [
          "Ogni risposta include i valori dei campi compilati nel form.",
          "La risposta è collegata al form di origine, così il contesto è immediato.",
          "I campi strutturati (dropdown, checkbox, blocchi predefiniti) risultano più facili da leggere e confrontare.",
          "I campi lunghi (textarea) aggiungono contesto utile per decisioni operative.",
        ],
      },
      {
        title: "3) Flusso operativo consigliato",
        points: [
          "Apri prima le risposte più recenti per gestire velocemente le richieste urgenti.",
          "Controlla subito dati contatto principali (nome, email, telefono).",
          "Verifica i campi business chiave (servizio, area, budget, tempistiche, interesse prodotto).",
          "Leggi le note opzionali per comprendere richieste speciali o vincoli.",
          "Passa rapidamente le risposte complete allo step operativo successivo.",
        ],
      },
      {
        title: "4) Controlli qualità sulle risposte",
        points: [
          "Identifica campi essenziali mancanti che bloccano il follow-up.",
          "Cerca incoerenze tra scelte selezionate e testo libero.",
          "Confronta valori standardizzati e note per confermare coerenza.",
          "Usa criteri condivisi nel team per valutazioni uniformi.",
          "Se emergono dubbi ricorrenti, migliora testo e struttura del form.",
        ],
      },
      {
        title: "5) Collegamento con il lavoro operativo",
        points: [
          "Le responses sono input azionabili per prospect e campagne.",
          "Una risposta completa accelera pianificazione e decisioni.",
          "La progressione delle campagne è più fluida quando i dati iniziali sono puliti.",
          "Risposte di qualità riducono chiarimenti manuali e tempi morti.",
        ],
      },
      {
        title: "6) Best practice per team non tecnici",
        points: [
          "Mantieni naming campi coerente per leggere meglio le risposte.",
          "Rendi obbligatori solo i campi davvero decisivi per l'azione.",
          "Preferisci dropdown/radio/boolean quando serve standardizzare.",
          "Usa textarea per contesto importante con prompt chiari e pratici.",
          "Rivedi periodicamente trend e qualità per ottimizzare i form.",
        ],
      },
      {
        title: "7) Checklist di troubleshooting",
        points: [
          "Se le risposte sono troppo incomplete, rivedi le domande minime necessarie.",
          "Se le risposte sono incoerenti, sostituisci testo libero con opzioni guidate dove possibile.",
          "Se i revisori valutano in modo diverso, definisci checklist condivisa.",
          "Se servono troppi chiarimenti, semplifica linguaggio e istruzioni nel form.",
          "Se i tempi sono lunghi, assegna finestre chiare di presa in carico risposte.",
        ],
      },
    ],
    relationTitle: "Come si collegano Form, Prospect e Campagne",
    relationRows: [
      "I Form raccolgono le informazioni.",
      "Quelle informazioni alimentano il lavoro sui prospect.",
      "I Prospect avanzano nelle fasi campagna.",
      "Quindi: form ben progettati = prospect più puliti = campagne più semplici da gestire.",
    ],
    statusTitle: "Creators & Content",
    statusText:
      "Creators e Content possono essere gestiti nella piattaforma, ma la documentazione utente dettagliata per questi moduli è ancora in sviluppo per mancanza di informazioni definitive.",
  },
};

function ListCard({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
}) {
  return (
    <Card className="border-slate-300 bg-white/95 dark:border-slate-700 dark:bg-slate-900/95">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((row) => (
            <li
              key={row}
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200"
            >
              {row}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function ExpandableCard({
  title,
  icon,
  intro,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  intro: string;
  items: ExpandableItem[];
}) {
  return (
    <Card className="border-slate-300 bg-white/95 dark:border-slate-700 dark:bg-slate-900/95">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">{intro}</p>
        {items.map((item) => (
          <details
            key={item.title}
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/70"
          >
            <summary className="cursor-pointer font-medium text-slate-800 dark:text-slate-100">
              {item.title}
            </summary>
            {item.description ? (
              <p className="mt-2 leading-relaxed text-slate-700 dark:text-slate-200">
                {item.description}
              </p>
            ) : null}
            {item.bulletPoints && item.bulletPoints.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700 dark:text-slate-200">
                {item.bulletPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            ) : null}
          </details>
        ))}
      </CardContent>
    </Card>
  );
}

function ResponsesDetailCard({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: ResponseSection[];
}) {
  return (
    <Card className="border-slate-300 bg-white/95 dark:border-slate-700 dark:bg-slate-900/95">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
          <ClipboardList className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {intro}
        </p>
        {sections.map((section) => (
          <details
            key={section.title}
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/70"
          >
            <summary className="cursor-pointer font-semibold text-slate-800 dark:text-slate-100">
              {section.title}
            </summary>
            <ul className="mt-2 space-y-2">
              {section.points.map((point) => (
                <li
                  key={point}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {point}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </CardContent>
    </Card>
  );
}

export default function DashboardDocsPage() {
  const [language, setLanguage] = useState<Language>("en");
  const t = useMemo(() => content[language], [language]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <BookOpen className="h-3.5 w-3.5" />
            Docs
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 md:text-4xl">
            {t.pageTitle}
          </h1>
          <p className="mt-3 max-w-4xl text-base leading-relaxed text-slate-600 dark:text-slate-300 md:text-lg">
            {t.pageSubtitle}
          </p>
        </div>

        <Button
          size="icon"
          variant="outline"
          onClick={() => setLanguage((v) => (v === "en" ? "it" : "en"))}
          aria-label={t.toggleLabel}
          title={t.toggleLabel}
          className="mt-1 shrink-0"
        >
          <Languages className="h-4 w-4" />
        </Button>
      </div>

      <ListCard
        title={t.formsTitle}
        icon={<ClipboardList className="h-5 w-5" />}
        items={t.formsSteps}
      />

      <ExpandableCard
        title={t.elementsTitle}
        icon={<ListChecks className="h-5 w-5" />}
        intro={t.elementsIntro}
        items={t.elements}
      />

      <ListCard
        title={t.optionsTitle}
        icon={<Target className="h-5 w-5" />}
        items={t.optionsSteps}
      />

      <ExpandableCard
        title={t.predefinedTitle}
        icon={<BookOpen className="h-5 w-5" />}
        intro={t.predefinedIntro}
        items={t.predefinedItems}
      />

      <ListCard
        title={t.prospectsTitle}
        icon={<Users className="h-5 w-5" />}
        items={t.prospectsRows}
      />

      <Card className="border-slate-300 bg-white/95 dark:border-slate-700 dark:bg-slate-900/95">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
            <Megaphone className="h-5 w-5" />
            {t.campaignsTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t.campaignStagesTitle}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {t.campaignStages.map((stage, index) => (
                <Fragment key={stage}>
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
                    {stage}
                  </div>
                  {index < t.campaignStages.length - 1 ? (
                    <span className="text-slate-500 dark:text-slate-400">
                      →
                    </span>
                  ) : null}
                </Fragment>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {language === "en"
                ? "How this progresses"
                : "Come avanza nel lavoro"}
            </p>
            <ul className="space-y-2">
              {t.campaignHowTo.map((row) => (
                <li
                  key={row}
                  className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200"
                >
                  {row}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <ResponsesDetailCard
        title={t.responsesTitle}
        intro={t.responsesIntro}
        sections={t.responsesSections}
      />

      <ListCard
        title={t.relationTitle}
        icon={<Target className="h-5 w-5" />}
        items={t.relationRows}
      />

      <Card className="border-slate-300 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">{t.statusTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {t.statusText}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
