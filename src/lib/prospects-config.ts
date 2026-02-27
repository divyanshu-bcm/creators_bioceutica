export type ColumnType = "text" | "boolean" | "enum";

export interface ProspectColumn {
  key: string;
  label: string;
  type: ColumnType;
  /** Options list for type === "enum" */
  enumOptions?: string[];
}

export interface ProspectTableConfig {
  /** URL segment used in /dashboard/prospects/[slug] */
  slug: string;
  /** Actual Supabase table name */
  tableName: string;
  /** Display label used in tabs and headings */
  displayLabel: string;
  /** Columns shown on the card face */
  cardFields: string[];
  /** Fields used for DB name/email search */
  searchFields: string[];
  /** The "name" field — used for avatar initials */
  nameField: string;
  /** All columns in display order */
  columns: ProspectColumn[];
  /**
   * Primary key column name. Defaults to "prospect_id".
   * For non-prospect tables (e.g. creators, content) set this explicitly.
   */
  primaryKey?: string;
  /**
   * Base API path for list/create. Defaults to /api/prospects/${slug}.
   * Example: "/api/creators"
   */
  apiBasePath?: string;
  /**
   * Base detail route path (without trailing slash or ID).
   * Defaults to /dashboard/prospects/${slug}.
   * Example: "/dashboard/creators"
   */
  detailBasePath?: string;
}

// ─── Table Definitions ────────────────────────────────────────────────────────

