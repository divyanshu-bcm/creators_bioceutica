// POST /api/submissions — save form submission + fire webhook (PUBLIC)
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { fireWebhook } from "@/lib/webhook";

const PHONE_PREFIX = "+39";

type SubmissionData = Record<string, unknown>;

type SubFieldForWebhook = {
  id: string;
  label?: string;
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createUniqueKey(base: string, usedKeys: Set<string>): string {
  const normalizedBase = base.trim() || "field";
  if (!usedKeys.has(normalizedBase)) {
    usedKeys.add(normalizedBase);
    return normalizedBase;
  }

  let suffix = 2;
  let candidate = `${normalizedBase} (${suffix})`;
  while (usedKeys.has(candidate)) {
    suffix += 1;
    candidate = `${normalizedBase} (${suffix})`;
  }
  usedKeys.add(candidate);
  return candidate;
}

function mapGroupedValueBySubFieldLabels(
  value: unknown,
  subFields: SubFieldForWebhook[],
): unknown {
  if (!isPlainRecord(value)) return value;

  const labelById = new Map(
    subFields.map((subField) => [subField.id, subField.label?.trim()]),
  );
  const usedKeys = new Set<string>();
  const mapped: Record<string, unknown> = {};

  for (const [subFieldId, subValue] of Object.entries(value)) {
    const candidateLabel = labelById.get(subFieldId) || subFieldId;
    const mappedKey = createUniqueKey(candidateLabel, usedKeys);
    mapped[mappedKey] = subValue;
  }

  return mapped;
}

function buildWebhookDataFromLabels(
  data: SubmissionData,
  fields: Array<{
    id: string;
    label: string | null;
    field_type: string;
    validation: Record<string, unknown> | null;
  }>,
): SubmissionData {
  const usedTopLevelKeys = new Set<string>();
  const mappedData: SubmissionData = {};
  const knownFieldIds = new Set(fields.map((field) => field.id));

  for (const field of fields) {
    if (!(field.id in data)) continue;

    const fieldKey = createUniqueKey(
      field.label?.trim() || field.id,
      usedTopLevelKeys,
    );
    const rawValue = data[field.id];
    const hasSubFields = isPlainRecord(field.validation)
      ? (field.validation.sub_fields as SubFieldForWebhook[] | undefined)
      : undefined;

    if (
      (field.field_type === "group" ||
        field.field_type === "name_group" ||
        field.field_type === "address_group") &&
      Array.isArray(hasSubFields)
    ) {
      mappedData[fieldKey] = mapGroupedValueBySubFieldLabels(
        rawValue,
        hasSubFields,
      );
      continue;
    }

    mappedData[fieldKey] = rawValue;
  }

  for (const [fieldId, value] of Object.entries(data)) {
    if (knownFieldIds.has(fieldId)) continue;
    const key = createUniqueKey(fieldId, usedTopLevelKeys);
    mappedData[key] = value;
  }

  return mappedData;
}

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

  const { data: fields } = await supabase
    .from("form_fields")
    .select("id, field_type, label, validation")
    .eq("form_id", formId)
    .eq("is_draft", false)
    .eq("pending_delete", false);

  const normalizedData = { ...(data as SubmissionData) };
  for (const field of fields ?? []) {
    if (field.field_type !== "phone" && field.field_type !== "email") {
      continue;
    }

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

  const webhookData = buildWebhookDataFromLabels(normalizedData, fields ?? []);

  // Extract request metadata
  const ip = request.headers.get("x-forwarded-for") ?? null;
  const userAgent = request.headers.get("user-agent") ?? null;

  // Save submission first so we have the submission ID for the webhook
  const { data: submission, error } = await supabase
    .from("form_submissions")
    .insert({
      form_id: formId,
      data: normalizedData,
      ip_address: ip,
      user_agent: userAgent,
      webhook_sent: false,
      webhook_error: null,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Fire webhook (if configured)
  const webhookPayload = {
    formId,
    formTitle: form.title,
    submissionId: submission.id,
    submittedAt: new Date().toISOString(),
    data: webhookData,
  };
  const webhookResult = form.webhook_url
    ? await fireWebhook(form.webhook_url, webhookPayload)
    : { ok: false, status: null, error: null };

  // Update submission with webhook result
  if (form.webhook_url) {
    await supabase
      .from("form_submissions")
      .update({
        webhook_sent: webhookResult.ok,
        webhook_error: webhookResult.ok ? null : webhookResult.error,
      })
      .eq("id", submission.id);
  }

  return NextResponse.json({ ok: true, id: submission.id }, { status: 201 });
}
