import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "success" | "destructive" | "outline" | "warning" | "info";
}

const variantClasses: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-[#003D45] text-[#F0EAE1] dark:bg-[#A1AD97] dark:text-[#002A30]",
  secondary: "bg-[#F0EAE1] text-[#003D45] border border-[#E5DCCF] dark:bg-white/8 dark:text-[#BEC5BA] dark:border-white/10",
  success: "bg-[#E8F5EE] text-[#1B6B3D] border border-[#C8E6D2]",
  warning: "bg-[#FFF8E8] text-[#A37308] border border-[#F4E5B8]",
  destructive: "bg-[#FEF0EE] text-[#A82E22] border border-[#F8D2CE]",
  info: "bg-[#EBF4F5] text-[#003D45] border border-[#CCE2E5]",
  outline: "border border-[#003D45]/30 text-[#003D45] bg-white/30 backdrop-blur-sm dark:border-[#A1AD97]/40 dark:text-[#A1AD97]",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
