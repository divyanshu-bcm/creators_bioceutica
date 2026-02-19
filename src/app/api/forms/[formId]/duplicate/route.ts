import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ formId: string }> },
) {
  const { formId } = await params;
  const supabase = await createAdminClient();

  // 1. Fetch original form
  const { data: original, error: formErr } = await supabase
    .from("forms")
    .select("*")
    .eq("id", formId)
    .single();

  if (formErr || !original)
    return NextResponse.json({ error: "Form not found" }, { status: 404 });

  // 2. Create new form (draft, no slug)
  const { data: newForm, error: newFormErr } = await supabase
    .from("forms")
    .insert({
      title: `${original.title} (Copy)`,
      description: original.description,
      is_published: false,
      slug: null,
    })
    .select()
    .single();

  if (newFormErr || !newForm)
    return NextResponse.json({ error: newFormErr?.message }, { status: 500 });

  // 3. Fetch original steps + fields
  const { data: steps } = await supabase
    .from("form_steps")
    .select("*, form_fields(*)")
    .eq("form_id", formId)
    .order("step_order");

  if (steps) {
    for (const step of steps) {
      // 4. Duplicate each step
      const { data: newStep, error: stepErr } = await supabase
        .from("form_steps")
        .insert({
          form_id: newForm.id,
          title: step.title,
          step_order: step.step_order,
        })
        .select()
        .single();

      if (stepErr || !newStep) continue;

      // 5. Duplicate fields for this step
      const fields = (step as { form_fields: unknown[] }).form_fields ?? [];
      if (fields.length > 0) {
        await supabase.from("form_fields").insert(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          fields.map((f: any) => ({
            form_id: newForm.id,
            step_id: newStep.id,
            field_type: f.field_type,
            label: f.label,
            placeholder: f.placeholder,
            helper_text: f.helper_text,
            is_required: f.is_required,
            field_order: f.field_order,
            options: f.options,
            image_url: f.image_url,
            image_alt: f.image_alt,
            validation: f.validation,
          })),
        );
      }
    }
  }

  return NextResponse.json({ id: newForm.id }, { status: 201 });
}
