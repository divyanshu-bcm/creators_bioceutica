// GET /api/forms/[formId] — get form with steps and fields
// PUT /api/forms/[formId] — update form metadata
// DELETE /api/forms/[formId] — delete form
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ formId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { formId } = await params;
  const supabase = createServiceRoleClient();

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
  const supabase = createServiceRoleClient();
  const body = await request.json();

  // Build update payload — only include fields explicitly provided
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatePayload: Record<string, any> = {};
  if ("title" in body) updatePayload.title = body.title;
  if ("description" in body) updatePayload.description = body.description;
  if ("welcome_page" in body) updatePayload.welcome_page = body.welcome_page;

  const { data, error } = await supabase
    .from("forms")
    .update(updatePayload)
    .eq("id", formId)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { formId } = await params;
  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("forms").delete().eq("id", formId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
