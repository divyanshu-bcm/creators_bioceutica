"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type {
  FormFull,
  FieldType,
  FormField,
  Product,
  FormProductSelection,
  ProductBillingType,
  WelcomePage,
  WelcomeTerm,
  ThankYouPage,
  ElementColorStyle,
  FormUiStyles,
  StepElementStyles,
} from "@/lib/types";
import { defaultWelcomePage, defaultThankYouPage } from "@/lib/types";
import { useFormBuilder } from "@/hooks/useFormBuilder";
import { FieldToolbar } from "./FieldToolbar";
import { FieldCard } from "./FieldCard";
import { ElementStyleEditor } from "./ElementStyleEditor";
import { RichTextEditor } from "./RichTextEditor";
import { ImageLibraryModal } from "./ImageLibraryModal";
import { FormRenderer } from "@/components/renderer/FormRenderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  RefreshCw,
  ImageIcon,
  Images,
  Upload,
  Lock,
  GripVertical,
  AlignLeft,
  ShieldCheck,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FormBuilderProps {
  form: FormFull;
  products: Product[];
  userRole?: "admin" | "user";
}

export function FormBuilder({ form, products, userRole }: FormBuilderProps) {
  const router = useRouter();
  const initialHasDraftChanges = form.steps.some((step) => {
    if (step.is_draft || step.pending_delete) return true;
    return step.fields.some((field) => field.is_draft || field.pending_delete);
  });
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
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(
    form.is_published ? initialHasDraftChanges : false,
  );
  const [publicUrl, setPublicUrl] = useState<string | null>(
    form.is_published && form.slug ? `/f/${form.slug}` : null,
  );

  // Upgrade relative path → full URL after mount (avoids SSR/client mismatch)
  useEffect(() => {
    if (form.is_published && form.slug) {
      setPublicUrl(`${window.location.origin}/f/${form.slug}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [publishLoading, setPublishLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Delete form dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [stepDeleteDialogOpen, setStepDeleteDialogOpen] = useState(false);
  const [stepToDeleteId, setStepToDeleteId] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [contentRefreshing, setContentRefreshing] = useState(false);
  const [addingFieldType, setAddingFieldType] = useState<FieldType | null>(
    null,
  );
  const [duplicatingStepId, setDuplicatingStepId] = useState<string | null>(
    null,
  );
  const [duplicatingFieldId, setDuplicatingFieldId] = useState<string | null>(
    null,
  );

  // Preview
  const [previewOpen, setPreviewOpen] = useState(false);

  // Welcome page
  const [welcomePage, setWelcomePage] = useState<WelcomePage>(
    form.welcome_page ?? defaultWelcomePage(),
  );
  const [activeView, setActiveView] = useState<"step" | "welcome" | "thankyou">(
    "step",
  );

  // Thank you page
  const [thankYouPage, setThankYouPage] = useState<ThankYouPage>(
    form.thank_you_page ?? defaultThankYouPage(),
  );

  // Webhook
  const [webhookUrl, setWebhookUrl] = useState(form.webhook_url ?? "");
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookTesting, setWebhookTesting] = useState(false);
  const [webhookResult, setWebhookResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Linked products (per form)
  const [formProducts, setFormProducts] = useState<FormProductSelection[]>(
    Array.isArray(form.form_products) ? form.form_products : [],
  );
  const [productsSaving, setProductsSaving] = useState(false);
  const [productsResult, setProductsResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const activeStep = builder.steps.find((s) => s.id === builder.activeStepId);
  const productMap = new Map(products.map((p) => [p.product_id, p]));
  const visibleSteps = [...builder.steps]
    .filter((step) => !step.pending_delete)
    .sort((a, b) => a.step_order - b.step_order);
  const stepNumberById = new Map(
    visibleSteps.map((step, index) => [step.id, index + 1]),
  );

  useEffect(() => {
    setIsPublished(form.is_published);
    setHasUnpublishedChanges(
      form.is_published ? initialHasDraftChanges : false,
    );

    if (contentRefreshing) {
      setContentRefreshing(false);
      setPublishLoading(false);
      setResetLoading(false);
    }
  }, [
    form.is_published,
    form.updated_at,
    initialHasDraftChanges,
    contentRefreshing,
  ]);

  // ─── Form title save ─────────────────────────────────────────────────────
  async function saveTitle() {
    await fetch(`/api/forms/${form.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: formTitle, description: form.description }),
    });
    setEditingTitle(false);
    if (isPublished) setHasUnpublishedChanges(true);
  }

  async function saveWebhookUrl() {
    const normalizedWebhookUrl = webhookUrl.trim();

    if (normalizedWebhookUrl) {
      try {
        new URL(normalizedWebhookUrl);
      } catch {
        setWebhookResult({
          type: "error",
          message: "Please enter a valid webhook URL",
        });
        return false;
      }
    }

    setWebhookSaving(true);
    const res = await fetch(`/api/forms/${form.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhook_url: normalizedWebhookUrl ? normalizedWebhookUrl : null,
      }),
    });
    setWebhookSaving(false);

    if (!res.ok) {
      const response = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setWebhookResult({
        type: "error",
        message: response?.error ?? "Failed to save webhook URL",
      });
      return false;
    }

    setWebhookUrl(normalizedWebhookUrl);
    setWebhookResult({
      type: "success",
      message: "Webhook URL saved",
    });
    if (isPublished) setHasUnpublishedChanges(true);
    return true;
  }

  async function handleTestWebhook() {
    setWebhookResult(null);
    const saveOk = await saveWebhookUrl();
    if (!saveOk) return;

    if (!webhookUrl.trim()) {
      setWebhookResult({
        type: "error",
        message: "Configure a webhook URL first",
      });
      return;
    }

    setWebhookTesting(true);
    const res = await fetch(`/api/forms/${form.id}/webhook-test`, {
      method: "POST",
    });
    const response = (await res.json().catch(() => null)) as {
      status?: number;
      message?: string;
      error?: string;
    } | null;
    setWebhookTesting(false);

    if (!res.ok) {
      const statusSuffix =
        typeof response?.status === "number"
          ? ` (HTTP ${response.status})`
          : "";
      setWebhookResult({
        type: "error",
        message: `${response?.error ?? "Webhook test failed"}${statusSuffix}`,
      });
      return;
    }

    const statusSuffix =
      typeof response?.status === "number" ? ` (HTTP ${response.status})` : "";
    setWebhookResult({
      type: "success",
      message: `${response?.message ?? "Webhook test sent successfully"}${statusSuffix}`,
    });
  }

  async function saveFormProducts(nextFormProducts: FormProductSelection[]) {
    setProductsSaving(true);
    const res = await fetch(`/api/forms/${form.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ form_products: nextFormProducts }),
    });
    setProductsSaving(false);

    if (!res.ok) {
      const response = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setProductsResult({
        type: "error",
        message: response?.error ?? "Failed to save form products",
      });
      return false;
    }

    setProductsResult({
      type: "success",
      message: "Products saved",
    });
    if (isPublished) setHasUnpublishedChanges(true);
    return true;
  }

  function addLinkedProduct(productId: string) {
    if (!productId) return;
    if (formProducts.some((item) => item.product_id === productId)) return;

    setProductsResult(null);
    setFormProducts((prev) => [
      ...prev,
      {
        product_id: productId,
        quantity: 1,
        billing_type: "paid",
      },
    ]);
  }

  function updateLinkedProduct(
    productId: string,
    patch: Partial<FormProductSelection>,
  ) {
    setProductsResult(null);
    setFormProducts((prev) =>
      prev.map((item) =>
        item.product_id === productId ? { ...item, ...patch } : item,
      ),
    );
  }

  function removeLinkedProduct(productId: string) {
    setProductsResult(null);
    setFormProducts((prev) =>
      prev.filter((item) => item.product_id !== productId),
    );
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
      setHasUnpublishedChanges(false);
      setContentRefreshing(true);
      router.refresh(); // reload server components so promoted field IDs are fresh
    }
  }

  async function handleUnpublish() {
    setPublishLoading(true);
    await fetch(`/api/forms/${form.id}/publish`, { method: "DELETE" });
    setPublishLoading(false);
    setIsPublished(false);
    setHasUnpublishedChanges(false);
  }

  async function handleResetChanges() {
    setResetLoading(true);
    const res = await fetch(`/api/forms/${form.id}/reset`, {
      method: "POST",
    });
    if (!res.ok) {
      setResetLoading(false);
      return;
    }
    setHasUnpublishedChanges(false);
    setContentRefreshing(true);
    router.refresh();
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

  // ─── Thank you page ─────────────────────────────────────────────────────
  async function saveThankYouPage(tp: ThankYouPage) {
    await fetch(`/api/forms/${form.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thank_you_page: tp }),
    });
    if (isPublished) setHasUnpublishedChanges(true);
  }

  function handleThankYouPageChange(updated: ThankYouPage) {
    setThankYouPage(updated);
    saveThankYouPage(updated);
  }

  // ─── Welcome page ─────────────────────────────────────────────────────────
  async function saveWelcomePage(wp: WelcomePage) {
    await fetch(`/api/forms/${form.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ welcome_page: wp }),
    });
    if (isPublished) setHasUnpublishedChanges(true);
  }

  function handleToggleWelcomePage() {
    const updated = { ...welcomePage, enabled: !welcomePage.enabled };
    setWelcomePage(updated);
    saveWelcomePage(updated);
    if (!welcomePage.enabled) {
      setActiveView("welcome");
    } else {
      setActiveView("step");
    }
  }

  function handleWelcomePageChange(updated: WelcomePage) {
    setWelcomePage(updated);
    saveWelcomePage(updated);
  }

  function upsertUiStyles(next: FormUiStyles | undefined) {
    handleWelcomePageChange({ ...welcomePage, ui_styles: next });
  }

  function updateStartButtonStyle(style: ElementColorStyle | undefined) {
    const current = { ...(welcomePage.ui_styles ?? {}) };
    if (style) {
      current.start_button = style;
    } else {
      delete current.start_button;
    }
    upsertUiStyles(Object.keys(current).length ? current : undefined);
  }

  function updateNavigationButtonStyle(
    button: keyof StepElementStyles,
    style: ElementColorStyle | undefined,
  ) {
    const current = { ...(welcomePage.ui_styles ?? {}) };
    const currentNavStyles = { ...(current.navigation_buttons ?? {}) };

    if (style) {
      currentNavStyles[button] = style;
    } else {
      delete currentNavStyles[button];
    }

    if (Object.keys(currentNavStyles).length) {
      current.navigation_buttons = currentNavStyles;
    } else {
      delete current.navigation_buttons;
    }

    upsertUiStyles(Object.keys(current).length ? current : undefined);
  }

  const navigationButtonStyles =
    welcomePage.ui_styles?.navigation_buttons ?? {};

  // ─── Field operations forwarded to hook ──────────────────────────────────
  async function handleAddField(type: FieldType) {
    if (!builder.activeStepId) return;
    setAddingFieldType(type);
    await builder.addField(form.id, builder.activeStepId, type);
    setAddingFieldType(null);
    if (isPublished) setHasUnpublishedChanges(true);
  }

  function handleUpdateField(fieldId: string, updates: Partial<FormField>) {
    builder.updateField(form.id, fieldId, updates);
    if (isPublished) setHasUnpublishedChanges(true);
  }

  function handleDeleteField(fieldId: string) {
    if (!activeStep) return;
    builder.deleteField(form.id, activeStep.id, fieldId);
    if (isPublished) setHasUnpublishedChanges(true);
  }

  async function handleDuplicateField(fieldId: string) {
    if (!activeStep) return;
    setDuplicatingFieldId(fieldId);
    await builder.duplicateField(form.id, activeStep.id, fieldId);
    setDuplicatingFieldId(null);
    if (isPublished) setHasUnpublishedChanges(true);
  }

  function handleRestoreField(fieldId: string) {
    if (!activeStep) return;
    builder.restoreField(form.id, activeStep.id, fieldId);
  }

  function handleRestoreStep(stepId: string) {
    builder.restoreStep(form.id, stepId);
  }

  function handleMoveField(fieldId: string, dir: "up" | "down") {
    if (!activeStep) return;
    builder.moveField(form.id, activeStep.id, fieldId, dir);
    if (isPublished) setHasUnpublishedChanges(true);
  }

  // ─── Step operations ─────────────────────────────────────────────────────
  function handleAddStep() {
    builder.addStep(form.id);
    if (isPublished) setHasUnpublishedChanges(true);
  }

  function handleDeleteStep(stepId: string) {
    setStepToDeleteId(stepId);
    setStepDeleteDialogOpen(true);
  }

  async function handleDuplicateStep(stepId: string) {
    setDuplicatingStepId(stepId);
    await builder.duplicateStep(form.id, stepId);
    setDuplicatingStepId(null);
    if (isPublished) setHasUnpublishedChanges(true);
  }

  function confirmDeleteStep() {
    if (!stepToDeleteId) return;
    builder.deleteStep(form.id, stepToDeleteId);
    if (isPublished) setHasUnpublishedChanges(true);
    setStepDeleteDialogOpen(false);
    setStepToDeleteId(null);
  }

  function handleRenameStep(stepId: string, title: string) {
    builder.renameStep(form.id, stepId, title);
    if (isPublished) setHasUnpublishedChanges(true);
  }

  function handleReorderSteps(orderedStepIds: string[]) {
    builder.reorderSteps(form.id, orderedStepIds);
    if (isPublished) setHasUnpublishedChanges(true);
  }

  // ─── Drag-and-drop ───────────────────────────────────────────────────────
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  // Only allow drag when pointer is down on the grip handle
  const canDragRef = useRef<string | null>(null);

  function handleDragStart(e: React.DragEvent, fieldId: string) {
    if (canDragRef.current !== fieldId) {
      e.preventDefault();
      return;
    }
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
    if (isPublished) setHasUnpublishedChanges(true);
    setDragId(null);
    setDragOverId(null);
  }

  function handleDragEnd() {
    setDragId(null);
    setDragOverId(null);
    canDragRef.current = null;
  }

  // ─── Step tab drag-and-drop ──────────────────────────────────────────────
  const [stepDragId, setStepDragId] = useState<string | null>(null);
  const [stepDragOverId, setStepDragOverId] = useState<string | null>(null);
  const canStepDragRef = useRef<string | null>(null);

  function handleStepDragStart(e: React.DragEvent, stepId: string) {
    if (canStepDragRef.current !== stepId) {
      e.preventDefault();
      return;
    }
    setStepDragId(stepId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleStepDragOver(e: React.DragEvent, stepId: string) {
    e.preventDefault();
    if (stepId !== stepDragId) setStepDragOverId(stepId);
  }

  function handleStepDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!stepDragId || stepDragId === targetId) {
      setStepDragId(null);
      setStepDragOverId(null);
      return;
    }

    const ordered = [...visibleSteps];
    const fromIdx = ordered.findIndex((step) => step.id === stepDragId);
    const toIdx = ordered.findIndex((step) => step.id === targetId);
    if (fromIdx === -1 || toIdx === -1) {
      setStepDragId(null);
      setStepDragOverId(null);
      return;
    }

    const [moved] = ordered.splice(fromIdx, 1);
    ordered.splice(toIdx, 0, moved);
    handleReorderSteps(ordered.map((step) => step.id));
    setStepDragId(null);
    setStepDragOverId(null);
  }

  function handleStepDragEnd() {
    setStepDragId(null);
    setStepDragOverId(null);
    canStepDragRef.current = null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
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
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formTitle}
              </span>
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

            {isPublished && hasUnpublishedChanges && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetChanges}
                disabled={publishLoading || resetLoading}
                className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
              >
                {resetLoading ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : null}
                Reset Changes
              </Button>
            )}

            {isPublished && hasUnpublishedChanges && (
              <Button
                size="sm"
                onClick={handlePublish}
                disabled={publishLoading}
                className="bg-amber-500 hover:bg-amber-600 text-white border-0"
              >
                {publishLoading ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                )}
                Publish Update
              </Button>
            )}

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
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {/* Welcome tab */}
            {welcomePage.enabled && (
              <button
                onClick={() => setActiveView("welcome")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors border shrink-0",
                  activeView === "welcome"
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-white text-violet-600 border-violet-300 hover:bg-violet-50 dark:bg-slate-800 dark:text-violet-400 dark:border-violet-700 dark:hover:bg-slate-700",
                )}
              >
                ✦ Welcome
              </button>
            )}
            {welcomePage.enabled && (
              <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500 text-xs px-1 shrink-0">
                <span aria-hidden>|</span>
                <Lock className="h-3 w-3" />
              </span>
            )}
            {builder.steps.map((step) => (
              <div
                key={step.id}
                className={cn(
                  "flex items-center shrink-0",
                  stepDragOverId === step.id &&
                    stepDragId !== step.id &&
                    !step.pending_delete &&
                    "ring-2 ring-slate-400 rounded-md",
                )}
                onDragOver={(e) =>
                  !step.pending_delete && handleStepDragOver(e, step.id)
                }
                onDrop={(e) =>
                  !step.pending_delete && handleStepDrop(e, step.id)
                }
              >
                {editingStepId === step.id ? (
                  <input
                    autoFocus
                    value={stepTitleInput}
                    onChange={(e) => setStepTitleInput(e.target.value)}
                    onBlur={() => {
                      handleRenameStep(step.id, stepTitleInput || step.title);
                      setEditingStepId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleRenameStep(step.id, stepTitleInput || step.title);
                        setEditingStepId(null);
                      }
                    }}
                    className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded px-2 py-1 text-sm h-9 outline-none focus:ring-2 focus:ring-slate-400"
                    style={{
                      width: `${Math.max(60, stepTitleInput.length * 8)}px`,
                    }}
                  />
                ) : step.pending_delete ? (
                  /* Pending-delete step — grayed out, not clickable, with restore */
                  <span className="flex items-center gap-1">
                    <span className="px-3 py-1.5 rounded-md text-sm font-medium border line-through text-slate-400 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800/40 dark:text-red-400/60">
                      {step.title}
                    </span>
                    <button
                      className="ml-1 text-xs text-red-400 hover:text-green-600 transition-colors border border-red-200 dark:border-red-800/40 rounded px-1.5 py-0.5"
                      onClick={() => handleRestoreStep(step.id)}
                      title="Undo step deletion"
                    >
                      Undo
                    </button>
                  </span>
                ) : (
                  <div className="flex items-center">
                    <button
                      type="button"
                      draggable
                      onPointerDown={() => {
                        canStepDragRef.current = step.id;
                      }}
                      onPointerUp={() => {
                        canStepDragRef.current = null;
                      }}
                      onDragStart={(e) => handleStepDragStart(e, step.id)}
                      onDragEnd={handleStepDragEnd}
                      className="h-8 w-6 inline-flex items-center justify-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-grab active:cursor-grabbing"
                      title="Drag to reorder"
                      aria-label="Drag step to reorder"
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        builder.setActiveStep(step.id);
                        setActiveView("step");
                      }}
                      onDoubleClick={() => {
                        setEditingStepId(step.id);
                        setStepTitleInput(step.title);
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-sm font-medium transition-colors border",
                        step.id === builder.activeStepId &&
                          activeView === "step"
                          ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
                          : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700",
                      )}
                    >
                      {(stepNumberById.get(step.id) ?? "•") + ". " + step.title}
                    </button>
                  </div>
                )}
                {!step.pending_delete && (
                  <>
                    <button
                      className="ml-1 text-slate-400 hover:text-slate-700 transition-colors"
                      onClick={() => {
                        void handleDuplicateStep(step.id);
                      }}
                      title="Duplicate step"
                      disabled={duplicatingStepId === step.id}
                    >
                      {duplicatingStepId === step.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                    {builder.steps.filter((s) => !s.pending_delete).length >
                      1 && (
                      <button
                        className="ml-1 text-slate-400 hover:text-red-500 transition-colors"
                        onClick={() => handleDeleteStep(step.id)}
                        title="Delete step"
                      >
                        ×
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddStep}
              className="shrink-0"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Step
            </Button>
            <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500 text-xs px-1 shrink-0">
              <span aria-hidden>|</span>
              <Lock className="h-3 w-3" />
            </span>
            {/* Thank You tab — always visible, non-removable */}
            <button
              onClick={() => setActiveView("thankyou")}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors border shrink-0",
                activeView === "thankyou"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:bg-slate-800 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-slate-700",
              )}
            >
              ✓ Thank You
            </button>
          </div>

          {/* Step hint */}
          {builder.steps.length > 1 && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
              Double-click a step tab to rename it • Hold and drag a step tab to
              reorder
            </p>
          )}

          {/* Field canvas, Welcome Page editor, or Thank You editor */}
          {activeView === "welcome" ? (
            <WelcomePageEditor
              welcomePage={welcomePage}
              stepCount={visibleSteps.length}
              onChange={handleWelcomePageChange}
              onStartButtonStyleChange={updateStartButtonStyle}
            />
          ) : activeView === "thankyou" ? (
            <ThankYouPageEditor
              thankYouPage={thankYouPage}
              onChange={handleThankYouPageChange}
            />
          ) : (
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
                  onDragStart={(e) => handleDragStart(e, field.id)}
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
                    isDuplicating={duplicatingFieldId === field.id}
                    isFirst={idx === 0}
                    isLast={idx === activeStep.fields.length - 1}
                    onUpdate={handleUpdateField}
                    onDelete={handleDeleteField}
                    onDuplicate={(id) => {
                      void handleDuplicateField(id);
                    }}
                    onRestore={handleRestoreField}
                    onMove={handleMoveField}
                    onDragHandlePointerDown={() => {
                      canDragRef.current = field.id;
                    }}
                    onDragHandlePointerUp={() => {
                      canDragRef.current = null;
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Toolbar */}
        <div className="w-52 shrink-0 self-start sticky top-0 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
          {activeView === "step" && (
            <FieldToolbar onAdd={handleAddField} addingType={addingFieldType} />
          )}

          {/* Welcome Page toggle — hidden when editing Thank You */}
          {activeView !== "thankyou" && (
            <div
              className={cn(
                "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4",
                activeView === "step" ? "mt-4" : "",
              )}
            >
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">
                Welcome Page
              </p>
              <Button
                variant={welcomePage.enabled ? "destructive" : "outline"}
                size="sm"
                className="w-full"
                onClick={handleToggleWelcomePage}
              >
                {welcomePage.enabled
                  ? "Remove Welcome Page"
                  : "Add Welcome Page"}
              </Button>
              {welcomePage.enabled && activeView !== "welcome" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-1 text-violet-600 hover:text-violet-700"
                  onClick={() => setActiveView("welcome")}
                >
                  Edit Welcome Page
                </Button>
              )}
            </div>
          )}

          <div className="mt-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">
              Webhook
            </p>
            <div className="space-y-2">
              <Input
                value={webhookUrl}
                onChange={(e) => {
                  setWebhookUrl(e.target.value);
                  setWebhookResult(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void saveWebhookUrl();
                  }
                }}
                placeholder="https://your-endpoint.com/webhook"
                className="h-8 text-xs"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => void saveWebhookUrl()}
                  disabled={webhookSaving || webhookTesting}
                >
                  {webhookSaving ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : null}
                  Save
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => void handleTestWebhook()}
                  disabled={webhookSaving || webhookTesting}
                >
                  {webhookTesting ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : null}
                  Test
                </Button>
              </div>
              {webhookResult && (
                <p
                  className={cn(
                    "text-[11px] leading-4",
                    webhookResult.type === "success"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400",
                  )}
                >
                  {webhookResult.message}
                </p>
              )}
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Optional. If configured, every submission for this form is sent
                to this URL.
              </p>
            </div>
          </div>

          <div className="mt-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">
              Products
            </p>

            {products.length === 0 ? (
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                No products found. Add products in Dashboard → Products first.
              </p>
            ) : (
              <div className="space-y-2">
                <Select onValueChange={addLinkedProduct}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Add product to this form" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem
                        key={product.product_id}
                        value={product.product_id}
                        disabled={formProducts.some(
                          (item) => item.product_id === product.product_id,
                        )}
                      >
                        {product.product_name || "Untitled product"}
                        {product.sku ? ` (${product.sku})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {formProducts.length > 0 ? (
                  <div className="space-y-2">
                    {formProducts.map((item) => {
                      const product = productMap.get(item.product_id);
                      return (
                        <div
                          key={item.product_id}
                          className="border border-slate-200 dark:border-slate-700 rounded-md p-2"
                        >
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-200 mb-2 truncate">
                            {product?.product_name || "Unknown product"}
                            {product?.sku ? ` (${product.sku})` : ""}
                          </p>
                          <div className="flex gap-2 items-center">
                            <Input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => {
                                const qty = Number(e.target.value);
                                updateLinkedProduct(item.product_id, {
                                  quantity:
                                    Number.isFinite(qty) && qty > 0 ? qty : 1,
                                });
                              }}
                              className="h-8 text-xs"
                            />
                            <Select
                              value={item.billing_type}
                              onValueChange={(value) =>
                                updateLinkedProduct(item.product_id, {
                                  billing_type: value as ProductBillingType,
                                })
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="free">Free</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600"
                              onClick={() =>
                                removeLinkedProduct(item.product_id)
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    No products linked to this form yet.
                  </p>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => void saveFormProducts(formProducts)}
                  disabled={productsSaving}
                >
                  {productsSaving ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : null}
                  Save Products
                </Button>

                {productsResult && (
                  <p
                    className={cn(
                      "text-[11px] leading-4",
                      productsResult.type === "success"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400",
                    )}
                  >
                    {productsResult.message}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">
              Form Button Colors
            </p>
            <div className="space-y-3">
              <ElementStyleEditor
                title="Previous button"
                value={navigationButtonStyles.prev_button}
                onChange={(style) =>
                  updateNavigationButtonStyle("prev_button", style)
                }
              />
              <ElementStyleEditor
                title="Next button"
                value={navigationButtonStyles.next_button}
                onChange={(style) =>
                  updateNavigationButtonStyle("next_button", style)
                }
              />
              <ElementStyleEditor
                title="Submit button"
                value={navigationButtonStyles.submit_button}
                onChange={(style) =>
                  updateNavigationButtonStyle("submit_button", style)
                }
              />
            </div>
          </div>

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
            {userRole === "admin" && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() =>
                  router.push(`/dashboard/forms/${form.id}/activity`)
                }
              >
                <History className="h-3.5 w-3.5 mr-1.5" />
                View Activity
              </Button>
            )}
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
                welcome_page: welcomePage,
                thank_you_page: thankYouPage,
              }}
              previewMode
            />
          </div>
        </div>
      )}

      {/* Refresh overlay after publish/reset */}
      {contentRefreshing && (
        <div className="absolute inset-0 z-40 bg-slate-900/15 backdrop-blur-[1px] flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 shadow">
            <Loader2 className="h-4 w-4 animate-spin" />
            Refreshing form…
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

      {/* Delete step dialog */}
      <Dialog
        open={stepDeleteDialogOpen}
        onOpenChange={(open) => {
          setStepDeleteDialogOpen(open);
          if (!open) setStepToDeleteId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Step</DialogTitle>
            <DialogDescription>
              {`Are you sure you want to delete ${
                builder.steps.find((s) => s.id === stepToDeleteId)?.title ??
                "this step"
              }? You can undo this before publish.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setStepDeleteDialogOpen(false);
                setStepToDeleteId(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteStep}>
              Delete Step
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Welcome Page Editor
// ─────────────────────────────────────────────────────────────────────────────

interface WelcomePageEditorProps {
  welcomePage: WelcomePage;
  stepCount: number;
  onChange: (updated: WelcomePage) => void;
  onStartButtonStyleChange: (style: ElementColorStyle | undefined) => void;
}

function WelcomePageEditor({
  welcomePage: wp,
  stepCount,
  onChange,
  onStartButtonStyleChange,
}: WelcomePageEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    setUploading(false);
    if (!res.ok) return;
    const { url } = await res.json();
    onChange({ ...wp, logo_url: url, logo_alt: file.name });
    // Reset so the same file can be re-uploaded if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeLogo() {
    onChange({ ...wp, logo_url: null, logo_alt: null });
  }

  function selectLogoFromLibrary(url: string) {
    onChange({ ...wp, logo_url: url, logo_alt: wp.logo_alt ?? "Logo" });
  }

  function addTerm() {
    const newTerm: WelcomeTerm = {
      id: crypto.randomUUID(),
      label: "",
      required: true,
    };
    onChange({ ...wp, terms: [...wp.terms, newTerm] });
  }

  function updateTerm(id: string, patch: Partial<WelcomeTerm>) {
    onChange({
      ...wp,
      terms: wp.terms.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    });
  }

  function removeTerm(id: string) {
    onChange({ ...wp, terms: wp.terms.filter((t) => t.id !== id) });
  }

  return (
    <div className="space-y-6">
      {/* ── Logo section ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <ImageIcon className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Logo
          </h3>
        </div>
        {wp.logo_url ? (
          <div className="flex flex-col items-center gap-3">
            <img
              src={wp.logo_url}
              alt={wp.logo_alt ?? "Logo"}
              className="max-h-32 max-w-full object-contain rounded-lg border border-slate-200 dark:border-slate-700 p-2 bg-slate-50 dark:bg-slate-800"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5 mr-1" />
                )}
                Replace
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLibraryOpen(true)}
                disabled={uploading}
              >
                <Images className="h-3.5 w-3.5 mr-1" />
                From Library
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={removeLogo}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg py-8 flex flex-col items-center gap-2 text-slate-400 hover:border-slate-300 hover:text-slate-500 transition-colors"
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <ImageIcon className="h-6 w-6" />
            )}
            <span className="text-sm">Add a logo</span>
          </button>
        )}
        {!wp.logo_url && (
          <div className="mt-3 flex gap-2">
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
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleLogoUpload}
        />
        <ImageLibraryModal
          open={libraryOpen}
          onClose={() => setLibraryOpen(false)}
          onSelect={selectLogoFromLibrary}
        />
      </div>

      {/* ── Welcome text section ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlignLeft className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Welcome Text
          </h3>
        </div>
        <RichTextEditor
          value={wp.text}
          onChange={(html) => onChange({ ...wp, text: html })}
          placeholder="Write a welcome message for your respondents…"
          minHeight={120}
        />
        <p className="text-xs text-slate-400 mt-1.5">
          ({stepCount} {stepCount === 1 ? "step" : "steps"})
        </p>
        <p className="text-xs text-slate-400 mt-1.5">
          This text is displayed to respondents before they start the form.
        </p>
        <div className="mt-3">
          <ElementStyleEditor
            title="Welcome text colors"
            value={wp.ui_styles?.welcome_text}
            onChange={(style) =>
              onChange({
                ...wp,
                ui_styles: {
                  ...(wp.ui_styles ?? {}),
                  welcome_text: style,
                },
              })
            }
          />
        </div>
      </div>

      {/* ── T&C section ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Terms &amp; Conditions
            </h3>
          </div>
          <button
            onClick={() =>
              onChange({ ...wp, terms_enabled: !wp.terms_enabled })
            }
            className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none",
              wp.terms_enabled
                ? "bg-violet-600"
                : "bg-slate-300 dark:bg-slate-600",
            )}
            aria-label="Toggle T&C section"
          >
            <span
              className={cn(
                "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
                wp.terms_enabled ? "translate-x-5" : "translate-x-0.5",
              )}
            />
          </button>
        </div>

        {wp.terms_enabled ? (
          <div className="space-y-3">
            {wp.terms.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                No terms yet — click &ldquo;Add T&amp;C&rdquo; below
              </p>
            )}
            {wp.terms.map((term, idx) => (
              <div key={term.id} className="flex gap-2 items-start">
                <span className="text-xs text-slate-400 mt-2 w-4 shrink-0">
                  {idx + 1}.
                </span>
                <Textarea
                  value={term.label}
                  onChange={(e) =>
                    updateTerm(term.id, { label: e.target.value })
                  }
                  placeholder="e.g. I agree to the Terms of Service"
                  className="resize-none text-sm flex-1"
                  rows={2}
                />
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => removeTerm(term.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors p-1"
                    title="Remove"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <label
                    className="flex items-center gap-1 cursor-pointer"
                    title="Required"
                  >
                    <input
                      type="checkbox"
                      checked={term.required}
                      onChange={(e) =>
                        updateTerm(term.id, { required: e.target.checked })
                      }
                      className="h-3.5 w-3.5 rounded"
                    />
                    <span className="text-xs text-slate-400">Req.</span>
                  </label>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={addTerm}
              className="w-full mt-1"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add T&amp;C
            </Button>
            <ElementStyleEditor
              title="T&C element colors"
              value={wp.ui_styles?.tnc_element}
              onChange={(style) =>
                onChange({
                  ...wp,
                  ui_styles: {
                    ...(wp.ui_styles ?? {}),
                    tnc_element: style,
                  },
                })
              }
            />
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            Enable to add T&amp;C checkboxes that respondents must agree to
            before proceeding.
          </p>
        )}
      </div>

      {/* ── Start button label ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Start Button Label
          </h3>
        </div>
        <Input
          value={wp.button_label ?? "Start"}
          onChange={(e) => onChange({ ...wp, button_label: e.target.value })}
          placeholder="Start"
          className="text-sm"
        />
        <p className="text-xs text-slate-400 mt-1.5">
          The text shown on the continue button. Defaults to
          &ldquo;Start&rdquo;.
        </p>
        <div className="mt-3">
          <ElementStyleEditor
            title="Start button colors"
            value={wp.ui_styles?.start_button}
            onChange={onStartButtonStyleChange}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Thank You Page Editor
// ─────────────────────────────────────────────────────────────────────────────

interface ThankYouPageEditorProps {
  thankYouPage: ThankYouPage;
  onChange: (updated: ThankYouPage) => void;
}

function ThankYouPageEditor({
  thankYouPage: tp,
  onChange,
}: ThankYouPageEditorProps) {
  return (
    <div className="space-y-6">
      {/* ── Title ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Check className="h-4 w-4 text-emerald-500" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Thank You Title
          </h3>
        </div>
        <Input
          value={tp.title}
          onChange={(e) => onChange({ ...tp, title: e.target.value })}
          placeholder="Welcome to Bioceutica Milano. Looking forward to work ✨"
          className="text-sm"
        />
        <p className="text-xs text-slate-400 mt-1.5">
          The heading shown after the form is submitted.
        </p>
      </div>

      {/* ── Body text ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlignLeft className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Thank You Message
          </h3>
        </div>
        <Textarea
          value={tp.text}
          onChange={(e) => onChange({ ...tp, text: e.target.value })}
          placeholder="Your response has been received and will be reviewed shortly."
          className="text-sm resize-none"
          rows={3}
        />
        <p className="text-xs text-slate-400 mt-1.5">
          The supporting text shown below the title.
        </p>
      </div>

      {/* ── Preview note ── */}
      <p className="text-xs text-slate-400 text-center">
        This page is shown after the respondent submits the form. It cannot be
        removed.
      </p>
    </div>
  );
}
