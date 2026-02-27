import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { FormField } from "@/lib/types";

type Props = { params: Promise<{ formId: string; submissionId: string }> };

function formatValue(val: unknown): string {
  if (val === undefined || val === null || val === "") return "—";
  if (Array.isArray(val)) return val.join(", ");
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

export default async function ResponseDetailPage({ params }: Props) {
  const { formId, submissionId } = await params;
  const supabase = createServiceRoleClient();

  const [{ data: form }, { data: fields }, { data: submission }] =
    await Promise.all([
      supabase.from("forms").select("id, title").eq("id", formId).single(),
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

  const orderedFields: FormField[] = fields ?? [];
  const responseData = submission.data as Record<string, unknown>;

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

      <div className="space-y-3">
        {orderedFields.map((field) => (
          <Card key={field.id}>
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                {field.label || `Field (${field.field_type})`}
              </p>
              <p className="text-sm text-slate-900 dark:text-slate-100 wrap-break-word whitespace-pre-wrap">
                {formatValue(responseData[field.id])}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
