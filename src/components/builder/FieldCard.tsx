"use client";

import { useState, useRef } from "react";
import type { FormField, FieldType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ImageLibraryModal } from "./ImageLibraryModal";
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Pencil,
  X,
  Check,
  GripVertical,
  Upload,
  Images,
  Loader2,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FIELD_LABEL: Record<FieldType, string> = {
  text: "Text",
  textarea: "Textarea",
  email: "Email",
  phone: "Phone",
  number: "Number",
  dropdown: "Dropdown",
  checkbox: "Checkbox",
  radio: "Radio Group",
  datetime: "Date / Time",
  image: "Image Block",
};

const FIELD_COLOR: Record<FieldType, string> = {
  text: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
  textarea:
    "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
  email:
    "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800",
  phone:
    "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800",
  number:
    "bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800",
  dropdown:
    "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800",
  checkbox:
    "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800",
  radio:
    "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800",
  datetime:
    "bg-pink-50 border-pink-200 dark:bg-pink-950/30 dark:border-pink-800",
  image:
    "bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700",
};

interface FieldCardProps {
  field: FormField;
  formId: string;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (fieldId: string, updates: Partial<FormField>) => void;
  onDelete: (fieldId: string) => void;
  onRestore: (fieldId: string) => void;
  onMove: (fieldId: string, direction: "up" | "down") => void;
  onDragHandlePointerDown: () => void;
  onDragHandlePointerUp: () => void;
}

