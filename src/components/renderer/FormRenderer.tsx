"use client";

import { useState, useEffect } from "react";
import type { CSSProperties } from "react";
import Lottie from "lottie-react";
import celebrateAnimation from "@/../public/animations/celebrate.json";
import type { FormFull, FormField, ElementColorStyle, SubField } from "@/lib/types";
import { defaultThankYouPage } from "@/lib/types";
import { useStepProgress } from "@/hooks/useStepProgress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Copyright } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormRendererProps {
  form: FormFull;
  previewMode?: boolean;
}

function toCssStyle(style?: ElementColorStyle): CSSProperties | undefined {
  if (!style) return undefined;
  const css: CSSProperties = {};
  if (style.text_color) css.color = style.text_color;
  if (style.background_color) css.backgroundColor = style.background_color;
  if (style.border_color) css.borderColor = style.border_color;
  return Object.keys(css).length ? css : undefined;
}

function getFieldStyle(field: FormField): ElementColorStyle | undefined {
  return field.validation?.appearance;
}

export function FormRenderer({ form, previewMode = false }: FormRendererProps) {
  const slug = form.slug!;
  const { load, save, clear } = useStepProgress(slug);
  const totalSteps = form.steps.length;
  const wp = form.welcome_page?.enabled ? form.welcome_page : null;

  // Welcome phase — shown before form steps when welcome page is enabled
  const [phase, setPhase] = useState<"welcome" | "form">(
    wp ? "welcome" : "form",
  );
  const [tcAnswers, setTcAnswers] = useState<Record<string, boolean>>({});
  const [tcError, setTcError] = useState(false);

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Restore from sessionStorage on mount
  useEffect(() => {
    const saved = load();
    if (saved) {
      setCurrentStep(saved.currentStep);
      setAnswers(saved.answers);
      // If session was saved mid-form, skip welcome page
      if (wp) setPhase("form");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Welcome page continue handler ────────────────────────────────────────
  function handleWelcomeContinue() {
    if (!wp) return setPhase("form");
    if (wp.terms_enabled) {
      const allRequired = wp.terms
        .filter((t) => t.required)
        .every((t) => tcAnswers[t.id]);
      if (!allRequired) {
        setTcError(true);
        return;
      }
    }
    setTcError(false);
    setPhase("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const step = form.steps[currentStep];
  const stepButtonStyles =
    wp?.ui_styles?.navigation_buttons ??
    wp?.ui_styles?.step_elements?.[step?.id ?? ""];

  function getAnswer(fieldId: string): unknown {
    return answers[fieldId] ?? "";
  }

  function setAnswer(fieldId: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => {
        const e = { ...prev };
        delete e[fieldId];
        return e;
      });
    }
  }

  function validateStep(): boolean {
    const newErrors: Record<string, string> = {};
    for (const field of step.fields) {
      if (field.field_type === "image") continue;
      if (field.field_type === "paragraph") continue;
      if (field.field_type === "group") {
        if (!field.is_required) continue;
        const subFields = (field.validation?.sub_fields ?? []) as SubField[];
        const groupVal = (answers[field.id] ?? {}) as Record<string, string>;
        const allFilled = subFields
          .filter((sf) => sf.label.trim() !== "")
          .every((sf) => (groupVal[sf.id] ?? "").trim() !== "");
        if (!allFilled) {
          newErrors[field.id] = "Please fill in all fields";
        }
        continue;
      }
      if (
        field.field_type === "name_group" ||
        field.field_type === "address_group"
      ) {
        const subFields = (field.validation?.sub_fields ?? []) as SubField[];
        const groupVal = (answers[field.id] ?? {}) as Record<string, string>;
        const hasRequiredEmpty = subFields
          .filter((sf) => sf.enabled !== false && sf.is_required === true)
          .some((sf) => (groupVal[sf.id] ?? "").trim() === "");
        if (hasRequiredEmpty) {
          newErrors[field.id] = "Please fill in all required fields";
        }
        continue;
      }
      if (field.is_required) {
        const val = answers[field.id];
        if (
          val === undefined ||
          val === null ||
          val === "" ||
          (Array.isArray(val) && val.length === 0)
        ) {
          newErrors[field.id] = "This field is required";
        }
      }
      // Checkbox: individual options marked as required
      if (field.field_type === "checkbox") {
        const reqOpts =
          (field.validation?.required_options as string[] | undefined) ?? [];
        if (reqOpts.length > 0) {
          const checked = Array.isArray(answers[field.id])
            ? (answers[field.id] as string[])
            : [];
          const missing = reqOpts.filter((r) => !checked.includes(r));
          if (missing.length > 0) {
            newErrors[field.id] = `Please also check: ${missing.join(", ")}`;
          }
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleNext() {
    if (!validateStep()) return;
    const newStep = currentStep + 1;
    const newState = { currentStep: newStep, answers, lastSaved: "" };
    save(newState);
    setCurrentStep(newStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBack() {
    const newStep = currentStep - 1;
    const newState = { currentStep: newStep, answers, lastSaved: "" };
    save(newState);
    setCurrentStep(newStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    if (!validateStep()) return;
    if (previewMode) {
      setSubmitted(true);
      return;
    }
    setSubmitting(true);
    setSubmitError("");

    const res = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formId: form.id, data: answers }),
    });

    setSubmitting(false);
    if (res.ok) {
      clear();
      setSubmitted(true);
    } else {
      const j = await res.json().catch(() => ({}));
      setSubmitError(j.error ?? "Something went wrong. Please try again.");
    }
  }

  // ─── Welcome page ─────────────────────────────────────────────────────────
  if (phase === "welcome" && wp) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <div className="flex-1">
          <div className="max-w-xl mx-auto px-4 py-12">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-8 sm:p-10 space-y-8">
                {/* Logo */}
                {wp.logo_url && (
                  <div className="flex justify-center">
                    <img
                      src={wp.logo_url}
                      alt={wp.logo_alt ?? ""}
                      className="max-h-24 max-w-full object-contain"
                    />
                  </div>
                )}

                {/* Form title */}
                <div className="text-center">
                  <h1 className="text-3xl font-bold text-slate-900">
                    {form.title}
                  </h1>
                </div>

                {/* Welcome text */}
                {wp.text && (
                  <div
                    className="text-slate-600 leading-relaxed **:max-w-full"
                    style={toCssStyle(wp.ui_styles?.welcome_text)}
                    dangerouslySetInnerHTML={{ __html: wp.text }}
                  />
                )}

                {/* T&C checkboxes */}
                {wp.terms_enabled && wp.terms.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    {wp.terms.map((term) => (
                      <label
                        key={term.id}
                        className={cn(
                          "flex items-start gap-3 cursor-pointer rounded-md px-2 py-1",
                          wp.ui_styles?.tnc_element?.border_color && "border",
                        )}
                        style={toCssStyle(wp.ui_styles?.tnc_element)}
                      >
                        <input
                          type="checkbox"
                          checked={!!tcAnswers[term.id]}
                          onChange={(e) =>
                            setTcAnswers((prev) => ({
                              ...prev,
                              [term.id]: e.target.checked,
                            }))
                          }
                          className="h-4 w-4 rounded mt-0.5 shrink-0"
                        />
                        <span
                          className="text-sm text-slate-700"
                          style={
                            wp.ui_styles?.tnc_element?.text_color
                              ? { color: wp.ui_styles.tnc_element.text_color }
                              : undefined
                          }
                        >
                          {term.label}
                          {term.required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </span>
                      </label>
                    ))}
                    {tcError && (
                      <p className="text-sm text-red-600">
                        Please accept all required terms to continue.
                      </p>
                    )}
                  </div>
                )}

                {/* Start button */}
                <Button
                  className="w-full h-14 text-base font-semibold tracking-wide"
                  onClick={handleWelcomeContinue}
                  style={toCssStyle(wp.ui_styles?.start_button)}
                >
                  <span className="flex items-center justify-center gap-2 w-full">
                    {wp.button_label?.trim() || "Start"}
                    <span aria-hidden>→</span>
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <PublicFormCopyright visible={!previewMode} />
      </div>
    );
  }

  // ─── Thank you screen ─────────────────────────────────────────────────────
  if (submitted) {
    const ty = form.thank_you_page ?? defaultThankYouPage();
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-emerald-50/40 px-4 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm w-full">
            {/* Lottie animation */}
            <div className="mx-auto mb-2" style={{ width: 160, height: 160 }}>
              <Lottie
                animationData={celebrateAnimation}
                loop={false}
                style={{ width: "100%", height: "100%" }}
              />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-3 leading-snug">
              {ty.title || "Welcome to Bioceutica Milano. Looking forward to work ✨"}
            </h1>
            {ty.text && (
              <p className="text-slate-500 text-sm leading-relaxed">{ty.text}</p>
            )}
          </div>
        </div>

        <PublicFormCopyright visible={!previewMode} />
      </div>
    );
  }

  // ─── Form ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <div className="flex-1">
        <div className="max-w-xl mx-auto px-4 py-10">
          {/* Form header */}
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold text-slate-900">{form.title}</h1>
            {form.description && (
              <p className="text-slate-500 mt-2">{form.description}</p>
            )}
          </div>

          {/* Progress bar (multi-step only) */}
          {totalSteps > 1 && (
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm text-slate-500 mb-3">
                <span className="font-medium">{step.title}</span>
                <span>
                  {currentStep + 1} / {totalSteps}
                </span>
              </div>
              <div className="relative h-5 flex items-center">
                {/* Track */}
                <div className="absolute inset-x-0 h-1.5 bg-slate-200 rounded-full">
                  <div
                    className="h-full bg-slate-900 rounded-full transition-all duration-500"
                    style={{
                      width:
                        totalSteps > 1
                          ? `${(currentStep / (totalSteps - 1)) * 100}%`
                          : "100%",
                    }}
                  />
                </div>
                {/* Step dots */}
                <div className="relative w-full flex items-center justify-between">
                  {form.steps.map((_, i) => {
                    const done = i < currentStep;
                    const active = i === currentStep;
                    return (
                      <span
                        key={i}
                        className={cn(
                          "relative flex h-4 w-4 items-center justify-center rounded-full border-2 transition-all duration-300",
                          done
                            ? "bg-slate-900 border-slate-900"
                            : active
                              ? "bg-white border-slate-900"
                              : "bg-slate-200 border-slate-300",
                        )}
                      >
                        {active && (
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-500 opacity-40" />
                        )}
                        {active && (
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-slate-900" />
                        )}
                        {done && (
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Fields card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 sm:p-8 space-y-6">
              {step.fields.map((field) => (
                <FieldRenderer
                  key={field.id}
                  field={field}
                  value={getAnswer(field.id)}
                  onChange={(v) => setAnswer(field.id, v)}
                  error={errors[field.id]}
                />
              ))}

              {step.fields.length === 0 && (
                <p className="text-slate-400 text-center py-8">
                  This step has no fields.
                </p>
              )}
            </div>

            {/* Navigation */}
            <div className="px-6 sm:px-8 pb-6 sm:pb-8 flex items-center justify-between gap-3">
              {currentStep > 0 ? (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  style={toCssStyle(stepButtonStyles?.prev_button)}
                  className={cn(
                    stepButtonStyles?.prev_button?.border_color && "border",
                  )}
                >
                  ← Back
                </Button>
              ) : wp ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setPhase("welcome");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  style={toCssStyle(stepButtonStyles?.prev_button)}
                  className={cn(
                    stepButtonStyles?.prev_button?.border_color && "border",
                  )}
                >
                  ← Back
                </Button>
              ) : (
                <div />
              )}
              {currentStep < totalSteps - 1 ? (
                <Button
                  onClick={handleNext}
                  className={cn(
                    "min-w-25",
                    stepButtonStyles?.next_button?.border_color && "border",
                  )}
                  style={toCssStyle(stepButtonStyles?.next_button)}
                >
                  Next →
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={cn(
                    "min-w-25",
                    stepButtonStyles?.submit_button?.border_color && "border",
                  )}
                  style={toCssStyle(stepButtonStyles?.submit_button)}
                >
                  {submitting
                    ? "Submitting…"
                    : previewMode
                      ? "Submit (Preview)"
                      : "Submit"}
                </Button>
              )}
            </div>
          </div>

          {/* Error */}
          {submitError && (
            <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
              {submitError}
            </div>
          )}
        </div>
      </div>

      <PublicFormCopyright visible={!previewMode} />
    </div>
  );
}

interface PublicFormCopyrightProps {
  visible: boolean;
}

function PublicFormCopyright({ visible }: PublicFormCopyrightProps) {
  if (!visible) return null;

  return (
    <div className="pb-4 text-center">
      <p className="text-xs text-slate-400 dark:text-slate-500 inline-flex items-center gap-1.5">
        <Copyright className="h-3 w-3" />
        Bioceutica Milano 2026
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual field renderer
// ─────────────────────────────────────────────────────────────────────────────

interface FieldRendererProps {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
}

function FieldRenderer({ field, value, onChange, error }: FieldRendererProps) {
  const fieldStyle = getFieldStyle(field);
  const styleCss = toCssStyle(fieldStyle);
  const inputClass = cn(
    error && "border-red-400 focus:ring-red-400",
    fieldStyle?.border_color && "border",
  );

  const errorText = error && (
    <p className="text-xs text-red-600 mt-1">{error}</p>
  );

  if (field.field_type === "image") {
    if (!field.image_url) return null;
    return (
      <div className="flex justify-center">
        <img
          src={field.image_url}
          alt={field.image_alt ?? ""}
          className="rounded-lg max-w-full"
          style={{ display: "block" }}
        />
      </div>
    );
  }

  if (field.field_type === "group") {
    const subFields = (field.validation?.sub_fields ?? []) as SubField[];
    const groupValue = (value ?? {}) as Record<string, string>;
    return (
      <div className="space-y-3">
        <div>
          <Label className="text-slate-900" style={styleCss}>
            {field.label}
            {field.is_required && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </Label>
          {field.helper_text && (
            <p className="text-xs text-slate-400 mt-0.5">{field.helper_text}</p>
          )}
        </div>
        <div className="space-y-3 pl-3 border-l-2 border-slate-200">
          {subFields.map((sf) => (
            <div key={sf.id} className="space-y-1">
              {sf.label && (
                <Label
                  className="text-sm font-normal text-slate-700"
                  style={
                    fieldStyle?.text_color
                      ? { color: fieldStyle.text_color }
                      : undefined
                  }
                >
                  {sf.label}
                </Label>
              )}
              <Input
                value={groupValue[sf.id] ?? ""}
                onChange={(e) =>
                  onChange({ ...groupValue, [sf.id]: e.target.value })
                }
                placeholder={sf.placeholder || ""}
                className={inputClass}
                style={styleCss}
              />
            </div>
          ))}
        </div>
        {errorText}
      </div>
    );
  }

  if (
    field.field_type === "name_group" ||
    field.field_type === "address_group"
  ) {
    const subFields = (field.validation?.sub_fields ?? []) as SubField[];
    const enabled = subFields.filter((sf) => sf.enabled !== false);
    const groupValue = (value ?? {}) as Record<string, string>;
    return (
      <div className="space-y-3">
        <div>
          <Label
            className="text-slate-900 block"
            style={{
              ...(fieldStyle?.text_color ? { color: fieldStyle.text_color } : {}),
              ...(field.validation?.label_align && field.validation.label_align !== "left"
                ? { textAlign: field.validation.label_align as "center" | "right" }
                : {}),
            }}
          >
            {field.label}
          </Label>
          {field.helper_text && (
            <p className="text-xs text-slate-400 mt-0.5">{field.helper_text}</p>
          )}
        </div>
        <div className="space-y-3 pl-3 border-l-2 border-slate-200">
          {enabled.map((sf) => (
            <div key={sf.id} className="space-y-1">
              {sf.label && (
                <Label
                  className="text-sm font-normal text-slate-700"
                  style={
                    fieldStyle?.text_color
                      ? { color: fieldStyle.text_color }
                      : undefined
                  }
                >
                  {sf.label}
                  {sf.is_required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </Label>
              )}
              {sf.input_type === "dropdown" ? (
                <Select
                  value={groupValue[sf.id] ?? ""}
                  onValueChange={(v) =>
                    onChange({ ...groupValue, [sf.id]: v })
                  }
                >
                  <SelectTrigger className={inputClass} style={styleCss}>
                    <SelectValue placeholder={sf.placeholder || "Select\u2026"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(sf.options ?? []).map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={groupValue[sf.id] ?? ""}
                  onChange={(e) =>
                    onChange({ ...groupValue, [sf.id]: e.target.value })
                  }
                  placeholder={sf.placeholder || ""}
                  className={inputClass}
                  style={styleCss}
                />
              )}
            </div>
          ))}
        </div>
        {errorText}
      </div>
    );
  }

  if (field.field_type === "paragraph") {
    if (!field.label) return null;
    const paragraphStyle = toCssStyle(getFieldStyle(field));
    return (
      <div
        className="text-sm leading-relaxed text-slate-700 **:max-w-full"
        style={paragraphStyle}
        dangerouslySetInnerHTML={{ __html: field.label }}
      />
    );
  }

  const label = (
    <Label
      htmlFor={field.id}
      className="text-slate-900 block"
      style={{
        ...(fieldStyle?.text_color ? { color: fieldStyle.text_color } : {}),
        ...(field.validation?.label_align && field.validation.label_align !== "left"
          ? { textAlign: field.validation.label_align as "center" | "right" }
          : {}),
      }}
    >
      {field.label}
      {field.is_required && <span className="text-red-500 ml-1">*</span>}
    </Label>
  );

  const helperText = field.helper_text && (
    <p className="text-xs text-slate-400 mt-1">{field.helper_text}</p>
  );

  switch (field.field_type) {
    case "text":
    case "email":
    case "phone":
      return (
        <div className="space-y-1">
          {label}
          <Input
            id={field.id}
            type={
              field.field_type === "email"
                ? "email"
                : field.field_type === "phone"
                  ? "tel"
                  : "text"
            }
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? ""}
            className={inputClass}
            style={styleCss}
          />
          {helperText}
          {errorText}
        </div>
      );

    case "number":
      return (
        <div className="space-y-1">
          {label}
          <Input
            id={field.id}
            type="number"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? ""}
            className={inputClass}
            style={styleCss}
          />
          {helperText}
          {errorText}
        </div>
      );

    case "textarea":
      return (
        <div className="space-y-1">
          {label}
          <Textarea
            id={field.id}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? ""}
            className={cn("resize-none", inputClass)}
            rows={4}
            style={styleCss}
          />
          {helperText}
          {errorText}
        </div>
      );

    case "datetime":
      return (
        <div className="space-y-1">
          {label}
          <Input
            id={field.id}
            type="datetime-local"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
            style={styleCss}
          />
          {helperText}
          {errorText}
        </div>
      );

    case "dropdown":
      return (
        <div className="space-y-1">
          {label}
          <Select
            value={String(value ?? "")}
            onValueChange={(v) => onChange(v)}
          >
            <SelectTrigger
              id={field.id}
              className={inputClass}
              style={styleCss}
            >
              <SelectValue placeholder="Select an option…" />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {helperText}
          {errorText}
        </div>
      );

    case "radio":
      return (
        <div className="space-y-2">
          {label}
          <div className="space-y-2 mt-1">
            {(field.options ?? []).map((opt) => (
              <label
                key={opt}
                className={cn(
                  "flex items-center gap-2 cursor-pointer",
                  styleCss && "rounded-md px-2 py-1 border",
                )}
                style={styleCss}
              >
                <input
                  type="radio"
                  name={field.id}
                  value={opt}
                  checked={value === opt}
                  onChange={() => onChange(opt)}
                  className="h-4 w-4"
                />
                <span
                  className="text-sm text-slate-900"
                  style={
                    fieldStyle?.text_color
                      ? { color: fieldStyle.text_color }
                      : undefined
                  }
                >
                  {opt}
                </span>
              </label>
            ))}
          </div>
          {helperText}
          {errorText}
        </div>
      );

    case "checkbox": {
      const checked = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-2">
          {label}
          <div className="space-y-2 mt-1">
            {(field.options ?? []).map((opt) => (
              <label
                key={opt}
                className={cn(
                  "flex items-center gap-2 cursor-pointer",
                  styleCss && "rounded-md px-2 py-1 border",
                )}
                style={styleCss}
              >
                <input
                  type="checkbox"
                  value={opt}
                  checked={checked.includes(opt)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange([...checked, opt]);
                    } else {
                      onChange(checked.filter((v) => v !== opt));
                    }
                  }}
                  className="h-4 w-4 rounded"
                />
                <span
                  className="text-sm text-slate-900"
                  style={
                    fieldStyle?.text_color
                      ? { color: fieldStyle.text_color }
                      : undefined
                  }
                >
                  {opt}
                </span>
              </label>
            ))}
          </div>
          {helperText}
          {errorText}
        </div>
      );
    }

    case "boolean": {
      const trueLabel = field.options?.[0] ?? "Yes";
      const falseLabel = field.options?.[1] ?? "No";
      return (
        <div className="space-y-4">
          {label}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onChange(trueLabel)}
              className={cn(
                "rounded-lg border-2 px-7 py-1.5 text-sm font-medium transition-all",
                value === trueLabel
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
                error && "border-red-300",
              )}
            >
              {trueLabel}
            </button>
            <button
              type="button"
              onClick={() => onChange(falseLabel)}
              className={cn(
                "rounded-lg border-2 px-7 py-1.5 text-sm font-medium transition-all",
                value === falseLabel
                  ? "border-red-400 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-950/40 dark:text-red-300"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
                error && "border-red-300",
              )}
            >
              {falseLabel}
            </button>
          </div>
          {helperText}
          {errorText}
        </div>
      );
    }

    default:
      return null;
  }
}
