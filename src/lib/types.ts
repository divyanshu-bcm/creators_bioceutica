// ──────────────────────────────────────────────
// Shared TypeScript interfaces for the whole app
// ──────────────────────────────────────────────

export type FieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "number"
  | "dropdown"
  | "checkbox"
  | "radio"
  | "datetime"
  | "image";

export interface Form {
  id: string;
  title: string;
  description: string | null;
  slug: string | null;
  is_published: boolean;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormStep {
  id: string;
  form_id: string;
  title: string;
  step_order: number;
  is_draft: boolean;
  draft_parent_id: string | null;
  pending_delete: boolean;
  created_at: string;
}

export interface FormField {
  id: string;
  form_id: string;
  step_id: string;
  field_type: FieldType;
  label: string | null;
  placeholder: string | null;
  helper_text: string | null;
  is_required: boolean;
  field_order: number;
  options: string[] | null; // dropdown / radio / checkbox choices
  image_url: string | null;
  image_alt: string | null;
  validation: Record<string, unknown> | null;
  is_draft: boolean;
  draft_parent_id: string | null;
  pending_delete: boolean;
  created_at: string;
}

export interface FormSubmission {
  id: string;
  form_id: string;
  data: Record<string, unknown>;
  submitted_at: string;
  ip_address: string | null;
  user_agent: string | null;
  webhook_sent: boolean;
  webhook_error: string | null;
}

// Full form with steps and fields hydrated
export interface FormFull extends Form {
  steps: (FormStep & { fields: FormField[] })[];
}

// sessionStorage shape for multi-step progress
export interface FormProgressState {
  currentStep: number;
  answers: Record<string, unknown>;
  lastSaved: string;
}