export function FieldCard({
  field,
  formId,
  isFirst,
  isLast,
  onUpdate,
  onDelete,
  onRestore,
  onMove,
  onDragHandlePointerDown,
  onDragHandlePointerUp,
}: FieldCardProps) {
  const isPendingDelete = field.pending_delete;
  const isNewDraft = field.is_draft && !field.draft_parent_id;
  const isEditDraft = field.is_draft && !!field.draft_parent_id;
  const [editing, setEditing] = useState(false);
  const [localField, setLocalField] = useState<FormField>(field);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function saveEdits() {
    onUpdate(field.id, {
      label: localField.label,
      placeholder: localField.placeholder,
      helper_text: localField.helper_text,
      is_required: localField.is_required,
      options: localField.options,
      image_url: localField.image_url,
      image_alt: localField.image_alt,
    });
    setEditing(false);
  }

  function cancelEdits() {
    setLocalField(field);
    setEditing(false);
    setUploadError("");
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setLocalField((f) => ({ ...f, image_url: data.url }));
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const hasOptions = ["dropdown", "radio", "checkbox"].includes(
    field.field_type,
  );

  return (
    <div
      className={cn(
        "rounded-lg border-2 p-4 transition-all relative",
        isPendingDelete
          ? "border-red-300 bg-red-50/80 dark:border-red-800/60 dark:bg-red-950/20 opacity-70"
          : FIELD_COLOR[field.field_type],
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-2">
        <GripVertical
          className="h-4 w-4 text-slate-400 shrink-0 cursor-grab active:cursor-grabbing"
          onPointerDown={onDragHandlePointerDown}
          onPointerUp={onDragHandlePointerUp}
        />
        <div className="flex-1 min-w-0">
          {field.field_type === "image" ? (
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Image Block
            </span>
          ) : (
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate block">
              {field.label || (
                <span className="text-slate-400 dark:text-slate-500 italic">
                  Unlabelled field
                </span>
              )}
              {field.is_required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </span>
          )}
        </div>
        <Badge variant="outline" className="text-xs shrink-0">
          {FIELD_LABEL[field.field_type]}
        </Badge>
        {isNewDraft && (
          <Badge className="text-xs shrink-0 bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700">
            New
          </Badge>
        )}
        {isEditDraft && (
          <Badge className="text-xs shrink-0 bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700">
            Modified
          </Badge>
        )}
        {isPendingDelete && (
          <Badge className="text-xs shrink-0 bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700">
            Will delete
          </Badge>
        )}
        <div className="flex items-center gap-1 shrink-0">
          {isPendingDelete ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-green-600 hover:text-green-800 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/40"
              onClick={() => onRestore(field.id)}
              title="Undo deletion"
            >
              <Undo2 className="h-3 w-3 mr-1" /> Undo
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onMove(field.id, "up")}
                disabled={isFirst}
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onMove(field.id, "down")}
                disabled={isLast}
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setEditing((v) => !v)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-500 hover:text-red-700"
                onClick={() => onDelete(field.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Edit panel */}
      {editing && !isPendingDelete && (
        <div className="mt-4 space-y-3 bg-white dark:bg-slate-900 rounded-md p-4 border border-slate-200 dark:border-slate-700">
          {field.field_type === "image" ? (
            <>
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />

              {/* Upload + Library buttons */}
              <div className="space-y-1">
                <Label>Image</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-1.5" />
                    )}
                    {uploading ? "Uploading…" : "Upload Image"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={uploading}
                    onClick={() => setLibraryOpen(true)}
                  >
                    <Images className="h-4 w-4 mr-1.5" />
                    From Library
                  </Button>
                </div>
                {uploadError && (
                  <p className="text-xs text-red-600 mt-1">{uploadError}</p>
                )}
              </div>

              {/* Alt text */}
              <div className="space-y-1">
                <Label>Alt Text</Label>
                <Input
                  value={localField.image_alt ?? ""}
                  onChange={(e) =>
                    setLocalField((f) => ({ ...f, image_alt: e.target.value }))
                  }
                  placeholder="Describe the image"
                />
              </div>

              {/* Current image preview */}
              {localField.image_url && (
                <div className="space-y-1">
                  <Label className="text-slate-500 text-xs">Preview</Label>
                  <div className="relative rounded-md border overflow-hidden bg-slate-50">
                    <img
                      src={localField.image_url}
                      alt={localField.image_alt ?? ""}
                      className="max-h-48 w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setLocalField((f) => ({ ...f, image_url: null }))
                      }
                      className="absolute top-1 right-1 bg-white rounded-full shadow p-0.5 hover:bg-red-50 transition-colors"
                      title="Remove image"
                    >
                      <X className="h-3.5 w-3.5 text-red-500" />
                    </button>
                  </div>
                </div>
              )}

              {/* Library modal */}
              <ImageLibraryModal
                open={libraryOpen}
                onClose={() => setLibraryOpen(false)}
                onSelect={(url) =>
                  setLocalField((f) => ({ ...f, image_url: url }))
                }
              />
            </>
          ) : (
            <>
              <div className="space-y-1">
                <Label>Label</Label>
                <Input
                  value={localField.label ?? ""}
                  onChange={(e) =>
                    setLocalField((f) => ({ ...f, label: e.target.value }))
                  }
                  placeholder="Field label"
                />
              </div>
              <div className="space-y-1">
                <Label>Placeholder</Label>
                <Input
                  value={localField.placeholder ?? ""}
                  onChange={(e) =>
                    setLocalField((f) => ({
                      ...f,
                      placeholder: e.target.value,
                    }))
                  }
                  placeholder="Placeholder text"
                />
              </div>
              <div className="space-y-1">
                <Label>Helper Text</Label>
                <Input
                  value={localField.helper_text ?? ""}
                  onChange={(e) =>
                    setLocalField((f) => ({
                      ...f,
                      helper_text: e.target.value,
                    }))
                  }
                  placeholder="Optional helper text below the field"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`required-${field.id}`}
                  checked={localField.is_required}
                  onChange={(e) =>
                    setLocalField((f) => ({
                      ...f,
                      is_required: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded"
                />
                <Label htmlFor={`required-${field.id}`}>Required</Label>
              </div>

              {hasOptions && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Options</Label>
                    {(localField.options ?? []).map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          value={opt}
                          onChange={(e) => {
                            const opts = [...(localField.options ?? [])];
                            opts[i] = e.target.value;
                            setLocalField((f) => ({ ...f, options: opts }));
                          }}
                          placeholder={`Option ${i + 1}`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-red-500"
                          onClick={() => {
                            const opts = (localField.options ?? []).filter(
                              (_, j) => j !== i,
                            );
                            setLocalField((f) => ({ ...f, options: opts }));
                          }}
                          disabled={(localField.options?.length ?? 0) <= 1}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setLocalField((f) => ({
                          ...f,
                          options: [
                            ...(f.options ?? []),
                            `Option ${(f.options?.length ?? 0) + 1}`,
                          ],
                        }))
                      }
                    >
                      + Add Option
                    </Button>
                  </div>
                </>
              )}
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={cancelEdits}>
              <X className="h-3 w-3 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={saveEdits}>
              <Check className="h-3 w-3 mr-1" /> Save
            </Button>
          </div>
        </div>
      )}

      {/* Image preview (non-editing mode) */}
      {!editing && field.field_type === "image" && field.image_url && (
        <div className="mt-3">
          <img
            src={field.image_url}
            alt={field.image_alt ?? ""}
            className="max-h-32 rounded-md object-contain border"
          />
        </div>
      )}
    </div>
  );
}
