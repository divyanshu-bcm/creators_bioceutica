"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FormFull, FieldType, FormField } from "@/lib/types";
import { useFormBuilder } from "@/hooks/useFormBuilder";
import { FieldToolbar } from "./FieldToolbar";
import { FieldCard } from "./FieldCard";
import { FormRenderer } from "@/components/renderer/FormRenderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Globe,
  GlobeOff,
  Copy,
  Check,
  Pencil,
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  Eye,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FormBuilderProps {
  form: FormFull;
}

export function FormBuilder({ form }: FormBuilderProps) {
  const router = useRouter();
  const builder = useFormBuilder({
    steps: form.steps,
    activeStepId: form.steps[0]?.id ?? "",
  });

  const [formTitle, setFormTitle] = useState(form.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [stepTitleInput, setStepTitleInput] = useState("");

  // Publish state
  const [isPublished, setIsPublished] = useState(form.is_published);
  const [publicUrl, setPublicUrl] = useState<string | null>(
    form.is_published && form.slug
      ? `${window.location.origin}/f/${form.slug}`
      : null,
  );
  const [publishLoading, setPublishLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Delete form dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Preview
  const [previewOpen, setPreviewOpen] = useState(false);

  const activeStep = builder.steps.find((s) => s.id === builder.activeStepId);

  // ─── Form title save ─────────────────────────────────────────────────────
  async function saveTitle() {
    await fetch(`/api/forms/${form.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: formTitle, description: form.description }),
    });
    setEditingTitle(false);
  }

  // ─── Publish / Unpublish ──────────────────────────────────────────────────
  async function handlePublish() {
    setPublishLoading(true);
    const res = await fetch(`/api/forms/${form.id}/publish`, {
      method: "POST",
    });
    const data = await res.json();
    setPublishLoading(false);
    if (res.ok) {
      setIsPublished(true);
      setPublicUrl(data.publicUrl);
    }
  }

  async function handleUnpublish() {
    setPublishLoading(true);
    await fetch(`/api/forms/${form.id}/publish`, { method: "DELETE" });
    setPublishLoading(false);
    setIsPublished(false);
  }

  function copyLink() {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ─── Delete form ──────────────────────────────────────────────────────────
  async function handleDeleteForm() {
    await fetch(`/api/forms/${form.id}`, { method: "DELETE" });
    router.push("/dashboard");
  }

  // ─── Field operations forwarded to hook ──────────────────────────────────
  function handleAddField(type: FieldType) {
    if (!builder.activeStepId) return;
    builder.addField(form.id, builder.activeStepId, type);
  }

  function handleUpdateField(fieldId: string, updates: Partial<FormField>) {
    builder.updateField(form.id, fieldId, updates);
  }

  function handleDeleteField(fieldId: string) {
    if (!activeStep) return;
    builder.deleteField(form.id, activeStep.id, fieldId);
  }

  function handleMoveField(fieldId: string, dir: "up" | "down") {
    if (!activeStep) return;
    builder.moveField(form.id, activeStep.id, fieldId, dir);
  }

  // ─── Drag-and-drop ───────────────────────────────────────────────────────
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  function handleDragStart(fieldId: string) {
    setDragId(fieldId);
  }

  function handleDragOver(e: React.DragEvent, fieldId: string) {
    e.preventDefault();
    if (fieldId !== dragId) setDragOverId(fieldId);
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!dragId || !activeStep || dragId === targetId) {
      setDragId(null);
      setDragOverId(null);
      return;
    }
    const fields = activeStep.fields;
    const fromIdx = fields.findIndex((f) => f.id === dragId);
    const toIdx = fields.findIndex((f) => f.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const reordered = [...fields];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    builder.reorderFields(
      form.id,
      activeStep.id,
      reordered.map((f) => f.id),
    );
    setDragId(null);
    setDragOverId(null);
  }

  function handleDragEnd() {
    setDragId(null);
    setDragOverId(null);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          {editingTitle ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="max-w-xs h-8 text-sm"
                autoFocus
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTitle();
                }}
              />
            </div>
          ) : (
            <button
              className="flex items-center gap-1.5 group"
              onClick={() => setEditingTitle(true)}
            >
              <span className="font-semibold text-slate-900 dark:text-slate-100">{formTitle}</span>
              <Pencil className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {builder.saving && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving…
              </span>
            )}

            <Badge variant={isPublished ? "success" : "secondary"}>
              {isPublished ? "Published" : "Draft"}
            </Badge>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="h-4 w-4 mr-1.5" />
              Preview
            </Button>

            {isPublished ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnpublish}
                disabled={publishLoading}
              >
                <GlobeOff className="h-4 w-4 mr-1.5" />
                Unpublish
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handlePublish}
                disabled={publishLoading}
              >
                {publishLoading ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Globe className="h-4 w-4 mr-1.5" />
                )}
                Publish
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Published URL banner */}
        {isPublished && publicUrl && (
          <div className="bg-green-50 dark:bg-green-950/30 border-t border-green-200 dark:border-green-900 px-4 py-2 flex items-center gap-3">
            <Globe className="h-4 w-4 text-green-600 shrink-0" />
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-green-700 hover:underline flex-1 truncate"
            >
              {publicUrl}
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={copyLink}
              className="shrink-0 h-7"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1 text-green-600" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" /> Copy
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        {/* Left: Steps + Canvas */}
        <div className="flex-1 min-w-0">
          {/* Step tabs */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
            {builder.steps.map((step) => (
              <div key={step.id} className="flex items-center shrink-0">
                {editingStepId === step.id ? (
                  <input
                    autoFocus
                    value={stepTitleInput}
                    onChange={(e) => setStepTitleInput(e.target.value)}
                    onBlur={() => {
                      builder.renameStep(
                        form.id,
                        step.id,
                        stepTitleInput || step.title,
                      );
                      setEditingStepId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        builder.renameStep(
                          form.id,
                          step.id,
                          stepTitleInput || step.title,
                        );
                        setEditingStepId(null);
                      }
                    }}
                    className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded px-2 py-1 text-sm h-9 outline-none focus:ring-2 focus:ring-slate-400"
                    style={{
                      width: `${Math.max(60, stepTitleInput.length * 8)}px`,
                    }}
                  />
                ) : (
                  <button
                    onClick={() => builder.setActiveStep(step.id)}
                    onDoubleClick={() => {
                      setEditingStepId(step.id);
                      setStepTitleInput(step.title);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-sm font-medium transition-colors border",
                      step.id === builder.activeStepId
                        ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
                        : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700",
                    )}
                  >
                    {step.title}
                  </button>
                )}
                {builder.steps.length > 1 && (
                  <button
                    className="ml-1 text-slate-400 hover:text-red-500 transition-colors"
                    onClick={() => builder.deleteStep(form.id, step.id)}
                    title="Delete step"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => builder.addStep(form.id)}
              className="shrink-0"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Step
            </Button>
          </div>

          {/* Step hint */}
          {builder.steps.length > 1 && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
              Double-click a step tab to rename it
            </p>
          )}

          {/* Field canvas */}
          <div className="space-y-3">
            {activeStep?.fields.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-12 text-center text-slate-400 dark:text-slate-500">
                <p className="font-medium">No fields yet</p>
                <p className="text-sm mt-1">
                  Click a field type on the right to add it
                </p>
              </div>
            )}
            {activeStep?.fields.map((field, idx) => (
              <div
                key={field.id}
                draggable
                onDragStart={() => handleDragStart(field.id)}
                onDragOver={(e) => handleDragOver(e, field.id)}
                onDrop={(e) => handleDrop(e, field.id)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "transition-opacity",
                  dragId === field.id && "opacity-40",
                  dragOverId === field.id &&
                    dragId !== field.id &&
                    "ring-2 ring-slate-400 ring-offset-2 rounded-lg",
                )}
              >
                <FieldCard
                  field={field}
                  formId={form.id}
                  isFirst={idx === 0}
                  isLast={idx === activeStep.fields.length - 1}
                  onUpdate={handleUpdateField}
                  onDelete={handleDeleteField}
                  onMove={handleMoveField}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Right: Toolbar */}
        <div className="w-52 shrink-0">
          <FieldToolbar onAdd={handleAddField} />

          <div className="mt-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">
              Responses
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() =>
                router.push(`/dashboard/forms/${form.id}/responses`)
              }
            >
              View Responses
            </Button>
          </div>
        </div>
      </div>

      {/* Preview overlay */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex flex-col">
          {/* Toolbar */}
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-12 flex items-center px-4 gap-3 shrink-0">
            <span className="font-medium text-slate-700 dark:text-slate-200 flex-1">
              Preview —{" "}
              <span className="text-slate-400 font-normal">{formTitle}</span>
            </span>
            <Badge variant="outline" className="text-xs">
              Preview mode
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPreviewOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {/* Scrollable form preview */}
          <div className="flex-1 overflow-y-auto bg-slate-100">
            <FormRenderer
              form={{
                ...form,
                title: formTitle,
                steps: builder.steps,
                slug: form.slug ?? "preview",
                is_published: false,
              }}
              previewMode
            />
          </div>
        </div>
      )}

      {/* Delete form dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Form</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{formTitle}&quot;? This will
              also delete all submissions. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteForm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
