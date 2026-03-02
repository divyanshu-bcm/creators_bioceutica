// POST /api/submissions — save form submission + fire webhook (PUBLIC)
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { fireWebhook } from "@/lib/webhook";

const PHONE_PREFIX = "+39";

function normalizePhoneValue(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const withoutPrefix = raw.startsWith(PHONE_PREFIX)
    ? raw.slice(PHONE_PREFIX.length)
    : raw;
  const digits = withoutPrefix.replace(/\D/g, "");
  if (!digits) return "";
  return `${PHONE_PREFIX}${digits}`;
}

function getPhoneDigitCount(value: unknown): number {
  const raw = String(value ?? "").trim();
  const withoutPrefix = raw.startsWith(PHONE_PREFIX)
    ? raw.slice(PHONE_PREFIX.length)
    : raw;
  return withoutPrefix.replace(/\D/g, "").length;
}

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
    .select("title, is_published, webhook_url")
    .eq("id", formId)
    .single();

  if (!form?.is_published) {
    return NextResponse.json(
      { error: "Form not found or not published" },
      { status: 404 },
    );
  }

  const { data: phoneFields } = await supabase
    .from("form_fields")
    .select("id, field_type")
    .eq("form_id", formId)
    .in("field_type", ["phone", "email"])
    .eq("is_draft", false)
    .eq("pending_delete", false);

  const normalizedData = { ...(data as Record<string, unknown>) };
  for (const field of phoneFields ?? []) {
    const currentValue = normalizedData[field.id];

    if (field.field_type === "email") {
      const emailValue = String(currentValue ?? "").trim();
      if (emailValue && !emailValue.includes("@")) {
        return NextResponse.json({ error: "Invalid format" }, { status: 400 });
      }
      continue;
    }

    const digitCount = getPhoneDigitCount(currentValue);

    if (digitCount > 0 && (digitCount < 9 || digitCount > 10)) {
      return NextResponse.json(
        { error: "Phone must be 9 to 10 digits" },
        { status: 400 },
      );
    }

    const normalizedValue = normalizePhoneValue(currentValue);
    if (normalizedValue) {
      normalizedData[field.id] = normalizedValue;
    }
  }

  // Extract request metadata
  const ip = request.headers.get("x-forwarded-for") ?? null;
  const userAgent = request.headers.get("user-agent") ?? null;

  // Fire webhook (if configured)
  const webhookPayload = {
    formId,
    formTitle: form.title,
    submittedAt: new Date().toISOString(),
    data: normalizedData,
  };
  const webhookResult = form.webhook_url
    ? await fireWebhook(form.webhook_url, webhookPayload)
    : { ok: false, status: null, error: null };

  // Save submission
  const { data: submission, error } = await supabase
    .from("form_submissions")
    .insert({
      form_id: formId,
      data: normalizedData,
      ip_address: ip,
      user_agent: userAgent,
      webhook_sent: webhookResult.ok,
      webhook_error: webhookResult.ok ? null : webhookResult.error,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: submission.id }, { status: 201 });
}
