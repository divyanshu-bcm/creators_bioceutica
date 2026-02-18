import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { FormBuilder } from "@/components/builder/FormBuilder";
import type { FormFull } from "@/lib/types";

type Props = { params: Promise<{ formId: string }> };

export default async function FormBuilderPage({ params }: Props) {
  const { formId } = await params;
  const supabase = await createAdminClient();

  const { data: form, error: formError } = await supabase
    .from("forms")
    .select("*")
    .eq("id", formId)
    .single();

  if (formError || !form) notFound();

  const { data: steps } = await supabase
    .from("form_steps")
    .select("*")
    .eq("form_id", formId)
    .order("step_order", { ascending: true });

  const { data: fields } = await supabase
    .from("form_fields")
    .select("*")
    .eq("form_id", formId)
    .order("field_order", { ascending: true });

  const stepsWithFields = (steps ?? []).map((step) => ({
    ...step,
    fields: (fields ?? []).filter((f) => f.step_id === step.id),
  }));

  const formFull: FormFull = { ...form, steps: stepsWithFields };

  return <FormBuilder form={formFull} />;
}
