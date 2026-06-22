import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Status = "default" | "success" | "warning" | "danger";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  status?: Status;
  label?: string;
  hint?: string;
}

const statusClass: Record<Status, string> = {
  default: "",
  success: "input-success",
  warning: "input-warning",
  danger:  "input-danger",
};

const hintColor: Record<Status, string> = {
  default: "text-basic-600",
  success: "text-success-700",
  warning: "text-warning-700",
  danger:  "text-danger-700",
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ status = "default", label, hint, className, id, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-basic-700 uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={cn("input", statusClass[status], className)}
        {...props}
      />
      {hint && <p className={cn("text-xs", hintColor[status])}>{hint}</p>}
    </div>
  )
);
Input.displayName = "Input";
