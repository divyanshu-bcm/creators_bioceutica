// GET /api/forms/[formId]/steps — list steps
// POST /api/forms/[formId]/steps — add step
// PUT /api/forms/[formId]/steps — reorder / rename step (body: { id, title } or { id, step_order })
// DELETE /api/forms/[formId]/steps?stepId=xxx — delete step
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ formId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { formId } = await params;
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("form_steps")
    .select("*")
    .eq("form_id", formId)
    .order("step_order", { ascending: true });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request, { params }: Params) {
  const { formId } = await params;
  const supabase = await createAdminClient();
  const { title, step_order } = await request.json();

  const { data, error } = await supabase
    .from("form_steps")
    .insert({
      form_id: formId,
      title: title ?? "New Step",
      step_order: step_order ?? 0,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: Request, { params }: Params) {
  const { formId } = await params;
  const supabase = await createAdminClient();
  const body = await request.json(); // { id, title?, step_order? }

  const { data, error } = await supabase
    .from("form_steps")
    .update({ title: body.title, step_order: body.step_order })
    .eq("id", body.id)
    .eq("form_id", formId)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: Params) {
  const { formId } = await params;
  const supabase = await createAdminClient();
  const { searchParams } = new URL(request.url);
  const stepId = searchParams.get("stepId");
  if (!stepId)
    return NextResponse.json({ error: "stepId required" }, { status: 400 });

  // Don't allow deleting the last step
  const { count } = await supabase
    .from("form_steps")
    .select("*", { count: "exact", head: true })
    .eq("form_id", formId);

  if ((count ?? 0) <= 1) {
    return NextResponse.json(
      { error: "Cannot delete the last step" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("form_steps")
    .delete()
    .eq("id", stepId)
    .eq("form_id", formId);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
