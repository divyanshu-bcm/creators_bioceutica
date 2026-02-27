"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X, Check, Loader2, ExternalLink } from "lucide-react";
import { ProspectTableConfig } from "@/lib/prospects-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface ContentDetailPageProps {
  initialData: Record<string, unknown>;
  config: ProspectTableConfig;
  slug: string;
}

function statusColor(status: string | null | undefined): string {
  if (!status) return "secondary";
  const s = status.toLowerCase();
  if (s.includes("pubblicato") || s.includes("active")) return "default";
  return "secondary";
}

export function ContentDetailPage({
  initialData,
  config,
  slug,
}: ContentDetailPageProps) {
  const router = useRouter();
  const pk = config.primaryKey ?? "content_id";
  const apiBase = config.apiBasePath ?? `/api/content`;

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [data, setData] = useState<Record<string, unknown>>(initialData);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const recordId = data[pk] as string;
  const creatorId = data.creator_link_id ?? data.creator_id;
  const creatorName = data.creator_name as string | null;

  function startEdit() {
    setEditForm({ ...data });
    setError("");
    setMode("edit");
  }

  function cancelEdit() {
    setMode("view");
    setError("");
  }

  function setField(key: string, value: unknown) {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    const record: Record<string, unknown> = {};
    for (const col of config.columns) {
      const val = editForm[col.key];
      record[col.key] = val ?? null;
    }
    // Preserve creator_id linkage
    record["creator_id"] = editForm["creator_id"] ?? data["creator_id"] ?? null;

    try {
      const res = await fetch(`${apiBase}/${recordId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record }),
      });
      if (res.ok) {
        const updated = await res.json();
        setData({ ...data, ...updated });
        setMode("view");
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed to save. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this content record? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`${apiBase}/${recordId}`, { method: "DELETE" });
      if (res.ok) {
        router.push(config.detailBasePath ?? "/dashboard/content");
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  }

  const name = data[config.nameField] as string | null;

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
            {name ?? <span className="text-slate-400 italic">Unnamed</span>}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {config.displayLabel}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {mode === "view" ? (
            <>
              <Button
                onClick={startEdit}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                onClick={handleDelete}
                size="sm"
                variant="outline"
                disabled={deleting}
                className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/30"
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Delete
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={cancelEdit}
                size="sm"
                variant="outline"
                className="gap-2"
                disabled={saving}
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                size="sm"
                disabled={saving}
                className="gap-2"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                {saving ? "Saving…" : "Save"}
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Creator link banner */}
      <div className="mb-4 flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Creator:
        </span>
        {creatorId ? (
          <Link
            href={`/dashboard/creators/${creatorId}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100 hover:underline"
          >
            {creatorName ?? String(creatorId)}
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </Link>
        ) : (
          <span className="text-sm text-slate-400 italic">
            No creator linked
          </span>
        )}
      </div>

      {/* Fields grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
        {config.columns.map((col) => {
          const rawValue =
            (mode === "edit" ? editForm[col.key] : data[col.key]) ?? null;

          return (
            <div
              key={col.key}
              className={cn(
                "grid grid-cols-[200px_1fr] gap-4 px-5 py-3.5 items-start",
                mode === "edit" &&
                  "hover:bg-slate-50 dark:hover:bg-slate-800/50",
              )}
            >
              <Label className="text-sm font-medium text-slate-500 dark:text-slate-400 pt-1 leading-tight">
                {col.label}
              </Label>

              {mode === "view" ? (
                <div className="text-sm text-slate-900 dark:text-slate-100 min-h-6 flex items-center flex-wrap gap-1.5">
                  {col.type === "boolean" ? (
                    <Badge variant={rawValue ? "default" : "secondary"}>
                      {rawValue ? "Yes" : "No"}
                    </Badge>
                  ) : rawValue !== null && rawValue !== "" ? (
                    col.key === "Status" ? (
                      <Badge
                        variant="secondary"
                        className={statusColor(String(rawValue))}
                      >
                        {String(rawValue)}
                      </Badge>
                    ) : (
                      <span className="leading-relaxed">
                        {String(rawValue)}
                      </span>
                    )
                  ) : (
                    <span className="text-slate-300 dark:text-slate-600 italic text-xs">
                      —
                    </span>
                  )}
                </div>
              ) : col.type === "boolean" ? (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    checked={!!rawValue}
                    onChange={(e) => setField(col.key, e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 accent-slate-900"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Yes
                  </span>
                </div>
              ) : col.type === "enum" && col.enumOptions ? (
                <Select
                  value={(rawValue as string) ?? ""}
                  onValueChange={(val) =>
                    setField(col.key, val === "__none__" ? null : val)
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
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
                  value={(rawValue as string) ?? ""}
                  onChange={(e) => setField(col.key, e.target.value)}
                  placeholder={col.label}
                  className="h-8 text-sm"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Metadata */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-slate-400 dark:text-slate-500 px-1">
        <div>
          <span className="font-medium">ID: </span>
          <span className="font-mono">{recordId}</span>
        </div>
        {!!data.created_at && (
          <div>
            <span className="font-medium">Created: </span>
            <span>
              {new Date(data.created_at as string).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
