export interface WebhookDeliveryResult {
  ok: boolean;
  status: number | null;
  error: string | null;
}

export async function fireWebhook(
  webhookUrl: string,
  payload: Record<string, unknown>,
): Promise<WebhookDeliveryResult> {
  if (!webhookUrl) {
    return {
      ok: false,
      status: null,
      error: "Webhook URL is missing",
    };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // Don't block the user response for more than 10 seconds
      signal: AbortSignal.timeout(10_000),
    });

    if (res.ok) {
      return {
        ok: true,
        status: res.status,
        error: null,
      };
    }

    const responseText = await res.text().catch(() => "");
    const errorText = responseText.trim();
    return {
      ok: false,
      status: res.status,
      error: errorText
        ? `Webhook returned ${res.status}: ${errorText.slice(0, 500)}`
        : `Webhook returned ${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      status: null,
      error: err instanceof Error ? err.message : "Webhook request failed",
    };
  }
}
