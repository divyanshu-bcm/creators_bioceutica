import { ProspectTableConfig } from "@/lib/prospects-config";

// ─── Enum option lists ────────────────────────────────────────────────────────

export const CREATORS_TIPOLOGIA = ["Scambio merce", "Tik tok", "ADV"];

export const CREATOR_STATUS = [
  "In attesa del prodotto",
  "Pending",
  "Pubblicato",
  "Sospesa",
  "Trattativa",
  "Ongoing",
];

export const CREATOR_FEE = ["PAGATA", "DA PAGARE"];

export const CREATORS_PRODOTTO = ["Biovolume", "Bioinfusion", "Biokit"];

export const CONTENT_PHASE = [
  "Step 1 Video prova",
  "Step 2 Content Creators",
  "Whitelisting",
];

export const CONTENT_STATUS = [
  "In attesa del prodotto",
  "Pubblicato",
  "Pending",
  "Under review",
  "Sospeso",
  "Trattativa",
];

// ─── Table Configs ────────────────────────────────────────────────────────────

export const CREATOR_TABLES: ProspectTableConfig[] = [
  {
    slug: "creators",
    tableName: "creators",
    displayLabel: "Creators",
    nameField: "NAME",
    primaryKey: "creator_id",
    apiBasePath: "/api/creators",
    detailBasePath: "/dashboard/creators",
    cardFields: ["NAME", "Tipologia", "Status", "Prodotto", "FEE"],
    searchFields: ["NAME", "CODICE SCONTO"],
    columns: [
      { key: "NAME", label: "Name", type: "text" },
      {
        key: "Tipologia",
        label: "Tipologia",
        type: "enum",
        enumOptions: CREATORS_TIPOLOGIA,
      },
      {
        key: "Status",
        label: "Status",
        type: "enum",
        enumOptions: CREATOR_STATUS,
      },
      { key: "BUDGET", label: "Budget", type: "text" },
      { key: "FEE", label: "Fee", type: "enum", enumOptions: CREATOR_FEE },
      { key: "Column 8", label: "Column 8", type: "boolean" },
      {
        key: "Prodotto",
        label: "Prodotto",
        type: "enum",
        enumOptions: CREATORS_PRODOTTO,
      },
      { key: "CODICE SCONTO", label: "Codice Sconto", type: "text" },
    ],
  },
  {
    slug: "content",
    tableName: "content",
    displayLabel: "Content",
    nameField: "NAME",
    primaryKey: "content_id",
    apiBasePath: "/api/content",
    detailBasePath: "/dashboard/content",
    cardFields: ["NAME", "Status", "phase", "Codice video", "creator_name"],
    searchFields: ["NAME", "Codice video"],
    columns: [
      { key: "NAME", label: "Name", type: "text" },
      {
        key: "phase",
        label: "Phase",
        type: "enum",
        enumOptions: CONTENT_PHASE,
      },
      {
        key: "Status",
        label: "Status",
        type: "enum",
        enumOptions: CONTENT_STATUS,
      },
      { key: "Codice video", label: "Codice Video", type: "text" },
      { key: "Notes", label: "Notes", type: "text" },
      { key: "Collab?", label: "Collab?", type: "text" },
      { key: "CTR Link", label: "CTR Link", type: "text" },
      { key: "CPA", label: "CPA", type: "text" },
      { key: "ROAS", label: "ROAS", type: "text" },
      { key: "ACQUISTI", label: "Acquisti", type: "text" },
      { key: "Discount code", label: "Discount Code", type: "text" },
      {
        key: "creator_id",
        label: "Creator ID (UUID)",
        type: "text",
      },
    ],
  },
];

/** Lookup by slug */
export function getCreatorTableConfig(
  slug: string,
): ProspectTableConfig | null {
  return CREATOR_TABLES.find((t) => t.slug === slug) ?? null;
}
