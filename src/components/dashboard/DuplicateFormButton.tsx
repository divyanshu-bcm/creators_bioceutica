"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Copy, Loader2 } from "lucide-react";

export function DuplicateFormButton({ formId }: { formId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDuplicate() {
    setLoading(true);
    const res = await fetch(`/api/forms/${formId}/duplicate`, {
      method: "POST",
    });
    setLoading(false);
    if (res.ok) {
      const { id } = await res.json();
      router.push(`/dashboard/forms/${id}`);
      router.refresh();
    }
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handleDuplicate}
      disabled={loading}
      title="Duplicate form"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );
}
