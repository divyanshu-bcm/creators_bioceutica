import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Eye } from "lucide-react";
import type { Form } from "@/lib/types";

export default async function ResponsesFormsPage() {
  const supabase = createServiceRoleClient();

  const [{ data: forms, error }, { data: submissions }] = await Promise.all([
    supabase
      .from("forms")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("form_submissions").select("form_id"),
  ]);

  if (error) {
    return (
      <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
        Failed to load responses: {error.message}
      </div>
    );
  }

  const responseCountByForm = (submissions ?? []).reduce(
    (acc, row) => {
      const formId = row.form_id as string;
      acc[formId] = (acc[formId] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Responses
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Choose a form to view submitted responses
        </p>
      </div>

      {!forms?.length ? (
        <div className="text-center py-20 text-slate-400">
          <FileText className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p className="text-lg font-medium">No forms yet</p>
          <p className="text-sm mt-1">
            Create your first form to collect responses
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map((form: Form) => (
            <Card key={form.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100 leading-tight line-clamp-2 flex-1 mr-2">
                    {form.title}
                  </h2>
                  <Badge variant={form.is_published ? "success" : "secondary"}>
                    {form.is_published ? "Published" : "Draft"}
                  </Badge>
                </div>

                {form.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
                    {form.description}
                  </p>
                )}

                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  {responseCountByForm[form.id] ?? 0} response
                  {(responseCountByForm[form.id] ?? 0) !== 1 ? "s" : ""}
                </p>

                <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
                  {new Date(form.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>

                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link href={`/dashboard/forms/${form.id}/responses`}>
                    <Eye className="h-4 w-4 mr-1" />
                    View Responses
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
