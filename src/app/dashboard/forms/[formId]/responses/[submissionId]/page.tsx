import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { FormField, FormStep, SubField } from "@/lib/types";

type Props = { params: Promise<{ formId: string; submissionId: string }> };

const GROUP_TYPES = new Set(["group", "name_group", "address_group"]);

function formatValue(val: unknown): string {
  if (val === undefined || val === null || val === "") return "—";
  if (Array.isArray(val)) return val.join(", ");
  if (typeof val === "object")
    return (
      Object.values(val as Record<string, unknown>)
        .filter((v) => v !== "" && v != null)
        .join(", ") || "—"
    );
  return String(val);
}

export default async function ResponseDetailPage({ params }: Props) {
  const { formId, submissionId } = await params;
  const supabase = createServiceRoleClient();

  const [
    { data: form },
    { data: steps },
    { data: fields },
    { data: submission },
  ] = await Promise.all([
    supabase.from("forms").select("id, title").eq("id", formId).single(),
    supabase
      .from("form_steps")
      .select("*")
      .eq("form_id", formId)
      .order("step_order", { ascending: true }),
    supabase
      .from("form_fields")
      .select("*")
      .eq("form_id", formId)
      .neq("field_type", "image")
      .order("field_order", { ascending: true }),
    supabase
      .from("form_submissions")
      .select("*")
      .eq("id", submissionId)
      .eq("form_id", formId)
      .single(),
  ]);

  if (!form || !submission) notFound();

  const orderedSteps: FormStep[] = (steps ?? []).filter(
    (s) => !s.pending_delete,
  );
  const allFields: FormField[] = fields ?? [];
  const responseData = submission.data as Record<string, unknown>;

  // Group fields by step, preserving step order
  const stepGroups: { step: FormStep; fields: FormField[] }[] =
    orderedSteps.map((step) => ({
      step,
      fields: allFields.filter((f) => f.step_id === step.id),
    }));

  // Fallback: fields with no matching step (shouldn't normally happen)
  const orphanFields = allFields.filter(
    (f) => !orderedSteps.some((s) => s.id === f.step_id),
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/dashboard/forms/${formId}/responses`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Response Detail
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {form.title}
          </p>
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
            Submitted At
          </p>
          <p className="text-sm text-slate-900 dark:text-slate-100">
            {new Date(submission.submitted_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {stepGroups.map(({ step, fields: stepFields }, stepIdx) => (
          <div key={step.id}>
            {/* Step header — only shown when there are multiple steps */}
            {orderedSteps.length > 1 && (
              <div className="flex items-center gap-3 mb-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 dark:bg-slate-100 text-xs font-bold text-white dark:text-slate-900">
                  {stepIdx + 1}
                </span>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {step.title}
                </span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              </div>
            )}

            <div className="space-y-3">
              {stepFields.map((field) => {
                const isGroup = GROUP_TYPES.has(field.field_type);
                const rawVal = responseData[field.id];
                const subFields = (field.validation?.sub_fields ??
                  []) as SubField[];
                const groupVal = (
                  typeof rawVal === "object" &&
                  rawVal !== null &&
                  !Array.isArray(rawVal)
                    ? rawVal
                    : {}
                ) as Record<string, string>;

                return (
                  <Card key={field.id}>
                    <CardContent className="p-5">
                      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                        {field.label || `Field (${field.field_type})`}
                      </p>
                      {isGroup && subFields.length > 0 ? (
                        <div className="space-y-1.5">
                          {subFields
                            .filter(
                              (sf) =>
                                sf.enabled !== false && sf.label.trim() !== "",
                            )
                            .map((sf) => (
                              <div key={sf.id} className="flex gap-2 text-sm">
                                <span className="text-slate-500 dark:text-slate-400 shrink-0 min-w-24">
                                  {sf.label}:
                                </span>
                                <span className="text-slate-900 dark:text-slate-100 break-all">
                                  {groupVal[sf.id] || "—"}
                                </span>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-900 dark:text-slate-100 wrap-break-word whitespace-pre-wrap">
                          {formatValue(rawVal)}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {stepFields.length === 0 && (
                <p className="text-sm text-slate-400 italic pl-1">
                  No fields in this step.
                </p>
              )}
            </div>
          </div>
        ))}

        {/* Orphan fields (edge case) */}
        {orphanFields.map((field) => {
          const rawVal = responseData[field.id];
          return (
            <Card key={field.id}>
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                  {field.label || `Field (${field.field_type})`}
                </p>
                <p className="text-sm text-slate-900 dark:text-slate-100 wrap-break-word whitespace-pre-wrap">
                  {formatValue(rawVal)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
