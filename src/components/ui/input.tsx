import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-xl px-4 text-sm text-[#002A30]",
        "bg-white/55 backdrop-blur-md",
        "border border-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]",
        "placeholder:text-[#706C63]/70",
        "focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent focus:bg-white/75",
        "transition-all duration-150",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "dark:bg-white/5 dark:border-white/10 dark:text-[#F0EAE1] dark:placeholder:text-[#A1AD97]/60 dark:focus:bg-white/10",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
