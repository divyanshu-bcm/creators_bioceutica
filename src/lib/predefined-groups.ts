// ──────────────────────────────────────────────────────────────────────────────
// Predefined group field templates (Name, Address, etc.)
// Sub-fields are generated from these when a predefined group is added to a form.
// IDs are assigned at creation time (crypto.randomUUID()) — these are templates only.
// ──────────────────────────────────────────────────────────────────────────────

import type { SubField } from "./types";

export type PredefinedGroupType = "name_group" | "address_group";

export interface PredefinedTemplate {
  defaultLabel: string;
  subFields: Omit<SubField, "id">[];
}

export const PREDEFINED_TEMPLATES: Record<
  PredefinedGroupType,
  PredefinedTemplate
> = {
  name_group: {
    defaultLabel: "Full Name",
    subFields: [
      {
        label: "Prefix / Title",
        placeholder: "Mr., Mrs., Dr.…",
        is_required: false,
        input_type: "dropdown",
        options: ["Mr.", "Mrs.", "Ms.", "Dr.", "Prof."],
        enabled: false,
      },
      {
        label: "First Name",
        placeholder: "First name",
        is_required: true,
        input_type: "text",
        options: [],
        enabled: true,
      },
      {
        label: "Middle Name",
        placeholder: "Middle name",
        is_required: false,
        input_type: "text",
        options: [],
        enabled: false,
      },
      {
        label: "Last Name",
        placeholder: "Last name",
        is_required: true,
        input_type: "text",
        options: [],
        enabled: true,
      },
      {
        label: "Suffix",
        placeholder: "Jr., Sr., III…",
        is_required: false,
        input_type: "text",
        options: [],
        enabled: false,
      },
    ],
  },

  address_group: {
    defaultLabel: "Address",
    subFields: [
      {
        label: "Street Address",
        placeholder: "Street address",
        is_required: true,
        input_type: "text",
        options: [],
        enabled: true,
      },
      {
        label: "Street Address Line 2",
        placeholder: "Apt, Suite, Unit…",
        is_required: false,
        input_type: "text",
        options: [],
        enabled: true,
      },
      {
        label: "Street Address Line 3",
        placeholder: "Additional address line",
        is_required: false,
        input_type: "text",
        options: [],
        enabled: false,
      },
      {
        label: "City",
        placeholder: "City",
        is_required: true,
        input_type: "text",
        options: [],
        enabled: true,
      },
      {
        label: "State / Province",
        placeholder: "State or province",
        is_required: false,
        input_type: "text",
        options: [],
        enabled: true,
      },
      {
        label: "ZIP / Postal Code",
        placeholder: "ZIP or postal code",
        is_required: false,
        input_type: "text",
        options: [],
        enabled: true,
      },
      {
        label: "Country",
        placeholder: "Country",
        is_required: false,
        input_type: "text",
        options: [],
        enabled: true,
      },
    ],
  },
};
