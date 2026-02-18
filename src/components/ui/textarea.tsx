import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900",
      "placeholder:text-slate-400 resize-none",
      "focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
