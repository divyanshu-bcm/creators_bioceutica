import { createServiceRoleClient } from "@/lib/supabase/admin";
import { AcceptInvitationForm } from "@/components/AcceptInvitationForm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ token?: string }>;
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl text-red-600">
            Invalid Invitation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {message}
          </p>
          <Link
            href="/login"
            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
          >
            Go to login
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function AcceptInvitationPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    return <ErrorCard message="No invitation token found in this link." />;
  }

  const service = createServiceRoleClient();
  const { data: invitation, error } = await service
    .from("invitations")
    .select("email, full_name, role, expires_at, accepted_at")
    .eq("token", token)
    .single();

  if (error || !invitation) {
    return <ErrorCard message="This invitation link is invalid." />;
  }

  if (invitation.accepted_at) {
    return (
      <ErrorCard message="This invitation has already been accepted. Please sign in." />
    );
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return (
      <ErrorCard message="This invitation link has expired. Please ask your admin for a new one." />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Accept Invitation</CardTitle>
          <CardDescription>
            Set a password to complete your account setup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AcceptInvitationForm
            token={token}
            email={invitation.email}
            fullName={invitation.full_name}
            role={invitation.role}
          />
        </CardContent>
      </Card>
    </div>
  );
}
