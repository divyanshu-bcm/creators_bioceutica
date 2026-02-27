"use client";

import { useState } from "react";
import { PlusCircle, Loader2 } from "lucide-react";
import { ProspectTableConfig } from "@/lib/prospects-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

interface ProspectCreateModalProps {
  slug: string;
  config: ProspectTableConfig;
  onSuccess: () => void;
}

export function ProspectCreateModal({
  slug,
  config,
  onSuccess,
}: ProspectCreateModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Record<string, string | boolean>>({});

  function handleOpen() {
    setForm({});
    setError("");
    setOpen(true);
  }

  function setValue(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Strip empty strings so optional columns stay null in DB
    const record: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) {
      if (v !== "" && v !== undefined) record[k] = v;
    }

    const apiBase = config.apiBasePath ?? `/api/prospects/${slug}`;

    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record }),
      });

      if (res.ok) {
        setOpen(false);
        onSuccess();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to create record. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={handleOpen} size="sm" className="gap-2">
        <PlusCircle className="h-4 w-4" />
        Add Record
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New {config.displayLabel}</DialogTitle>
            <DialogDescription>
              Fill in the details below. All fields are optional.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {config.columns.map((col) => (
              <div key={col.key} className="space-y-1.5">
                <Label
                  htmlFor={`create-${col.key}`}
                  className="text-sm font-medium"
                >
                  {col.label}
                </Label>
                {col.type === "boolean" ? (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      id={`create-${col.key}`}
                      type="checkbox"
                      checked={!!form[col.key]}
                      onChange={(e) => setValue(col.key, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 accent-slate-900"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Yes
                    </span>
                  </div>
                ) : col.type === "enum" && col.enumOptions ? (
                  <Select
                    value={(form[col.key] as string) ?? ""}
                    onValueChange={(val) =>
                      setValue(col.key, val === "__none__" ? "" : val)
                    }
                  >
                    <SelectTrigger id={`create-${col.key}`} className="h-9">
                      <SelectValue placeholder={`Select ${col.label}…`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        <span className="text-slate-400 italic">None</span>
                      </SelectItem>
                      {col.enumOptions.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={`create-${col.key}`}
                    value={(form[col.key] as string) ?? ""}
                    onChange={(e) => setValue(col.key, e.target.value)}
                    placeholder={col.label}
                    className="h-9"
                  />
                )}
              </div>
            ))}

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Saving…" : "Save Record"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
