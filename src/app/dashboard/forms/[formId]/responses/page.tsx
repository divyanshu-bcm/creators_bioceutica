import { createServiceRoleClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import type { FormField, FormSubmission } from "@/lib/types";

type Props = { params: Promise<{ formId: string }> };

export default async function ResponsesPage({ params }: Props) {
  const { formId } = await params;
  const supabase = createServiceRoleClient();

  const [{ data: form }, { data: fields }, { data: submissions }] =
    await Promise.all([
      supabase.from("forms").select("*").eq("id", formId).single(),
      supabase
        .from("form_fields")
        .select("*")
        .eq("form_id", formId)
        .neq("field_type", "image")
        .order("field_order", { ascending: true }),
      supabase
        .from("form_submissions")
        .select("*")
        .eq("form_id", formId)
        .order("submitted_at", { ascending: false }),
    ]);

  if (!form) notFound();

  const responseFields: FormField[] = (fields ?? []).slice(0, 3);
  const rows: FormSubmission[] = submissions ?? [];

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

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/dashboard/forms/${formId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {form.title}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {rows.length} response{rows.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant={form.is_published ? "success" : "secondary"}>
            {form.is_published ? "Published" : "Draft"}
          </Badge>
          {form.is_published && form.slug && (
            <Button asChild variant="outline" size="sm">
              <a href={`/f/${form.slug}`} target="_blank" rel="noreferrer">
                Open Form ↗
              </a>
            </Button>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-20 text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
          <p className="text-lg font-medium">No responses yet</p>
          <p className="text-sm mt-1">
            Share the form link to start collecting responses
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Submitted At</TableHead>
                {responseFields.map((f) => (
                  <TableHead key={f.id}>
                    {f.label || `Field (${f.field_type})`}
                  </TableHead>
                ))}
                <TableHead className="w-44">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {new Date(row.submitted_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  {responseFields.map((f) => (
                    <TableCell key={f.id} className="max-w-xs truncate">
                      {formatValue((row.data as Record<string, unknown>)[f.id])}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button asChild variant="outline" size="sm">
                      <Link
                        href={`/dashboard/forms/${formId}/responses/${row.id}`}
                      >
                        View full Response
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
