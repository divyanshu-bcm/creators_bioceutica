import { createServiceRoleClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { FormBuilder } from "@/components/builder/FormBuilder";
import type { FormFull } from "@/lib/types";

type Props = { params: Promise<{ formId: string }> };

export default async function FormBuilderPage({ params }: Props) {
  const { formId } = await params;
  const supabase = createServiceRoleClient();

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

  // Working view for the builder:
  // - All steps (pending_delete steps stay visible so user can undo)
  // - For fields: draft fields + published fields not shadowed by a draft child
  const draftFieldParentIds = new Set(
    (fields ?? [])
      .filter((f) => f.is_draft && f.draft_parent_id)
      .map((f) => f.draft_parent_id as string),
  );
  const workingFields = (fields ?? []).filter(
    (f) => f.is_draft || !draftFieldParentIds.has(f.id),
  );

  const stepsWithFields = (steps ?? []).map((step) => ({
    ...step,
    fields: workingFields.filter((f) => f.step_id === step.id),
  }));

  const formFull: FormFull = { ...form, steps: stepsWithFields };

  return <FormBuilder form={formFull} />;
}
