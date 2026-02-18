"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function NewFormButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    const res = await fetch("/api/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled Form" }),
    });
    const form = await res.json();
    setLoading(false);
    if (form?.id) {
      router.push(`/dashboard/forms/${form.id}`);
    }
  }

  return (
    <Button onClick={handleCreate} disabled={loading}>
      <Plus className="h-4 w-4 mr-2" />
      {loading ? "Creating…" : "New Form"}
    </Button>
  );
}
