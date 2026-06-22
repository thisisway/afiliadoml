import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "success" | "warning" | "danger" | "info" | "basic";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

const variantClass: Record<Variant, string> = {
  primary: "badge-primary",
  success: "badge-success",
  warning: "badge-warning",
  danger:  "badge-danger",
  info:    "badge-info",
  basic:   "badge-basic",
};

export function Badge({ variant = "basic", className, ...props }: BadgeProps) {
  return (
    <span className={cn("badge", variantClass[variant], className)} {...props} />
  );
}
