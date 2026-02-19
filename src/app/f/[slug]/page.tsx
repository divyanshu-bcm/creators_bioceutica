import { createServiceRoleClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { FormRenderer } from "@/components/renderer/FormRenderer";
import type { FormFull } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

export default async function PublicFormPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createServiceRoleClient();

  const { data: form, error } = await supabase
    .from("forms")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (error || !form) notFound();

  const { data: steps } = await supabase
    .from("form_steps")
    .select("*")
    .eq("form_id", form.id)
    .eq("is_draft", false)
    .eq("pending_delete", false)
    .order("step_order", { ascending: true });

  const { data: fields } = await supabase
    .from("form_fields")
    .select("*")
    .eq("form_id", form.id)
    .eq("is_draft", false)
    .eq("pending_delete", false)
    .order("field_order", { ascending: true });

  const stepsWithFields = (steps ?? []).map((step) => ({
    ...step,
    fields: (fields ?? []).filter((f) => f.step_id === step.id),
  }));

  const formFull: FormFull = { ...form, steps: stepsWithFields };

  return <FormRenderer form={formFull} />;
}

// Dynamic metadata
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const supabase = createServiceRoleClient();
  const { data: form } = await supabase
    .from("forms")
    .select("title, description")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  return {
    title: form?.title ?? "Form",
    description: form?.description ?? "",
  };
}
