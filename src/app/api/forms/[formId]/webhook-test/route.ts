import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { fireWebhook } from "@/lib/webhook";
import { trackFormActivity } from "@/lib/form-activity";

type Params = { params: Promise<{ formId: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { formId } = await params;
  const supabase = createServiceRoleClient();

  const { data: form, error } = await supabase
    .from("forms")
    .select("id, title, webhook_url")
    .eq("id", formId)
    .single();

  if (error || !form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  const webhookUrl = form.webhook_url?.trim();
  if (!webhookUrl) {
    return NextResponse.json(
      { error: "Webhook URL is not configured for this form" },
      { status: 400 },
    );
  }

  try {
    new URL(webhookUrl);
  } catch {
    return NextResponse.json(
      { error: "Webhook URL is invalid" },
      { status: 400 },
    );
  }

  const payload = {
    event: "form.webhook.test",
    formId: form.id,
    formTitle: form.title,
    testedAt: new Date().toISOString(),
    data: {
      message: "This is a test payload from the form builder",
      source: "dashboard",
    },
  };

  const result = await fireWebhook(webhookUrl, payload);

  if (!result.ok) {
    await trackFormActivity({
      formId,
      action: "webhook_test_failed",
      details: {
        webhook_url: webhookUrl,
        status: result.status,
        error: result.error,
      },
    }).catch(() => {});

    return NextResponse.json(
      {
        ok: false,
        status: result.status,
        error: result.error ?? "Webhook request failed",
      },
      { status: 502 },
    );
  }

  await trackFormActivity({
    formId,
    action: "webhook_test_succeeded",
    details: {
      webhook_url: webhookUrl,
      status: result.status,
    },
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    status: result.status,
    message: "Webhook test sent successfully",
  });
}
