import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createSessionClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { FormBuilder } from "@/components/builder/FormBuilder";
import type { FormFull, Product } from "@/lib/types";

type Props = { params: Promise<{ formId: string }> };

export default async function FormBuilderPage({ params }: Props) {
  const { formId } = await params;
  const supabase = createServiceRoleClient();

  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  const userRole = profile?.role === "admin" ? "admin" : "user";

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

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

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

  const draftStepByParentId = new Map(
    (steps ?? [])
      .filter((s) => s.is_draft && s.draft_parent_id)
      .map((s) => [s.draft_parent_id as string, s]),
  );

  const publishedStepsOverlaid = (steps ?? [])
    .filter((s) => !s.is_draft)
    .map((step) => {
      const draft = draftStepByParentId.get(step.id);
      if (!draft) return step;
      return {
        ...step,
        title: draft.title,
        step_order: draft.step_order,
        pending_delete: draft.pending_delete,
      };
    });

  const newDraftSteps = (steps ?? []).filter(
    (s) => s.is_draft && !s.draft_parent_id,
  );

  const workingSteps = [...publishedStepsOverlaid, ...newDraftSteps].sort(
    (a, b) => a.step_order - b.step_order,
  );

  const stepsWithFields = workingSteps.map((step) => ({
    ...step,
    fields: workingFields.filter((f) => f.step_id === step.id),
  }));

  const formFull: FormFull = { ...form, steps: stepsWithFields };

  return (
    <FormBuilder
      form={formFull}
      products={(products ?? []) as Product[]}
      userRole={userRole}
    />
  );
}
