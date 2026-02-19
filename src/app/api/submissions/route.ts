// POST /api/submissions — save form submission + fire webhook (PUBLIC)
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { fireWebhook } from "@/lib/webhook";

export async function POST(request: Request) {
  const supabase = createServiceRoleClient();
  const body = await request.json();
  const { formId, data } = body;

  if (!formId || !data) {
    return NextResponse.json(
      { error: "formId and data are required" },
      { status: 400 },
    );
  }

  // Get form title for the webhook payload
  const { data: form } = await supabase
    .from("forms")
    .select("title, is_published")
    .eq("id", formId)
    .single();

  if (!form?.is_published) {
    return NextResponse.json(
      { error: "Form not found or not published" },
      { status: 404 },
    );
  }

  // Extract request metadata
  const ip = request.headers.get("x-forwarded-for") ?? null;
  const userAgent = request.headers.get("user-agent") ?? null;

  // Fire webhook (fire-and-forget)
  const webhookPayload = {
    formId,
    formTitle: form.title,
    submittedAt: new Date().toISOString(),
    data,
  };
  const webhookOk = await fireWebhook(webhookPayload);

  // Save submission
  const { data: submission, error } = await supabase
    .from("form_submissions")
    .insert({
      form_id: formId,
      data,
      ip_address: ip,
      user_agent: userAgent,
      webhook_sent: webhookOk,
      webhook_error: webhookOk ? null : "Webhook request failed",
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: submission.id }, { status: 201 });
}
