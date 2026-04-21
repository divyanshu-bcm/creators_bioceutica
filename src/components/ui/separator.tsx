import * as React from "react";
import { cn } from "@/lib/utils";

export function Separator({
  className,
  ...props
}: React.HTMLAttributes<HTMLHRElement>) {
  return (
    <hr
      className={cn(
        "border-0 h-px my-4 bg-gradient-to-r from-transparent via-[#003D45]/15 to-transparent dark:via-[#A1AD97]/15",
        className,
      )}
      {...props}
    />
  );
}
