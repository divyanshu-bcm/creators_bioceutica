"use client";

import { useState, useEffect } from "react";
import type { FormFull, FormField } from "@/lib/types";
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
import { cn } from "@/lib/utils";

interface FormRendererProps {
  form: FormFull;
  previewMode?: boolean;
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
      <div className="min-h-screen bg-slate-100">
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
                <p className="text-slate-600 whitespace-pre-wrap text-center leading-relaxed">
                  {wp.text}
                </p>
              )}

              {/* T&C checkboxes */}
              {wp.terms_enabled && wp.terms.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  {wp.terms.map((term) => (
                    <label
                      key={term.id}
                      className="flex items-start gap-3 cursor-pointer"
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
                      <span className="text-sm text-slate-700">
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
    );
  }

  // ─── Thank you screen ─────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Thank you!</h1>
          <p className="text-slate-500">
            Your response has been submitted successfully.
          </p>
        </div>
      </div>
    );
  }

  // ─── Form ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-100">
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
            <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
              <span className="font-medium">{step.title}</span>
              <span>
                {currentStep + 1} / {totalSteps}
              </span>
            </div>
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-900 rounded-full transition-all duration-500"
                style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
              />
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
              <Button variant="outline" onClick={handleBack}>
                ← Back
              </Button>
            ) : (
              <div />
            )}
            {currentStep < totalSteps - 1 ? (
              <Button onClick={handleNext} className="min-w-25">
                Next →
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="min-w-25"
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
  const inputClass = cn(error && "border-red-400 focus:ring-red-400");

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

  const label = (
    <Label htmlFor={field.id} className="text-slate-900">
      {field.label}
      {field.is_required && <span className="text-red-500 ml-1">*</span>}
    </Label>
  );

  const helperText = field.helper_text && (
    <p className="text-xs text-slate-400 mt-1">{field.helper_text}</p>
  );

  const errorText = error && (
    <p className="text-xs text-red-600 mt-1">{error}</p>
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
            <SelectTrigger id={field.id} className={inputClass}>
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
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name={field.id}
                  value={opt}
                  checked={value === opt}
                  onChange={() => onChange(opt)}
                  className="h-4 w-4"
                />
                <span className="text-sm text-slate-900">{opt}</span>
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
                className="flex items-center gap-2 cursor-pointer"
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
                <span className="text-sm text-slate-900">{opt}</span>
              </label>
            ))}
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
