"use client";

import { useState, useCallback } from "react";
import type { FormField, FormStep, FieldType } from "@/lib/types";
import { PREDEFINED_TEMPLATES } from "@/lib/predefined-groups";
import type { PredefinedGroupType } from "@/lib/predefined-groups";

interface BuilderState {
  steps: (FormStep & { fields: FormField[] })[];
  activeStepId: string;
}

function isAutoStepTitle(title: string | null | undefined): boolean {
  return /^Step\s+\d+$/i.test((title ?? "").trim());
}

function normalizeWorkingSteps(
  steps: (FormStep & { fields: FormField[] })[],
): (FormStep & { fields: FormField[] })[] {
  const active = steps
    .filter((step) => !step.pending_delete)
    .sort((a, b) => a.step_order - b.step_order)
    .map((step, index) => ({
      ...step,
      step_order: index,
      title: isAutoStepTitle(step.title) ? `Step ${index + 1}` : step.title,
    }));

  const pending = steps
    .filter((step) => step.pending_delete)
    .sort((a, b) => a.step_order - b.step_order);

  return [...active, ...pending];
}

export function useFormBuilder(initial: BuilderState) {
  const [state, setState] = useState<BuilderState>(initial);
  const [saving, setSaving] = useState(false);

  const setActiveStep = useCallback((stepId: string) => {
    setState((s) => ({ ...s, activeStepId: stepId }));
  }, []);

  // ─── Steps ───────────────────────────────────────────────────────────────

  const addStep = useCallback(
    async (formId: string) => {
      const activeSteps = state.steps.filter((s) => !s.pending_delete);
      const maxOrder = Math.max(...activeSteps.map((s) => s.step_order), -1);
      const res = await fetch(`/api/forms/${formId}/steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Step ${activeSteps.length + 1}`,
          step_order: maxOrder + 1,
        }),
      });
      if (!res.ok) return;
      const newStep: FormStep = await res.json();
      setState((s) => ({
        steps: normalizeWorkingSteps([...s.steps, { ...newStep, fields: [] }]),
        activeStepId: newStep.id,
      }));
    },
    [state.steps],
  );

  const renameStep = useCallback(
    async (formId: string, stepId: string, title: string) => {
      setState((s) => ({
        ...s,
        steps: s.steps.map((st) => (st.id === stepId ? { ...st, title } : st)),
      }));
      await fetch(`/api/forms/${formId}/steps`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: stepId, title }),
      });
    },
    [],
  );

  const deleteStep = useCallback(
    async (formId: string, stepId: string) => {
      // Don't call API if there's only one non-pending-delete step
      const workingCount = state.steps.filter((s) => !s.pending_delete).length;
      if (workingCount <= 1) return;
      const res = await fetch(`/api/forms/${formId}/steps?stepId=${stepId}`, {
        method: "DELETE",
      });
      if (!res.ok) return;
      const result: { deleted?: true; pending_delete?: true } =
        await res.json();

      if (result.deleted) {
        const next = state.steps.filter((st) => st.id !== stepId);
        const normalized = normalizeWorkingSteps(next);

        setState((s) => {
          const remaining = normalized;
          const nextActive =
            s.activeStepId === stepId
              ? (remaining.find((st) => !st.pending_delete)?.id ??
                remaining[0]?.id ??
                "")
              : s.activeStepId;
          return { steps: remaining, activeStepId: nextActive };
        });

        await Promise.all(
          normalized
            .filter((step) => !step.pending_delete)
            .map((step) =>
              fetch(`/api/forms/${formId}/steps`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: step.id,
                  step_order: step.step_order,
                  title: step.title,
                }),
              }),
            ),
        );
      } else if (result.pending_delete) {
        const next = state.steps.map((st) =>
          st.id === stepId ? { ...st, pending_delete: true } : st,
        );
        const normalized = normalizeWorkingSteps(next);

        setState((s) => {
          const steps = normalized;
          const nextActive =
            s.activeStepId === stepId
              ? (steps.find((st) => !st.pending_delete)?.id ??
                steps[0]?.id ??
                "")
              : s.activeStepId;
          return { steps, activeStepId: nextActive };
        });

        await Promise.all(
          normalized
            .filter((step) => !step.pending_delete)
            .map((step) =>
              fetch(`/api/forms/${formId}/steps`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: step.id,
                  step_order: step.step_order,
                  title: step.title,
                }),
              }),
            ),
        );
      }
    },
    [state.steps],
  );

  const reorderSteps = useCallback(
    async (formId: string, orderedStepIds: string[]) => {
      const buildReorderedSteps = (
        steps: (FormStep & { fields: FormField[] })[],
      ) => {
        const byId = new Map(steps.map((step) => [step.id, step]));
        const orderedSet = new Set(orderedStepIds);

        const orderedActive = orderedStepIds
          .map((id) => byId.get(id))
          .filter((step): step is FormStep & { fields: FormField[] } =>
            Boolean(step && !step.pending_delete),
          );

        const remainingActive = steps
          .filter((step) => !step.pending_delete && !orderedSet.has(step.id))
          .sort((a, b) => a.step_order - b.step_order);

        const active = [...orderedActive, ...remainingActive].map(
          (step, index) => ({
            ...step,
            step_order: index,
            title: isAutoStepTitle(step.title)
              ? `Step ${index + 1}`
              : step.title,
          }),
        );

        const pending = steps
          .filter((step) => step.pending_delete)
          .sort((a, b) => a.step_order - b.step_order);

        return [...active, ...pending];
      };

      setState((s) => {
        return {
          ...s,
          steps: buildReorderedSteps(s.steps),
        };
      });

      const normalized = buildReorderedSteps(state.steps);

      await Promise.all(
        normalized
          .filter((step) => !step.pending_delete)
          .map((step) =>
            fetch(`/api/forms/${formId}/steps`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: step.id,
                step_order: step.step_order,
                title: step.title,
              }),
            }),
          ),
      );
    },
    [state.steps],
  );

  const duplicateStep = useCallback(
    async (formId: string, stepId: string) => {
      const sourceStep = state.steps.find((step) => step.id === stepId);
      if (!sourceStep || sourceStep.pending_delete) return;

      const createStepRes = await fetch(`/api/forms/${formId}/steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${sourceStep.title} (copy)`,
          step_order: sourceStep.step_order + 1,
        }),
      });
      if (!createStepRes.ok) return;

      const newStep: FormStep = await createStepRes.json();
      const sourceFields = [...sourceStep.fields]
        .filter((field) => !field.pending_delete)
        .sort((a, b) => a.field_order - b.field_order);

      const duplicatedFields: FormField[] = [];
      for (const [index, sourceField] of sourceFields.entries()) {
        const res = await fetch(`/api/forms/${formId}/fields`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            step_id: newStep.id,
            field_type: sourceField.field_type,
            label: sourceField.label,
            placeholder: sourceField.placeholder,
            helper_text: sourceField.helper_text,
            is_required: sourceField.is_required,
            field_order: index,
            options: sourceField.options ? [...sourceField.options] : null,
            image_url: sourceField.image_url,
            image_alt: sourceField.image_alt,
            validation: sourceField.validation
              ? JSON.parse(JSON.stringify(sourceField.validation))
              : null,
          }),
        });

        if (res.ok) {
          const createdField: FormField = await res.json();
          duplicatedFields.push(createdField);
        }
      }

      const insertAfterIndex = state.steps.findIndex(
        (step) => step.id === stepId,
      );
      const nextSteps = [...state.steps];
      nextSteps.splice(Math.max(0, insertAfterIndex + 1), 0, {
        ...newStep,
        fields: duplicatedFields,
      });

      const normalized = normalizeWorkingSteps(nextSteps);
      setState((s) => ({
        ...s,
        steps: normalized,
        activeStepId: newStep.id,
      }));

      await Promise.all(
        normalized
          .filter((step) => !step.pending_delete)
          .map((step) =>
            fetch(`/api/forms/${formId}/steps`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: step.id,
                step_order: step.step_order,
                title: step.title,
              }),
            }),
          ),
      );
    },
    [state.steps],
  );

  // ─── Fields ──────────────────────────────────────────────────────────────

  const addField = useCallback(
    async (formId: string, stepId: string, fieldType: FieldType) => {
      const step = state.steps.find((s) => s.id === stepId);
      const maxOrder = Math.max(
        ...(step?.fields.map((f) => f.field_order) ?? []),
        -1,
      );
      const isPredefinedGroup =
        fieldType === "name_group" || fieldType === "address_group";

      const defaultLabel =
        fieldType === "image"
          ? ""
          : isPredefinedGroup
            ? PREDEFINED_TEMPLATES[fieldType as PredefinedGroupType]
                .defaultLabel
            : `New ${fieldType} field`;

      const defaultValidation =
        fieldType === "group"
          ? {
              sub_fields: [
                { id: crypto.randomUUID(), label: "", placeholder: "" },
                { id: crypto.randomUUID(), label: "", placeholder: "" },
              ],
            }
          : isPredefinedGroup
            ? {
                sub_fields: PREDEFINED_TEMPLATES[
                  fieldType as PredefinedGroupType
                ].subFields.map((sf) => ({ ...sf, id: crypto.randomUUID() })),
              }
            : null;

      const res = await fetch(`/api/forms/${formId}/fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step_id: stepId,
          field_type: fieldType,
          label: defaultLabel,
          field_order: maxOrder + 1,
          options: ["dropdown", "radio", "checkbox"].includes(fieldType)
            ? ["Option 1"]
            : fieldType === "boolean"
              ? ["Yes", "No"]
              : null,
          validation: defaultValidation,
        }),
      });
      if (!res.ok) return;
      const newField: FormField = await res.json();
      setState((s) => ({
        ...s,
        steps: s.steps.map((st) =>
          st.id === stepId ? { ...st, fields: [...st.fields, newField] } : st,
        ),
      }));
    },
    [state.steps],
  );

  const updateField = useCallback(
    async (formId: string, fieldId: string, updates: Partial<FormField>) => {
      // Optimistic update (using spread; id will be corrected below if a draft row is created)
      setState((s) => ({
        ...s,
        steps: s.steps.map((st) => ({
          ...st,
          fields: st.fields.map((f) =>
            f.id === fieldId ? { ...f, ...updates } : f,
          ),
        })),
      }));

      setSaving(true);
      const res = await fetch(`/api/forms/${formId}/fields`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: fieldId, ...updates }),
      });
      setSaving(false);
      if (!res.ok) return;
      const result: { field: FormField; replacedId?: string } =
        await res.json();
      if (result.replacedId) {
        // A new draft shadow row was created; swap the published id out for the draft id
        setState((s) => ({
          ...s,
          steps: s.steps.map((st) => ({
            ...st,
            fields: st.fields.map((f) =>
              f.id === result.replacedId ? result.field : f,
            ),
          })),
        }));
      } else {
        // In-place update — sync with server data
        setState((s) => ({
          ...s,
          steps: s.steps.map((st) => ({
            ...st,
            fields: st.fields.map((f) =>
              f.id === result.field.id ? result.field : f,
            ),
          })),
        }));
      }
    },
    [],
  );

  const deleteField = useCallback(
    async (formId: string, stepId: string, fieldId: string) => {
      const res = await fetch(
        `/api/forms/${formId}/fields?fieldId=${fieldId}`,
        { method: "DELETE" },
      );
      if (!res.ok) return;
      const result: { deleted?: true; field?: FormField; replacedId?: string } =
        await res.json();

      if (result.deleted) {
        // Hard-deleted (was a pure new draft) — remove from state
        setState((s) => ({
          ...s,
          steps: s.steps.map((st) =>
            st.id === stepId
              ? { ...st, fields: st.fields.filter((f) => f.id !== fieldId) }
              : st,
          ),
        }));
      } else if (result.field && result.replacedId) {
        // Was an edit-draft; draft removed, parent marked pending_delete.
        // Swap draft row out, replace with updated parent.
        setState((s) => ({
          ...s,
          steps: s.steps.map((st) =>
            st.id === stepId
              ? {
                  ...st,
                  fields: st.fields.map((f) =>
                    f.id === result.replacedId ? result.field! : f,
                  ),
                }
              : st,
          ),
        }));
      } else if (result.field) {
        // Published field now marked pending_delete
        setState((s) => ({
          ...s,
          steps: s.steps.map((st) =>
            st.id === stepId
              ? {
                  ...st,
                  fields: st.fields.map((f) =>
                    f.id === result.field!.id ? result.field! : f,
                  ),
                }
              : st,
          ),
        }));
      }
    },
    [],
  );

  const moveField = useCallback(
    async (
      formId: string,
      stepId: string,
      fieldId: string,
      direction: "up" | "down",
    ) => {
      const step = state.steps.find((s) => s.id === stepId);
      if (!step) return;
      const idx = step.fields.findIndex((f) => f.id === fieldId);
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= step.fields.length) return;

      const reordered = [...step.fields];
      [reordered[idx], reordered[targetIdx]] = [
        reordered[targetIdx],
        reordered[idx],
      ];
      const withNewOrder = reordered.map((f, i) => ({ ...f, field_order: i }));

      setState((s) => ({
        ...s,
        steps: s.steps.map((st) =>
          st.id === stepId ? { ...st, fields: withNewOrder } : st,
        ),
      }));

      // Persist new orders
      await Promise.all(
        withNewOrder.map((f) =>
          fetch(`/api/forms/${formId}/fields`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: f.id, field_order: f.field_order }),
          }),
        ),
      );
    },
    [state.steps],
  );

  /** Reorder by providing the new sorted array of field ids for a step */
  const reorderFields = useCallback(
    async (formId: string, stepId: string, orderedFieldIds: string[]) => {
      setState((s) => ({
        ...s,
        steps: s.steps.map((st) => {
          if (st.id !== stepId) return st;
          const sorted = orderedFieldIds
            .map((id) => st.fields.find((f) => f.id === id))
            .filter(Boolean) as FormField[];
          const withNewOrder = sorted.map((f, i) => ({
            ...f,
            field_order: i,
          }));
          return { ...st, fields: withNewOrder };
        }),
      }));

      await Promise.all(
        orderedFieldIds.map((id, i) =>
          fetch(`/api/forms/${formId}/fields`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, field_order: i }),
          }),
        ),
      );
    },
    [],
  );

  const duplicateField = useCallback(
    async (formId: string, stepId: string, fieldId: string) => {
      const step = state.steps.find((s) => s.id === stepId);
      if (!step) return;
      const source = step.fields.find((f) => f.id === fieldId);
      if (!source) return;

      const maxOrder = Math.max(...step.fields.map((f) => f.field_order), -1);

      // Create new field with same content
      const res = await fetch(`/api/forms/${formId}/fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step_id: stepId,
          field_type: source.field_type,
          label: source.label ? `${source.label} (copy)` : null,
          placeholder: source.placeholder,
          helper_text: source.helper_text,
          is_required: source.is_required,
          options: source.options ? [...source.options] : null,
          image_url: source.image_url,
          image_alt: source.image_alt,
          validation: source.validation
            ? JSON.parse(JSON.stringify(source.validation))
            : null,
          field_order: maxOrder + 1,
        }),
      });
      if (!res.ok) return;
      const newField: FormField = await res.json();

      // Insert newField right after the source in the array, then reorder
      setState((s) => ({
        ...s,
        steps: s.steps.map((st) => {
          if (st.id !== stepId) return st;
          const srcIdx = st.fields.findIndex((f) => f.id === fieldId);
          const inserted = [
            ...st.fields.slice(0, srcIdx + 1),
            newField,
            ...st.fields.slice(srcIdx + 1),
          ];
          const reordered = inserted.map((f, i) => ({ ...f, field_order: i }));
          return { ...st, fields: reordered };
        }),
      }));

      // Persist new orders for all fields in the step (except the brand-new one which was already saved with a temp order)
      const updatedStep = state.steps.find((s) => s.id === stepId);
      if (updatedStep) {
        const srcIdx = updatedStep.fields.findIndex((f) => f.id === fieldId);
        const inserted = [
          ...updatedStep.fields.slice(0, srcIdx + 1),
          newField,
          ...updatedStep.fields.slice(srcIdx + 1),
        ];
        await Promise.all(
          inserted.map((f, i) =>
            fetch(`/api/forms/${formId}/fields`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: f.id, field_order: i }),
            }),
          ),
        );
      }
    },
    [state.steps],
  );

  const restoreField = useCallback(
    async (formId: string, stepId: string, fieldId: string) => {
      const res = await fetch(`/api/forms/${formId}/fields`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: fieldId, pending_delete: false }),
      });
      if (!res.ok) return;
      const { field }: { field: FormField } = await res.json();
      setState((s) => ({
        ...s,
        steps: s.steps.map((st) =>
          st.id === stepId
            ? {
                ...st,
                fields: st.fields.map((f) => (f.id === fieldId ? field : f)),
              }
            : st,
        ),
      }));
    },
    [],
  );

  const restoreStep = useCallback(
    async (formId: string, stepId: string) => {
      const res = await fetch(`/api/forms/${formId}/steps`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: stepId, pending_delete: false }),
      });
      if (!res.ok) return;
      const step: FormStep = await res.json();
      const updated = state.steps.map((st) =>
        st.id === stepId ? { ...st, ...step } : st,
      );
      const normalized = normalizeWorkingSteps(updated);
      setState((s) => ({
        ...s,
        steps: normalized,
        activeStepId: stepId,
      }));

      await Promise.all(
        normalized
          .filter((currentStep) => !currentStep.pending_delete)
          .map((currentStep) =>
            fetch(`/api/forms/${formId}/steps`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: currentStep.id,
                step_order: currentStep.step_order,
                title: currentStep.title,
              }),
            }),
          ),
      );
    },
    [state.steps],
  );

  return {
    steps: state.steps,
    activeStepId: state.activeStepId,
    saving,
    setActiveStep,
    addStep,
    renameStep,
    deleteStep,
    duplicateStep,
    addField,
    updateField,
    deleteField,
    duplicateField,
    moveField,
    reorderFields,
    reorderSteps,
    restoreField,
    restoreStep,
  };
}
