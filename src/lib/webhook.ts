const WEBHOOK_URL = process.env.WEBHOOK_URL!;

export async function fireWebhook(
  payload: Record<string, unknown>,
): Promise<boolean> {
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // Don't block the user response for more than 10 seconds
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
