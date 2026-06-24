import * as React from "react";
import { cn } from "@/lib/utils";

// Input con altura ≥44px (área táctil) y texto base 16px (evita zoom en iOS).
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base text-foreground",
        "placeholder:text-muted-foreground transition-colors",
        "focus-visible:outline-none focus-visible:border-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-destructive",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
