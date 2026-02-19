"use client";

import { useState, useCallback } from "react";
import type { FormField, FormStep, FieldType } from "@/lib/types";

interface BuilderState {
  steps: (FormStep & { fields: FormField[] })[];
  activeStepId: string;
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
      const maxOrder = Math.max(...state.steps.map((s) => s.step_order), -1);
      const res = await fetch(`/api/forms/${formId}/steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Step ${state.steps.length + 1}`,
          step_order: maxOrder + 1,
        }),
      });
      if (!res.ok) return;
      const newStep: FormStep = await res.json();
      setState((s) => ({
        steps: [...s.steps, { ...newStep, fields: [] }],
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
        setState((s) => {
          const remaining = s.steps.filter((st) => st.id !== stepId);
          const nextActive =
            s.activeStepId === stepId
              ? (remaining.find((st) => !st.pending_delete)?.id ??
                remaining[0]?.id ??
                "")
              : s.activeStepId;
          return { steps: remaining, activeStepId: nextActive };
        });
      } else if (result.pending_delete) {
        setState((s) => {
          const steps = s.steps.map((st) =>
            st.id === stepId ? { ...st, pending_delete: true } : st,
          );
          const nextActive =
            s.activeStepId === stepId
              ? (steps.find((st) => !st.pending_delete)?.id ??
                steps[0]?.id ??
                "")
              : s.activeStepId;
          return { steps, activeStepId: nextActive };
        });
      }
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
      const defaultLabel =
        fieldType === "image" ? "" : `New ${fieldType} field`;

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
            : null,
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

  const restoreStep = useCallback(async (formId: string, stepId: string) => {
    const res = await fetch(`/api/forms/${formId}/steps`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: stepId, pending_delete: false }),
    });
    if (!res.ok) return;
    const step: FormStep = await res.json();
    setState((s) => ({
      ...s,
      steps: s.steps.map((st) => (st.id === stepId ? { ...st, ...step } : st)),
      activeStepId: stepId,
    }));
  }, []);

  return {
    steps: state.steps,
    activeStepId: state.activeStepId,
    saving,
    setActiveStep,
    addStep,
    renameStep,
    deleteStep,
    addField,
    updateField,
    deleteField,
    moveField,
    reorderFields,
    restoreField,
    restoreStep,
  };
}
