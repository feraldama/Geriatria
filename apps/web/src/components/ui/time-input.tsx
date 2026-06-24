import * as React from "react";
import { cn } from "@/lib/utils";

interface TimeInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  className?: string;
  "aria-describedby"?: string;
}

/**
 * Campo de hora `HH:mm` (24h). Inserta los dos puntos automáticamente.
 * Componente controlado (se usa con Controller de react-hook-form).
 */
function formatAsTime(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export const TimeInput = React.forwardRef<HTMLInputElement, TimeInputProps>(
  ({ id, value, onChange, onBlur, invalid, className, ...rest }, ref) => (
    <input
      ref={ref}
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="HH:mm"
      value={value}
      aria-invalid={invalid || undefined}
      onChange={(e) => onChange(formatAsTime(e.target.value))}
      onBlur={onBlur}
      className={cn(
        "flex min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base text-foreground tabular-nums",
        "placeholder:text-muted-foreground transition-colors",
        "focus-visible:outline-none focus-visible:border-primary",
        "aria-[invalid=true]:border-destructive",
        className,
      )}
      {...rest}
    />
  ),
);
TimeInput.displayName = "TimeInput";
