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
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <Button asChild variant="ghost" size="icon" className="shrink-0">
            <Link href={`/dashboard/forms/${formId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 wrap-break-word">
              {form.title}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              {rows.length} response{rows.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start">
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
        <div className="space-y-3">
          <div className="md:hidden space-y-3">
            {rows.map((row) => (
              <div
                key={row.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3"
              >
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {new Date(row.submitted_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <div className="space-y-2">
                  {responseFields.map((f) => (
                    <div key={f.id}>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {f.label || `Field (${f.field_type})`}
                      </p>
                      <p className="text-sm text-slate-900 dark:text-slate-100 wrap-break-word">
                        {formatValue(
                          (row.data as Record<string, unknown>)[f.id],
                        )}
                      </p>
                    </div>
                  ))}
                </div>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`/dashboard/forms/${formId}/responses/${row.id}`}>
                    View full Response
                  </Link>
                </Button>
              </div>
            ))}
          </div>

          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
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
                        {formatValue(
                          (row.data as Record<string, unknown>)[f.id],
                        )}
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
        </div>
      )}
    </div>
  );
}
