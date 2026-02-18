"use client";

import { useCallback } from "react";
import type { FormProgressState } from "@/lib/types";

const STORAGE_KEY = (slug: string) => `form_progress_${slug}`;

export function useStepProgress(slug: string) {
  const load = useCallback((): FormProgressState | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY(slug));
      return raw ? (JSON.parse(raw) as FormProgressState) : null;
    } catch {
      return null;
    }
  }, [slug]);

  const save = useCallback(
    (state: FormProgressState) => {
      if (typeof window === "undefined") return;
      sessionStorage.setItem(
        STORAGE_KEY(slug),
        JSON.stringify({ ...state, lastSaved: new Date().toISOString() }),
      );
    },
    [slug],
  );

  const clear = useCallback(() => {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(STORAGE_KEY(slug));
  }, [slug]);

  return { load, save, clear };
}
