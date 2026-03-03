// GET /api/forms/[formId]/steps — list steps
// POST /api/forms/[formId]/steps — add step
// PUT /api/forms/[formId]/steps — reorder / rename step (body: { id, title } or { id, step_order })
// DELETE /api/forms/[formId]/steps?stepId=xxx — delete step
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { trackFormActivity } from "@/lib/form-activity";

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

  await trackFormActivity({
    formId,
    action: "step_created",
    details: {
      step_id: data.id,
      title: data.title,
      step_order: data.step_order,
    },
  }).catch(() => {});

  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: Request, { params }: Params) {
  const { formId } = await params;
  const supabase = createServiceRoleClient();
  const body = await request.json(); // { id, title?, step_order?, pending_delete? }

  const { data: current } = await supabase
    .from("form_steps")
    .select("*")
    .eq("id", body.id)
    .eq("form_id", formId)
    .single();

  if (!current)
    return NextResponse.json({ error: "Step not found" }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.step_order !== undefined) updates.step_order = body.step_order;
  if (body.pending_delete !== undefined)
    updates.pending_delete = body.pending_delete;

  let data = null;
  let error = null;

  if (current.is_draft) {
    const result = await supabase
      .from("form_steps")
      .update(updates)
      .eq("id", current.id)
      .eq("form_id", formId)
      .select()
      .single();
    data = result.data;
    error = result.error;
  } else {
    const { data: existingDraft } = await supabase
      .from("form_steps")
      .select("id")
      .eq("form_id", formId)
      .eq("draft_parent_id", current.id)
      .eq("is_draft", true)
      .maybeSingle();

    if (existingDraft) {
      const result = await supabase
        .from("form_steps")
        .update(updates)
        .eq("id", existingDraft.id)
        .eq("form_id", formId)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      const baseData = { ...current } as Record<string, unknown>;
      delete baseData.id;
      delete baseData.is_draft;
      delete baseData.draft_parent_id;
      delete baseData.created_at;

      const result = await supabase
        .from("form_steps")
        .insert({
          ...baseData,
          ...updates,
          is_draft: true,
          draft_parent_id: current.id,
        })
        .select()
        .single();
      data = result.data;
      error = result.error;
    }
  }

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  await trackFormActivity({
    formId,
    action: "step_updated",
    details: {
      step_id: data.id,
      updated_fields: Object.keys(updates),
    },
  }).catch(() => {});

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

    await trackFormActivity({
      formId,
      action: "step_deleted",
      details: {
        step_id: stepId,
        mode: "hard_delete",
      },
    }).catch(() => {});

    return NextResponse.json({ deleted: true });
  } else {
    // Published step (or edit-draft) — mark a draft shadow as pending_delete
    if (current.is_draft && current.draft_parent_id) {
      await supabase
        .from("form_steps")
        .update({ pending_delete: true })
        .eq("id", current.id);
    } else {
      const { data: existingDraft } = await supabase
        .from("form_steps")
        .select("id")
        .eq("form_id", formId)
        .eq("draft_parent_id", current.id)
        .eq("is_draft", true)
        .maybeSingle();

      if (existingDraft) {
        await supabase
          .from("form_steps")
          .update({ pending_delete: true })
          .eq("id", existingDraft.id);
      } else {
        const baseData = { ...current } as Record<string, unknown>;
        delete baseData.id;
        delete baseData.is_draft;
        delete baseData.draft_parent_id;
        delete baseData.created_at;

        await supabase.from("form_steps").insert({
          ...baseData,
          is_draft: true,
          draft_parent_id: current.id,
          pending_delete: true,
        });
      }
    }

    await trackFormActivity({
      formId,
      action: "step_marked_pending_delete",
      details: {
        step_id: stepId,
      },
    }).catch(() => {});

    return NextResponse.json({ pending_delete: true });
  }
}
