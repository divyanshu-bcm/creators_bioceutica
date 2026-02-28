"use client";

import { useState, useRef, useEffect } from "react";
import type { FormField, FieldType, ElementColorStyle, SubField, LabelAlign } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ImageLibraryModal } from "./ImageLibraryModal";
import { ElementStyleEditor } from "./ElementStyleEditor";
import { RichTextEditor } from "./RichTextEditor";
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
  AlignLeft,
  AlignCenter,
  AlignRight,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

function getFieldAppearanceStyle(
  field: FormField,
): ElementColorStyle | undefined {
  const appearance = field.validation?.appearance;
  if (!appearance) return undefined;
  return {
    text_color: appearance.text_color,
    background_color: appearance.background_color,
    border_color: appearance.border_color,
  };
}

function getSubFields(field: FormField): SubField[] {
  const raw = field.validation?.sub_fields;
  if (Array.isArray(raw) && raw.length > 0) return raw as SubField[];
  return [];
}

function patchSubFields(
  field: FormField,
  subFields: SubField[],
): FormField["validation"] {
  const base: Record<string, unknown> = { ...(field.validation ?? {}) };
  if (subFields.length === 0) {
    delete base.sub_fields;
  } else {
    base.sub_fields = subFields;
  }
  return Object.keys(base).length > 0
    ? (base as FormField["validation"])
    : null;
}

function setFieldAppearanceStyle(
  field: FormField,
  style: ElementColorStyle | undefined,
): FormField["validation"] {
  const validation = { ...(field.validation ?? {}) };
  if (
    style &&
    (style.text_color || style.background_color || style.border_color)
  ) {
    validation.appearance = style;
  } else {
    delete validation.appearance;
  }
  return Object.keys(validation).length > 0 ? validation : null;
}

function setLabelAlign(
  field: FormField,
  align: LabelAlign | undefined,
): FormField["validation"] {
  const v = { ...(field.validation ?? {}) };
  if (align && align !== "left") {
    v.label_align = align;
  } else {
    delete v.label_align;
  }
  return Object.keys(v).length > 0 ? (v as FormField["validation"]) : null;
}

