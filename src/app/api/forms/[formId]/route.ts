// GET /api/forms/[formId] — get form with steps and fields
// PUT /api/forms/[formId] — update form metadata
// DELETE /api/forms/[formId] — delete form
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ formId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { formId } = await params;
  const supabase = await createAdminClient();

  const { data: form, error: formError } = await supabase
    .from("forms")
    .select("*")
    .eq("id", formId)
    .single();

  if (formError)
    return NextResponse.json({ error: "Form not found" }, { status: 404 });

  const { data: steps, error: stepsError } = await supabase
    .from("form_steps")
    .select("*")
    .eq("form_id", formId)
    .order("step_order", { ascending: true });

  if (stepsError)
    return NextResponse.json({ error: stepsError.message }, { status: 500 });

  const { data: fields, error: fieldsError } = await supabase
    .from("form_fields")
    .select("*")
    .eq("form_id", formId)
    .order("field_order", { ascending: true });

  if (fieldsError)
    return NextResponse.json({ error: fieldsError.message }, { status: 500 });

  // Nest fields under their step
  const stepsWithFields = steps.map((step) => ({
    ...step,
    fields: fields.filter((f) => f.step_id === step.id),
  }));

  return NextResponse.json({ ...form, steps: stepsWithFields });
}

export async function PUT(request: Request, { params }: Params) {
  const { formId } = await params;
  const supabase = await createAdminClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("forms")
    .update({
      title: body.title,
      description: body.description,
    })
    .eq("id", formId)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { formId } = await params;
  const supabase = await createAdminClient();

  const { error } = await supabase.from("forms").delete().eq("id", formId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