export const PROSPECT_TABLES: ProspectTableConfig[] = [
  {
    slug: "standardcreators",
    tableName: "prospects_standardcreators",
    displayLabel: "Standard Creators",
    nameField: "Name",
    cardFields: [
      "Name",
      "Status",
      "IS A FIT?",
      "Instagram Followers",
      "TikTok Followers",
      "Email",
    ],
    searchFields: ["Name", "Email"],
    columns: [
      { key: "IS A FIT?", label: "Is a Fit?", type: "text" },
      { key: "Name", label: "Name", type: "text" },
      { key: "Age Group", label: "Age Group", type: "text" },
      { key: "Type", label: "Type", type: "text" },
      { key: "Source", label: "Source", type: "text" },
      { key: "Instagram Profile", label: "Instagram Profile", type: "text" },
      { key: "CODICE SCONTO", label: "Discount Code", type: "text" },
      {
        key: "Instagram Followers",
        label: "Instagram Followers",
        type: "text",
      },
      { key: "TikTok Profile", label: "TikTok Profile", type: "text" },
      { key: "TikTok Followers", label: "TikTok Followers", type: "text" },
      { key: "YouTube", label: "YouTube", type: "text" },
      {
        key: "Youtube Subscribers",
        label: "YouTube Subscribers",
        type: "text",
      },
      { key: "Email", label: "Email", type: "text" },
      { key: "Content Fee", label: "Content Fee", type: "text" },
      { key: "Status", label: "Status", type: "text" },
      { key: "Contact Date", label: "Contact Date", type: "text" },
      { key: "Answered?", label: "Answered?", type: "text" },
      { key: "Followup sent?", label: "Follow-up Sent?", type: "text" },
      { key: "Lineup", label: "Lineup", type: "text" },
      { key: "Notes", label: "Notes", type: "text" },
      { key: "Shipping Address", label: "Shipping Address", type: "text" },
      { key: "City", label: "City", type: "text" },
      { key: "Province", label: "Province", type: "text" },
      { key: "State", label: "State", type: "text" },
      { key: "ZIPCODE", label: "ZIP Code", type: "text" },
      { key: "Phone Number", label: "Phone Number", type: "text" },
      { key: "Tracking Link", label: "Tracking Link", type: "text" },
      { key: "COUPON", label: "Coupon", type: "text" },
      { key: "Confirmation Email", label: "Confirmation Email", type: "text" },
      { key: "Product Shipped", label: "Product Shipped", type: "text" },
    ],
  },
  {
    slug: "bigcreators",
    tableName: "prospects_bigcreators",
    displayLabel: "Big Creators",
    nameField: "Name",
    cardFields: [
      "Name",
      "Status",
      "IS A FIT?",
      "Instagram Followers",
      "TikTok Followers",
      "Email",
    ],
    searchFields: ["Name", "Email"],
    columns: [
      { key: "IS A FIT?", label: "Is a Fit?", type: "text" },
      { key: "Name", label: "Name", type: "text" },
      { key: "Age Group", label: "Age Group", type: "text" },
      { key: "Source", label: "Source", type: "text" },
      { key: "Instagram Profile", label: "Instagram Profile", type: "text" },
      {
        key: "Instagram Followers",
        label: "Instagram Followers",
        type: "text",
      },
      { key: "TikTok Profile", label: "TikTok Profile", type: "text" },
      { key: "TikTok Followers", label: "TikTok Followers", type: "text" },
      { key: "Email", label: "Email", type: "text" },
      { key: "Content Fee", label: "Content Fee", type: "text" },
      { key: "Status", label: "Status", type: "text" },
      { key: "Lineup", label: "Lineup", type: "text" },
      { key: "Notes", label: "Notes", type: "text" },
    ],
  },
  {
    slug: "celebrities",
    tableName: "prospects_celebrities",
    displayLabel: "Celebrities",
    nameField: "Name",
    cardFields: [
      "Name",
      "Status",
      "IS A FIT?",
      "Instagram Followers",
      "TikTok Followers",
      "Email",
    ],
    searchFields: ["Name", "Email"],
    columns: [
      { key: "IS A FIT?", label: "Is a Fit?", type: "text" },
      { key: "Name", label: "Name", type: "text" },
      { key: "Age Group", label: "Age Group", type: "text" },
      { key: "Source", label: "Source", type: "text" },
      { key: "Instagram Profile", label: "Instagram Profile", type: "text" },
      {
        key: "Instagram Followers",
        label: "Instagram Followers",
        type: "text",
      },
      { key: "TikTok Profile", label: "TikTok Profile", type: "text" },
      { key: "TikTok Followers", label: "TikTok Followers", type: "text" },
      { key: "Email", label: "Email", type: "text" },
      { key: "Content Fee", label: "Content Fee", type: "text" },
      { key: "Status", label: "Status", type: "text" },
      { key: "Lineup", label: "Lineup", type: "text" },
      { key: "Notes", label: "Notes", type: "text" },
    ],
  },
  {
    slug: "experts",
    tableName: "prospects_experts",
    displayLabel: "Experts",
    nameField: "Name",
    cardFields: [
      "Name",
      "Type",
      "Status",
      "IS A FIT?",
      "Instagram Followers",
      "Email",
    ],
    searchFields: ["Name", "Email"],
    columns: [
      { key: "Name", label: "Name", type: "text" },
      { key: "Age Group", label: "Age Group", type: "text" },
      { key: "Type", label: "Type", type: "text" },
      { key: "Source", label: "Source", type: "text" },
      { key: "Instagram Profile", label: "Instagram Profile", type: "text" },
      {
        key: "Instagram Followers",
        label: "Instagram Followers",
        type: "text",
      },
      { key: "TikTok Profile", label: "TikTok Profile", type: "text" },
      { key: "TikTok Followers", label: "TikTok Followers", type: "text" },
      { key: "Email", label: "Email", type: "text" },
      { key: "Content Fee", label: "Content Fee", type: "text" },
      { key: "Status", label: "Status", type: "text" },
      { key: "Lineup", label: "Lineup", type: "text" },
      { key: "IS A FIT?", label: "Is a Fit?", type: "text" },
      { key: "Notes", label: "Notes", type: "text" },
    ],
  },
  {
    slug: "old",
    tableName: "prospects_old",
    displayLabel: "Old",
    nameField: "NOME",
    cardFields: ["NOME", "STATUS", "INSTAGRAM", "Email", "Disponibilità"],
    searchFields: ["NOME", "Email"],
    columns: [
      { key: "NOME", label: "Name", type: "text" },
      { key: "Età", label: "Age", type: "text" },
      { key: "INSTAGRAM", label: "Instagram", type: "text" },
      { key: "Disponibilità", label: "Available?", type: "boolean" },
      { key: "STATUS", label: "Status", type: "text" },
      { key: "Email", label: "Email", type: "text" },
      { key: "Column 1", label: "Column 1", type: "text" },
      { key: "Note", label: "Notes", type: "text" },
    ],
  },
  {
    slug: "youtube",
    tableName: "prospects_youtube",
    displayLabel: "YouTube",
    nameField: "Nome",
    cardFields: ["Nome", "Fit or Not", "Iscritti", "Email"],
    searchFields: ["Nome", "Email"],
    columns: [
      { key: "Nome", label: "Name", type: "text" },
      { key: "Age Group", label: "Age Group", type: "text" },
      { key: "Profilo YT", label: "YouTube Profile", type: "text" },
      { key: "Iscritti", label: "Subscribers", type: "text" },
      { key: "Fit or Not", label: "Fit or Not", type: "text" },
      { key: "Email", label: "Email", type: "text" },
      { key: "Commento", label: "Comment", type: "text" },
    ],
  },
];

/** Lookup config by slug — returns null if not found */
export function getTableConfig(slug: string): ProspectTableConfig | null {
  return PROSPECT_TABLES.find((t) => t.slug === slug) ?? null;
}