function getLabelAlign(field: FormField): LabelAlign {
  const v = field.validation?.label_align;
  if (v === "center" || v === "right") return v;
  return "left";
}

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
  paragraph: "Paragraph",
  group: "Group",
  name_group: "Name",
  address_group: "Address",
  boolean: "Boolean",
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
  paragraph:
    "bg-teal-50 border-teal-200 dark:bg-teal-950/30 dark:border-teal-800",
  group:
    "bg-indigo-50 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-800",
  name_group:
    "bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800",
  address_group:
    "bg-cyan-50 border-cyan-200 dark:bg-cyan-950/30 dark:border-cyan-800",
  boolean:
    "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800",
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
  const isParagraph = field.field_type === "paragraph";
  const isGroup = field.field_type === "group";
  const isBoolean = field.field_type === "boolean";
  const isPredefinedGroup =
    field.field_type === "name_group" || field.field_type === "address_group";
  const isGroupLike = isGroup || isPredefinedGroup;
  const [editing, setEditing] = useState(false);
  const [predefinedTab, setPredefinedTab] = useState("fields");
  const [localField, setLocalField] = useState<FormField>(field);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalField(field);
  }, [field]);

  function saveEdits() {
    onUpdate(field.id, {
      label: localField.label,
      placeholder: localField.placeholder,
      helper_text: localField.helper_text,
      is_required: localField.is_required,
      options: localField.options,
      image_url: localField.image_url,
      image_alt: localField.image_alt,
      validation: localField.validation,
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
          ) : isParagraph ? (
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400 truncate block">
              {field.label ? (
                field.label.length > 60 ? (
                  field.label.slice(0, 60) + "…"
                ) : (
                  field.label
                )
              ) : (
                <span className="italic">Empty paragraph</span>
              )}
            </span>
          ) : isGroupLike ? (
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate block">
              {field.label || (
                <span className="text-slate-400 dark:text-slate-500 italic">
                  Unlabelled {FIELD_LABEL[field.field_type].toLowerCase()}
                </span>
              )}
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
          ) : isParagraph ? (
            <>
              <div className="space-y-1">
                <Label>Content</Label>
                <RichTextEditor
                  value={localField.label ?? ""}
                  onChange={(html) =>
                    setLocalField((f) => ({ ...f, label: html }))
                  }
                  placeholder="Type your paragraph text here…"
                  minHeight={120}
                />
              </div>
              <ElementStyleEditor
                title="Text colors"
                value={getFieldAppearanceStyle(localField)}
                onChange={(style) =>
                  setLocalField((f) => ({
                    ...f,
                    validation: setFieldAppearanceStyle(f, style),
                  }))
                }
              />
            </>
          ) : isBoolean ? (
            <>
              {/* Boolean: label */}
              <div className="space-y-1">
                <Label>Question Label</Label>
                <Input
                  value={localField.label ?? ""}
                  onChange={(e) =>
                    setLocalField((f) => ({ ...f, label: e.target.value }))
                  }
                  placeholder="e.g. Are you interested?"
                />
              </div>

              {/* True / False labels */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">True label</Label>
                  <Input
                    value={localField.options?.[0] ?? "Yes"}
                    onChange={(e) => {
                      const opts = [...(localField.options ?? ["Yes", "No"])];
                      opts[0] = e.target.value;
                      setLocalField((f) => ({ ...f, options: opts }));
                    }}
                    placeholder="Yes"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">False label</Label>
                  <Input
                    value={localField.options?.[1] ?? "No"}
                    onChange={(e) => {
                      const opts = [...(localField.options ?? ["Yes", "No"])];
                      opts[1] = e.target.value;
                      setLocalField((f) => ({ ...f, options: opts }));
                    }}
                    placeholder="No"
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              {/* Helper text */}
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
                  placeholder="Optional helper text"
                />
              </div>

              {/* Label alignment */}
              <div className="space-y-1.5">
                <Label>Label Alignment</Label>
                <div className="flex gap-1">
                  {(["left", "center", "right"] as LabelAlign[]).map((a) => (
                    <Button
                      key={a}
                      type="button"
                      variant={getLabelAlign(localField) === a ? "default" : "outline"}
                      size="sm"
                      className="h-8 flex-1"
                      onClick={() =>
                        setLocalField((f) => ({
                          ...f,
                          validation: setLabelAlign(f, a),
                        }))
                      }
                    >
                      {a === "left" && <AlignLeft className="h-3.5 w-3.5" />}
                      {a === "center" && <AlignCenter className="h-3.5 w-3.5" />}
                      {a === "right" && <AlignRight className="h-3.5 w-3.5" />}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Required */}
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

              <ElementStyleEditor
                title="Element colors"
                value={getFieldAppearanceStyle(localField)}
                onChange={(style) =>
                  setLocalField((f) => ({
                    ...f,
                    validation: setFieldAppearanceStyle(f, style),
                  }))
                }
              />
            </>
          ) : isPredefinedGroup ? (
            <>
              {/* Group label */}
              <div className="space-y-1">
                <Label>Group Label</Label>
                <Input
                  value={localField.label ?? ""}
                  onChange={(e) =>
                    setLocalField((f) => ({ ...f, label: e.target.value }))
                  }
                  placeholder="e.g. Full Name, Address"
                />
              </div>

              {/* Helper text */}
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
                  placeholder="Optional helper text"
                />
              </div>

              {/* Label alignment */}
              <div className="space-y-1.5">
                <Label>Label Alignment</Label>
                <div className="flex gap-1">
                  {(["left", "center", "right"] as LabelAlign[]).map((a) => (
                    <Button
                      key={a}
                      type="button"
                      variant={getLabelAlign(localField) === a ? "default" : "outline"}
                      size="sm"
                      className="h-8 flex-1"
                      onClick={() =>
                        setLocalField((f) => ({
                          ...f,
                          validation: setLabelAlign(f, a),
                        }))
                      }
                    >
                      {a === "left" && <AlignLeft className="h-3.5 w-3.5" />}
                      {a === "center" && <AlignCenter className="h-3.5 w-3.5" />}
                      {a === "right" && <AlignRight className="h-3.5 w-3.5" />}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Two-tab panel */}
              <Tabs value={predefinedTab} onValueChange={setPredefinedTab} className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="fields" className="flex-1 text-xs">
                    Fields
                  </TabsTrigger>
                  <TabsTrigger value="edit" className="flex-1 text-xs">
                    Edit Fields
                  </TabsTrigger>
                </TabsList>

                {/* ── Fields tab: enable / disable sub-fields ── */}
                <TabsContent value="fields" className="pt-3 space-y-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Check the sub-fields you want to include in this group.
                  </p>
                  {getSubFields(localField).map((sf) => (
                    <label
                      key={sf.id}
                      className="flex items-center gap-2.5 cursor-pointer py-1.5 px-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <input
                        type="checkbox"
                        checked={sf.enabled !== false}
                        onChange={(e) => {
                          const next = getSubFields(localField).map((s) =>
                            s.id === sf.id
                              ? { ...s, enabled: e.target.checked }
                              : s,
                          );
                          setLocalField((f) => ({
                            ...f,
                            validation: patchSubFields(f, next),
                          }));
                        }}
                        className="h-4 w-4 rounded"
                      />
                      <span className="text-sm text-slate-800 dark:text-slate-200">
                        {sf.label || <span className="italic text-slate-400">Unnamed sub-field</span>}
                      </span>
                      {sf.is_required && (
                        <span className="text-xs text-red-500 ml-auto">required</span>
                      )}
                      {sf.input_type === "dropdown" && (
                        <Badge variant="outline" className="text-xs ml-auto">Dropdown</Badge>
                      )}
                    </label>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-1"
                    onClick={() => {
                      const next = [
                        ...getSubFields(localField),
                        {
                          id: crypto.randomUUID(),
                          label: "",
                          placeholder: "",
                          is_required: false,
                          input_type: "text" as const,
                          options: [],
                          enabled: true,
                        },
                      ];
                      setLocalField((f) => ({
                        ...f,
                        validation: patchSubFields(f, next),
                      }));
                      setPredefinedTab("edit");
                    }}
                  >
                    + Add Sub-field
                  </Button>
                </TabsContent>

                {/* ── Edit Fields tab: configure each enabled sub-field ── */}
                <TabsContent value="edit" className="pt-3 space-y-4">
                  {getSubFields(localField).filter((sf) => sf.enabled !== false).length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">
                      No fields enabled. Go to the Fields tab to enable some.
                    </p>
                  )}
                  {getSubFields(localField)
                    .filter((sf) => sf.enabled !== false)
                    .map((sf) => (
                      <div
                        key={sf.id}
                        className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-3 bg-slate-50 dark:bg-slate-800/50"
                      >
                        {/* Card header with delete button */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">
                            {sf.label || "Unnamed sub-field"}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500 hover:text-red-700 shrink-0 ml-2"
                            onClick={() => {
                              const next = getSubFields(localField).filter((s) => s.id !== sf.id);
                              setLocalField((f) => ({
                                ...f,
                                validation: patchSubFields(f, next),
                              }));
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        {/* Label */}
                        <div className="space-y-1">
                          <Label className="text-xs">Label</Label>
                          <Input
                            value={sf.label}
                            onChange={(e) => {
                              const next = getSubFields(localField).map((s) =>
                                s.id === sf.id ? { ...s, label: e.target.value } : s,
                              );
                              setLocalField((f) => ({
                                ...f,
                                validation: patchSubFields(f, next),
                              }));
                            }}
                            placeholder="Sub-field label"
                            className="h-8 text-sm"
                          />
                        </div>

                        {/* Placeholder */}
                        <div className="space-y-1">
                          <Label className="text-xs">Placeholder</Label>
                          <Input
                            value={sf.placeholder}
                            onChange={(e) => {
                              const next = getSubFields(localField).map((s) =>
                                s.id === sf.id
                                  ? { ...s, placeholder: e.target.value }
                                  : s,
                              );
                              setLocalField((f) => ({
                                ...f,
                                validation: patchSubFields(f, next),
                              }));
                            }}
                            placeholder="Placeholder text"
                            className="h-8 text-sm"
                          />
                        </div>

                        {/* Required */}
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`sf-req-${sf.id}`}
                            checked={sf.is_required === true}
                            onChange={(e) => {
                              const next = getSubFields(localField).map((s) =>
                                s.id === sf.id
                                  ? { ...s, is_required: e.target.checked }
                                  : s,
                              );
                              setLocalField((f) => ({
                                ...f,
                                validation: patchSubFields(f, next),
                              }));
                            }}
                            className="h-4 w-4 rounded"
                          />
                          <Label htmlFor={`sf-req-${sf.id}`} className="text-xs font-normal cursor-pointer">
                            Required
                          </Label>
                        </div>

                        {/* Input type */}
                        <div className="space-y-1">
                          <Label className="text-xs">Input Type</Label>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant={sf.input_type !== "dropdown" ? "default" : "outline"}
                              size="sm"
                              className="h-7 text-xs flex-1"
                              onClick={() => {
                                const next = getSubFields(localField).map((s) =>
                                  s.id === sf.id ? { ...s, input_type: "text" as const } : s,
                                );
                                setLocalField((f) => ({
                                  ...f,
                                  validation: patchSubFields(f, next),
                                }));
                              }}
                            >
                              Text
                            </Button>
                            <Button
                              type="button"
                              variant={sf.input_type === "dropdown" ? "default" : "outline"}
                              size="sm"
                              className="h-7 text-xs flex-1"
                              onClick={() => {
                                const next = getSubFields(localField).map((s) =>
                                  s.id === sf.id ? { ...s, input_type: "dropdown" as const } : s,
                                );
                                setLocalField((f) => ({
                                  ...f,
                                  validation: patchSubFields(f, next),
                                }));
                              }}
                            >
                              Dropdown
                            </Button>
                          </div>
                        </div>

                        {/* Options (only when dropdown) */}
                        {sf.input_type === "dropdown" && (
                          <div className="space-y-1">
                            <Label className="text-xs">
                              Options{" "}
                              <span className="font-normal text-slate-500">(one per line)</span>
                            </Label>
                            <Textarea
                              value={(sf.options ?? []).join("\n")}
                              onChange={(e) => {
                                const opts = e.target.value
                                  .split("\n")
                                  .map((l) => l.trimEnd())
                                  .filter((l) => l.trim() !== "");
                                const next = getSubFields(localField).map((s) =>
                                  s.id === sf.id ? { ...s, options: opts } : s,
                                );
                                setLocalField((f) => ({
                                  ...f,
                                  validation: patchSubFields(f, next),
                                }));
                              }}
                              placeholder={"Option A\nOption B\nOption C"}
                              rows={5}
                              className="text-sm font-mono resize-none"
                            />
                            <p className="text-xs text-slate-400">
                              {(sf.options ?? []).length} option{(sf.options ?? []).length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                </TabsContent>
              </Tabs>

              <ElementStyleEditor
                title="Element colors"
                value={getFieldAppearanceStyle(localField)}
                onChange={(style) =>
                  setLocalField((f) => ({
                    ...f,
                    validation: setFieldAppearanceStyle(f, style),
                  }))
                }
              />
            </>
          ) : isGroup ? (
            <>
              {/* Group label */}
              <div className="space-y-1">
                <Label>Group Label</Label>
                <Input
                  value={localField.label ?? ""}
                  onChange={(e) =>
                    setLocalField((f) => ({ ...f, label: e.target.value }))
                  }
                  placeholder="e.g. Full Name, Address"
                />
              </div>

              {/* Helper text */}
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
                  placeholder="Optional helper text"
                />
              </div>

              {/* Required */}
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

              <Separator />

              {/* Sub-fields */}
              <div className="space-y-2">
                <Label>Sub-fields</Label>
                {getSubFields(localField).length === 0 && (
                  <p className="text-xs text-slate-400">
                    No sub-fields yet — add one below.
                  </p>
                )}
                {getSubFields(localField).map((sf, i) => {
                  const subs = getSubFields(localField);
                  return (
                    <div key={sf.id} className="flex gap-2 items-start">
                      <div className="flex-1 space-y-1.5">
                        <Input
                          value={sf.label}
                          onChange={(e) => {
                            const next = subs.map((s, j) =>
                              j === i ? { ...s, label: e.target.value } : s,
                            );
                            setLocalField((f) => ({
                              ...f,
                              validation: patchSubFields(f, next),
                            }));
                          }}
                          placeholder={`Sub-label ${i + 1}`}
                        />
                        <Input
                          value={sf.placeholder}
                          onChange={(e) => {
                            const next = subs.map((s, j) =>
                              j === i
                                ? { ...s, placeholder: e.target.value }
                                : s,
                            );
                            setLocalField((f) => ({
                              ...f,
                              validation: patchSubFields(f, next),
                            }));
                          }}
                          placeholder="Placeholder (optional)"
                          className="text-xs"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-red-500 shrink-0"
                        onClick={() => {
                          const next = subs.filter((_, j) => j !== i);
                          setLocalField((f) => ({
                            ...f,
                            validation: patchSubFields(f, next),
                          }));
                        }}
                        disabled={subs.length <= 1}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const next = [
                      ...getSubFields(localField),
                      { id: crypto.randomUUID(), label: "", placeholder: "" },
                    ];
                    setLocalField((f) => ({
                      ...f,
                      validation: patchSubFields(f, next),
                    }));
                  }}
                >
                  + Add Sub-field
                </Button>
              </div>

              <ElementStyleEditor
                title="Element colors"
                value={getFieldAppearanceStyle(localField)}
                onChange={(style) =>
                  setLocalField((f) => ({
                    ...f,
                    validation: setFieldAppearanceStyle(f, style),
                  }))
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

              {/* Label alignment */}
              <div className="space-y-1.5">
                <Label>Label Alignment</Label>
                <div className="flex gap-1">
                  {(["left", "center", "right"] as LabelAlign[]).map((a) => (
                    <Button
                      key={a}
                      type="button"
                      variant={getLabelAlign(localField) === a ? "default" : "outline"}
                      size="sm"
                      className="h-8 flex-1"
                      onClick={() =>
                        setLocalField((f) => ({
                          ...f,
                          validation: setLabelAlign(f, a),
                        }))
                      }
                    >
                      {a === "left" && <AlignLeft className="h-3.5 w-3.5" />}
                      {a === "center" && <AlignCenter className="h-3.5 w-3.5" />}
                      {a === "right" && <AlignRight className="h-3.5 w-3.5" />}
                    </Button>
                  ))}
                </div>
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

              <ElementStyleEditor
                title="Element colors"
                value={getFieldAppearanceStyle(localField)}
                onChange={(style) =>
                  setLocalField((f) => ({
                    ...f,
                    validation: setFieldAppearanceStyle(f, style),
                  }))
                }
              />

              {hasOptions && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label>
                      Options
                      {localField.field_type === "checkbox" && (
                        <span className="text-xs text-slate-400 font-normal ml-2">
                          (★ = must be checked)
                        </span>
                      )}
                    </Label>
                    {(localField.options ?? []).map((opt, i) => {
                      const requiredOpts = (
                        localField.validation?.required_options ?? []
                      ) as string[];
                      const isReqOpt = requiredOpts.includes(opt);
                      return (
                        <div key={i} className="flex gap-2">
                          <Input
                            value={opt}
                            onChange={(e) => {
                              const opts = [...(localField.options ?? [])];
                              const oldVal = opts[i];
                              opts[i] = e.target.value;
                              const rOpts = (
                                localField.validation?.required_options ?? []
                              ) as string[];
                              const newRopts = rOpts.map((r) =>
                                r === oldVal ? e.target.value : r,
                              );
                              setLocalField((f) => ({
                                ...f,
                                options: opts,
                                validation: {
                                  ...(f.validation ?? {}),
                                  required_options: newRopts,
                                },
                              }));
                            }}
                            placeholder={`Option ${i + 1}`}
                          />
                          {localField.field_type === "checkbox" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title={
                                isReqOpt
                                  ? "Remove required"
                                  : "Mark as required"
                              }
                              className={cn(
                                "h-10 w-10",
                                isReqOpt
                                  ? "text-amber-500"
                                  : "text-slate-300",
                              )}
                              onClick={() => {
                                const rOpts = (
                                  localField.validation?.required_options ?? []
                                ) as string[];
                                const newRopts = isReqOpt
                                  ? rOpts.filter((r) => r !== opt)
                                  : [...rOpts, opt];
                                setLocalField((f) => ({
                                  ...f,
                                  validation: {
                                    ...(f.validation ?? {}),
                                    required_options: newRopts,
                                  },
                                }));
                              }}
                            >
                              <Star
                                className="h-4 w-4"
                                fill={isReqOpt ? "currentColor" : "none"}
                              />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-red-500"
                            onClick={() => {
                              const opts = (
                                localField.options ?? []
                              ).filter((_, j) => j !== i);
                              const rOpts = (
                                localField.validation?.required_options ?? []
                              ) as string[];
                              const newRopts = rOpts.filter((r) => r !== opt);
                              setLocalField((f) => ({
                                ...f,
                                options: opts,
                                validation: {
                                  ...(f.validation ?? {}),
                                  required_options: newRopts,
                                },
                              }));
                            }}
                            disabled={(localField.options?.length ?? 0) <= 1}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
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


      {/* Predefined group preview (non-editing mode) */}
      {!editing && isPredefinedGroup && (
        <div className="mt-3 space-y-2">
          {getSubFields(field)
            .filter((sf) => sf.enabled !== false)
            .map((sf, i) => (
              <div key={sf.id} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  {sf.label && (
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {sf.label}
                      {sf.is_required && (
                        <span className="text-red-500 ml-0.5">*</span>
                      )}
                    </span>
                  )}
                  {sf.input_type === "dropdown" && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                      Dropdown
                    </Badge>
                  )}
                </div>
                <div className="h-8 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 flex items-center">
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {sf.placeholder || `Sub-field ${i + 1}`}
                  </span>
                </div>
              </div>
            ))}
          {getSubFields(field).filter((sf) => sf.enabled !== false).length === 0 && (
            <p className="text-xs text-slate-400 italic">No fields enabled</p>
          )}
        </div>
      )}

      {/* Group preview (non-editing mode) */}
      {!editing && isGroup && (
        <div className="mt-3 space-y-2">
          {getSubFields(field).map((sf, i) => (
            <div key={sf.id} className="flex flex-col gap-0.5">
              {sf.label && (
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  {sf.label}
                </span>
              )}
              <div className="h-8 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 flex items-center">
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {sf.placeholder || `Sub-field ${i + 1}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paragraph preview (non-editing mode) */}
      {!editing && isParagraph && field.label && (
        <div
          className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: field.label }}
        />
      )}

      {/* Boolean preview (non-editing mode) */}
      {!editing && isBoolean && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(field.options ?? ["Yes", "No"]).map((opt, i) => (
            <div
              key={i}
              className={cn(
                "rounded-lg border-2 py-3 flex items-center justify-center text-sm font-medium",
                i === 0
                  ? "border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:bg-emerald-950/30"
                  : "border-slate-200 text-slate-500 bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:bg-slate-800/50",
              )}
            >
              {opt || (i === 0 ? "Yes" : "No")}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
