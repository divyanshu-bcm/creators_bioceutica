import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "success" | "destructive" | "outline";
}

const variantClasses: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
  secondary:
    "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
  success:
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  destructive: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  outline:
    "border border-slate-300 text-slate-700 bg-transparent dark:border-slate-600 dark:text-slate-300",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
