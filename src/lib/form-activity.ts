import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createSessionClient } from "@/lib/supabase/server";
import type { FormActivityEntry } from "@/lib/types";

interface TrackFormActivityInput {
  formId: string;
  action: string;
  details?: Record<string, unknown> | null;
}

const MAX_ACTIVITY_ENTRIES = 500;

export async function trackFormActivity({
  formId,
  action,
  details = null,
}: TrackFormActivityInput): Promise<void> {
  const sessionClient = await createSessionClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  const supabase = createServiceRoleClient();

  let actorEmail: string | null = user?.email ?? null;
  let actorFullName: string | null = null;

  if (user?.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", user.id)
      .maybeSingle();

    actorEmail = profile?.email ?? actorEmail;
    actorFullName = profile?.full_name ?? null;
  }

  const { data: form } = await supabase
    .from("forms")
    .select("activity")
    .eq("id", formId)
    .maybeSingle();

  const currentActivity = Array.isArray(form?.activity)
    ? (form.activity as FormActivityEntry[])
    : [];

  const activityEntry: FormActivityEntry = {
    id: crypto.randomUUID(),
    action,
    at: new Date().toISOString(),
    actor: {
      id: user?.id ?? null,
      email: actorEmail,
      full_name: actorFullName,
    },
    details,
  };

  const nextActivity = [...currentActivity, activityEntry].slice(
    -MAX_ACTIVITY_ENTRIES,
  );

  await supabase
    .from("forms")
    .update({ activity: nextActivity })
    .eq("id", formId);
}
