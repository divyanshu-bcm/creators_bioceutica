"use client";

import { useRef, useEffect, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Ordered list of available font sizes (px)
const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48];

/** Walk up the DOM to find the computed font-size of the element, stopping at `editor`. */
function getComputedFontSize(el: Element | null, editor: HTMLElement): number {
  while (el && el !== editor) {
    const fs = parseFloat(window.getComputedStyle(el).fontSize);
    if (fs) return fs;
    el = el.parentElement;
  }
  // Fall back to the editor's own computed size (usually the browser default 16px)
  return parseFloat(window.getComputedStyle(editor).fontSize) || 16;
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Type here…",
  minHeight = 140,
  className,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  // Keep a ref so we can guard against external-update loops
  const lastEmittedRef = useRef<string>(value ?? "");

  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    alignLeft: true,
    alignCenter: false,
    alignRight: false,
  });
  const [isEmpty, setIsEmpty] = useState(() => !value || value.trim() === "");

  // ── Initialise innerHTML exactly once on mount ────────────────────────────
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = value ?? "";
      lastEmittedRef.current = value ?? "";
      checkEmpty(value ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync when the parent drives a value reset (e.g. switching fields) ─────
  useEffect(() => {
    if (!editorRef.current) return;
    if (value !== lastEmittedRef.current) {
      editorRef.current.innerHTML = value ?? "";
      lastEmittedRef.current = value ?? "";
      checkEmpty(value ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function checkEmpty(html: string) {
    // contentEditable puts a lone <br> when the user clears everything
    const stripped = html.replace(/<br\s*\/?>/gi, "").trim();
    setIsEmpty(stripped === "");
  }

  // ── Emit change upward ────────────────────────────────────────────────────
  function emitChange() {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    lastEmittedRef.current = html;
    checkEmpty(html);
    const stripped = html.replace(/<br\s*\/?>/gi, "").trim();
    onChange(stripped === "" ? "" : html);
  }

  // ── Update toolbar active-state ───────────────────────────────────────────
  function updateFormatState() {
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      alignLeft: document.queryCommandState("justifyLeft"),
      alignCenter: document.queryCommandState("justifyCenter"),
      alignRight: document.queryCommandState("justifyRight"),
    });
  }

  // ── Execute a simple execCommand and re-emit ──────────────────────────────
  function execFormat(command: string, val?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, val ?? undefined);
    updateFormatState();
    emitChange();
  }

  // ── Font-size: wrap the selection in a <span style="font-size:Xpx"> ──────
  function handleFontSize(increase: boolean) {
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (range.collapsed) return; // Nothing selected — nothing to resize

    const container = range.startContainer;
    const el =
      container.nodeType === Node.TEXT_NODE
        ? container.parentElement
        : (container as Element);

    const currentSize = editorRef.current
      ? getComputedFontSize(el, editorRef.current)
      : 16;

    // Find the closest size in our list
    const bestIdx = FONT_SIZES.reduce(
      (best, sz, i) =>
        Math.abs(sz - currentSize) < Math.abs(FONT_SIZES[best] - currentSize)
          ? i
          : best,
      0,
    );
    const newIdx = increase
      ? Math.min(bestIdx + 1, FONT_SIZES.length - 1)
      : Math.max(bestIdx - 1, 0);
    const newSize = FONT_SIZES[newIdx];

    // Unwrap any directly-wrapping <span style="font-size"> to avoid nesting
    const fragment = range.extractContents();
    const span = document.createElement("span");
    span.style.fontSize = `${newSize}px`;
    span.appendChild(fragment);
    range.insertNode(span);

    // Re-select the inserted span so the user can keep pressing ± to resize
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    selection.removeAllRanges();
    selection.addRange(newRange);

    emitChange();
  }

  return (
    <div
      className={cn(
        "rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900",
        className,
      )}
    >
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-0.5 p-1.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex-wrap">
        {/* Bold */}
        <ToolbarBtn
          active={activeFormats.bold}
          onClick={() => execFormat("bold")}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarBtn>

        {/* Italic */}
        <ToolbarBtn
          active={activeFormats.italic}
          onClick={() => execFormat("italic")}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarBtn>

        {/* Underline */}
        <ToolbarBtn
          active={activeFormats.underline}
          onClick={() => execFormat("underline")}
          title="Underline (Ctrl+U)"
        >
          <Underline className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-0.5 shrink-0" />

        {/* Font size decrease */}
        <ToolbarBtn
          onClick={() => handleFontSize(false)}
          title="Decrease font size (select text first)"
        >
          <span className="text-[11px] font-bold leading-none select-none">
            A−
          </span>
        </ToolbarBtn>

        {/* Font size increase */}
        <ToolbarBtn
          onClick={() => handleFontSize(true)}
          title="Increase font size (select text first)"
        >
          <span className="text-sm font-bold leading-none select-none">A+</span>
        </ToolbarBtn>

        <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-0.5 shrink-0" />

        {/* Align left */}
        <ToolbarBtn
          active={activeFormats.alignLeft}
          onClick={() => execFormat("justifyLeft")}
          title="Align left"
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolbarBtn>

        {/* Align centre */}
        <ToolbarBtn
          active={activeFormats.alignCenter}
          onClick={() => execFormat("justifyCenter")}
          title="Align centre"
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolbarBtn>

        {/* Align right */}
        <ToolbarBtn
          active={activeFormats.alignRight}
          onClick={() => execFormat("justifyRight")}
          title="Align right"
        >
          <AlignRight className="h-3.5 w-3.5" />
        </ToolbarBtn>
      </div>

      {/* ── Editable area ── */}
      <div className="relative">
        {/* Placeholder */}
        {isEmpty && (
          <div
            className="absolute top-0 left-0 pt-2.5 px-3 text-slate-400 dark:text-slate-500 text-sm pointer-events-none select-none leading-relaxed"
            aria-hidden
          >
            {placeholder}
          </div>
        )}

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          onInput={() => {
            updateFormatState();
            emitChange();
          }}
          onKeyUp={updateFormatState}
          onMouseUp={updateFormatState}
          onSelect={updateFormatState}
          onFocus={updateFormatState}
          className="outline-none p-3 text-sm text-slate-800 dark:text-slate-200 leading-relaxed"
          style={{ minHeight }}
          spellCheck
        />
      </div>
    </div>
  );
}

// ─── Toolbar button ───────────────────────────────────────────────────────────

interface ToolbarBtnProps {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title?: string;
}

function ToolbarBtn({ children, onClick, active, title }: ToolbarBtnProps) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        // Prevent the editor from losing focus when clicking toolbar buttons
        e.preventDefault();
        onClick();
      }}
      className={cn(
        "p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-600 dark:text-slate-300",
        active &&
          "bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-slate-100",
      )}
    >
      {children}
    </button>
  );
}
