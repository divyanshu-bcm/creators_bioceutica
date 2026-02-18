// GET /api/forms/[formId]/fields — list fields
// POST /api/forms/[formId]/fields — add field
// PUT /api/forms/[formId]/fields — update field
// DELETE /api/forms/[formId]/fields?fieldId=xxx  — delete field
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ formId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { formId } = await params;
  const supabase = await createAdminClient();
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
  const supabase = await createAdminClient();
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
  const supabase = await createAdminClient();
  const body = await request.json();

  const { id, ...updates } = body;

  const { data, error } = await supabase
    .from("form_fields")
    .update(updates)
    .eq("id", id)
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
  const fieldId = searchParams.get("fieldId");
  if (!fieldId)
    return NextResponse.json({ error: "fieldId required" }, { status: 400 });

  const { error } = await supabase
    .from("form_fields")
    .delete()
    .eq("id", fieldId)
    .eq("form_id", formId);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
