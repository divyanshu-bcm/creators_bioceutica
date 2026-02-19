// GET /api/forms/[formId]/fields — list fields
// POST /api/forms/[formId]/fields — add field
// PUT /api/forms/[formId]/fields — update field
// DELETE /api/forms/[formId]/fields?fieldId=xxx  — delete field
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ formId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { formId } = await params;
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("form_fields")
    .select("*")
    .eq("form_id", formId)
    .order("field_order", { ascending: true });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request, { params }: Params) {
  const { formId } = await params;
  const supabase = createServiceRoleClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("form_fields")
    .insert({
      form_id: formId,
      step_id: body.step_id,
      field_type: body.field_type,
      label: body.label ?? "",
      placeholder: body.placeholder ?? "",
      helper_text: body.helper_text ?? "",
      is_required: body.is_required ?? false,
      field_order: body.field_order ?? 0,
      options: body.options ?? null,
      image_url: body.image_url ?? null,
      image_alt: body.image_alt ?? null,
      validation: body.validation ?? null,
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
  const body = await request.json();
  const { id, ...updates } = body;

  // Fetch the current field to decide draft vs in-place
  const { data: current, error: fetchErr } = await supabase
    .from("form_fields")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchErr || !current)
    return NextResponse.json({ error: "Field not found" }, { status: 404 });

  // Meta-only updates (order, pending_delete restore) always update in place
  const metaKeys = ["field_order", "pending_delete"];
  const isMetaOnly = Object.keys(updates).every((k) => metaKeys.includes(k));

  if (current.is_draft || isMetaOnly) {
    // Already a draft or meta-only — update in place
    const { data, error } = await supabase
      .from("form_fields")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ field: data });
  } else {
    // Published field being edited for the first time — create a draft shadow row
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {
      id: _id,
      created_at: _ca,
      is_draft: _isd,
      draft_parent_id: _dp,
      pending_delete: _pd,
      ...fieldData
    } = current;
    const { data: draftField, error: draftErr } = await supabase
      .from("form_fields")
      .insert({ ...fieldData, ...updates, is_draft: true, draft_parent_id: id })
      .select()
      .single();
    if (draftErr || !draftField)
      return NextResponse.json({ error: draftErr?.message }, { status: 500 });
    return NextResponse.json({ field: draftField, replacedId: id });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { formId } = await params;
  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(request.url);
  const fieldId = searchParams.get("fieldId");
  if (!fieldId)
    return NextResponse.json({ error: "fieldId required" }, { status: 400 });

  const { data: current, error: fetchErr } = await supabase
    .from("form_fields")
    .select("*")
    .eq("id", fieldId)
    .single();
  if (fetchErr || !current)
    return NextResponse.json({ error: "Field not found" }, { status: 404 });

  if (current.is_draft && !current.draft_parent_id) {
    // Pure new draft — hard delete, no published row to worry about
    await supabase.from("form_fields").delete().eq("id", fieldId);
    return NextResponse.json({ deleted: true });
  } else if (current.is_draft && current.draft_parent_id) {
    // Edit-draft — delete draft, mark published parent as pending_delete
    await supabase.from("form_fields").delete().eq("id", fieldId);
    const { data: parent } = await supabase
      .from("form_fields")
      .update({ pending_delete: true })
      .eq("id", current.draft_parent_id)
      .select()
      .single();
    return NextResponse.json({ field: parent, replacedId: fieldId });
  } else {
    // Published field — mark pending_delete
    const { data } = await supabase
      .from("form_fields")
      .update({ pending_delete: true })
      .eq("id", fieldId)
      .select()
      .single();
    return NextResponse.json({ field: data });
  }
}
