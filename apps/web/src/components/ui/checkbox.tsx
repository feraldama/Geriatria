import * as React from "react";
import { cn } from "@/lib/utils";

interface CheckboxFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

/** Checkbox con etiqueta clickeable (área táctil cómoda). Compatible con RHF. */
export const CheckboxField = React.forwardRef<HTMLInputElement, CheckboxFieldProps>(
  ({ label, className, id, ...props }, ref) => (
    <label
      htmlFor={id}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center gap-2 text-base",
        className,
      )}
    >
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className="h-5 w-5 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
        {...props}
      />
      {label}
    </label>
  ),
);
CheckboxField.displayName = "CheckboxField";
