// GET /api/forms/[formId]/steps — list steps
// POST /api/forms/[formId]/steps — add step
// PUT /api/forms/[formId]/steps — reorder / rename step (body: { id, title } or { id, step_order })
// DELETE /api/forms/[formId]/steps?stepId=xxx — delete step
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ formId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { formId } = await params;
  const supabase = createServiceRoleClient();
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
  const supabase = createServiceRoleClient();
  const { title, step_order } = await request.json();

  const { data, error } = await supabase
    .from("form_steps")
    .insert({
      form_id: formId,
      title: title ?? "New Step",
      step_order: step_order ?? 0,
      is_draft: true,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: Request, { params }: Params) {
  const { formId } = await params;
  const supabase = createServiceRoleClient();
  const body = await request.json(); // { id, title?, step_order?, pending_delete? }

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.step_order !== undefined) updates.step_order = body.step_order;
  if (body.pending_delete !== undefined)
    updates.pending_delete = body.pending_delete;

  const { data, error } = await supabase
    .from("form_steps")
    .update(updates)
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
  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(request.url);
  const stepId = searchParams.get("stepId");
  if (!stepId)
    return NextResponse.json({ error: "stepId required" }, { status: 400 });

  const { data: current } = await supabase
    .from("form_steps")
    .select("*")
    .eq("id", stepId)
    .single();
  if (!current)
    return NextResponse.json({ error: "Step not found" }, { status: 404 });

  // Guard: can't delete if it's the last non-pending-delete step
  const { data: allSteps } = await supabase
    .from("form_steps")
    .select("id, pending_delete")
    .eq("form_id", formId);
  const workingCount = (allSteps ?? []).filter((s) => !s.pending_delete).length;
  if (workingCount <= 1)
    return NextResponse.json(
      { error: "Cannot delete the last step" },
      { status: 400 },
    );

  if (current.is_draft && !current.draft_parent_id) {
    // New draft step — hard delete step and all its draft fields
    await supabase.from("form_fields").delete().eq("step_id", stepId);
    await supabase.from("form_steps").delete().eq("id", stepId);
    return NextResponse.json({ deleted: true });
  } else {
    // Published step — mark pending_delete
    await supabase
      .from("form_steps")
      .update({ pending_delete: true })
      .eq("id", stepId);
    return NextResponse.json({ pending_delete: true });
  }
}
