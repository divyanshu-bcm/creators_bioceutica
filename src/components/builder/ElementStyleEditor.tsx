"use client";

import { useState } from "react";
import type { ElementColorStyle } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Palette, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ElementStyleEditorProps {
  value?: ElementColorStyle;
  onChange: (value: ElementColorStyle | undefined) => void;
  title?: string;
  className?: string;
}

const DEFAULT_SWATCH = {
  text_color: "#0f172a",
  background_color: "#ffffff",
  border_color: "#cbd5e1",
} as const;

type ColorKey = keyof ElementColorStyle;

function hasAnyStyle(style?: ElementColorStyle) {
  return !!(
    style?.text_color ||
    style?.background_color ||
    style?.border_color
  );
}

export function ElementStyleEditor({
  value,
  onChange,
  title = "Colors",
  className,
}: ElementStyleEditorProps) {
  const [open, setOpen] = useState(false);

  function updateColor(key: ColorKey, next: string) {
    const merged: ElementColorStyle = {
      ...(value ?? {}),
      [key]: next,
    };
    onChange(hasAnyStyle(merged) ? merged : undefined);
  }

  function clearColor(key: ColorKey) {
    const merged: ElementColorStyle = {
      ...(value ?? {}),
    };
    delete merged[key];
    onChange(hasAnyStyle(merged) ? merged : undefined);
  }

  function resetAll() {
    onChange(undefined);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-xs text-slate-500 uppercase tracking-wide">
          {title}
        </Label>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            "h-7 w-7",
            hasAnyStyle(value) && "border-violet-400 text-violet-700",
          )}
          onClick={() => setOpen((v) => !v)}
          title="Customize colors"
        >
          <Palette className="h-3.5 w-3.5" />
        </Button>
      </div>

      {open && (
        <div className="rounded-md border border-slate-200 dark:border-slate-700 p-3 space-y-3 bg-slate-50/60 dark:bg-slate-900/40">
          <ColorRow
            label="Text"
            value={value?.text_color ?? DEFAULT_SWATCH.text_color}
            active={!!value?.text_color}
            onSelect={(v) => updateColor("text_color", v)}
            onClear={() => clearColor("text_color")}
          />
          <ColorRow
            label="Background"
            value={value?.background_color ?? DEFAULT_SWATCH.background_color}
            active={!!value?.background_color}
            onSelect={(v) => updateColor("background_color", v)}
            onClear={() => clearColor("background_color")}
          />
          <ColorRow
            label="Border"
            value={value?.border_color ?? DEFAULT_SWATCH.border_color}
            active={!!value?.border_color}
            onSelect={(v) => updateColor("border_color", v)}
            onClear={() => clearColor("border_color")}
          />

          <div className="pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={resetAll}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset to default
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface ColorRowProps {
  label: string;
  value: string;
  active: boolean;
  onSelect: (value: string) => void;
  onClear: () => void;
}

function ColorRow({ label, value, active, onSelect, onClear }: ColorRowProps) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs text-slate-600 dark:text-slate-300 w-20">
        {label}
      </Label>
      <Input
        type="color"
        value={value}
        onChange={(e) => onSelect(e.target.value)}
        className="h-8 w-10 p-1 cursor-pointer"
      />
      <span className="text-xs text-slate-500 uppercase min-w-16">{value}</span>
      {active && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={onClear}
        >
          Reset
        </Button>
      )}
    </div>
  );
}
