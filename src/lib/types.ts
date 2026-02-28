// ──────────────────────────────────────────────
// Shared TypeScript interfaces for the whole app
// ──────────────────────────────────────────────

// ─── Welcome Page ─────────────────────────────
export interface WelcomeTerm {
  id: string;
  label: string;
  required: boolean;
}

export interface ElementColorStyle {
  text_color?: string;
  background_color?: string;
  border_color?: string;
}

export interface StepElementStyles {
  prev_button?: ElementColorStyle;
  next_button?: ElementColorStyle;
  submit_button?: ElementColorStyle;
}

export interface FormUiStyles {
  start_button?: ElementColorStyle;
  navigation_buttons?: StepElementStyles;
  welcome_text?: ElementColorStyle;
  tnc_element?: ElementColorStyle;
  step_elements?: Record<string, StepElementStyles>;
}

export interface WelcomePage {
  enabled: boolean;
  logo_url: string | null;
  logo_alt: string | null;
  text: string;
  button_label: string;
  terms_enabled: boolean;
  terms: WelcomeTerm[];
  ui_styles?: FormUiStyles;
}

export const defaultWelcomePage = (): WelcomePage => ({
  enabled: false,
  logo_url: null,
  logo_alt: null,
  text: "",
  button_label: "Start",
  terms_enabled: false,
  terms: [],
  ui_styles: {},
});
// ──────────────────────────────────────────────

// ─── Thank You Page ───────────────────────────
export interface ThankYouPage {
  title: string;
  text: string;
}

export const defaultThankYouPage = (): ThankYouPage => ({
  title: "Welcome to Bioceutica Milano. Looking forward to work ✨",
  text: "Your response has been received and will be reviewed shortly.",
});
// ──────────────────────────────────────────────

export type SubFieldInputType = "text" | "dropdown";

export interface SubField {
  id: string;
  label: string;
  placeholder: string;
  /** Per-sub-field required flag (used by predefined group types) */
  is_required?: boolean;
  /** Input type for predefined group sub-fields */
  input_type?: SubFieldInputType;
  /** Options list if input_type === "dropdown" */
  options?: string[];
  /** Whether this sub-field is visible in the rendered form */
  enabled?: boolean;
}

export type LabelAlign = "left" | "center" | "right";

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
  | "image"
  | "paragraph"
  | "group"
  | "name_group"
  | "address_group"
  | "boolean";

export interface Form {
  id: string;
  title: string;
  description: string | null;
  slug: string | null;
  is_published: boolean;
  user_id: string | null;
  welcome_page: WelcomePage | null;
  thank_you_page: ThankYouPage | null;
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
  validation:
    | (Record<string, unknown> & {
        appearance?: ElementColorStyle;
        label_align?: LabelAlign;
        required_options?: string[];
      })
    | null;
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
