import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "outline"
    | "ghost"
    | "destructive"
    | "secondary"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default: cn(
    "bg-[#003D45] text-white shadow-[0_8px_24px_-8px_rgba(0,61,69,0.55)]",
    "hover:bg-[#002A30] hover:shadow-[0_10px_28px_-8px_rgba(0,61,69,0.65)]",
    "dark:bg-[#A1AD97] dark:text-[#002A30] dark:hover:bg-[#BEC5BA]",
  ),
  outline: cn(
    "glass-subtle text-[#003D45]",
    "hover:bg-white/65 hover:border-white/70",
    "dark:text-[#F0EAE1] dark:hover:bg-[#14262A]/60",
  ),
  ghost:
    "bg-transparent text-[#003D45] hover:bg-[#003D45]/8 dark:text-[#F0EAE1] dark:hover:bg-white/8",
  destructive:
    "bg-[#D43D2F] text-white hover:bg-[#A82E22] shadow-[0_8px_24px_-8px_rgba(212,61,47,0.55)]",
  secondary:
    "bg-[#F0EAE1] text-[#002A30] border border-[#E5DCCF] hover:bg-[#E5DCCF] dark:bg-white/6 dark:text-[#F0EAE1] dark:border-white/10 dark:hover:bg-white/10",
  link: "text-[#003D45] underline-offset-4 hover:underline dark:text-[#A1AD97]",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  default: "h-10 px-5 text-sm",
  sm: "h-8 px-3.5 text-xs",
  lg: "h-12 px-8 text-base",
  icon: "h-9 w-9",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild = false,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight",
          "transition-all duration-200 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:ring-[var(--ring)]",
          "disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
