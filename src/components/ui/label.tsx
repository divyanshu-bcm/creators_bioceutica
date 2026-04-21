import * as React from "react";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-xs font-semibold uppercase tracking-[0.08em] text-[#4A4740] dark:text-[#BEC5BA]",
      className,
    )}
    {...props}
  />
));
Label.displayName = "Label";
