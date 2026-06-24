import * as React from "react";
import { Label } from "./label";

interface FieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Envoltorio de campo de formulario: etiqueta visible (no placeholder-only),
 * marca de obligatorio, texto de ayuda y error debajo del campo, con
 * aria-describedby para lectores de pantalla.
 */
export function Field({ label, htmlFor, error, hint, required, className, children }: FieldProps) {
  const hintId = hint && htmlFor ? `${htmlFor}-hint` : undefined;
  const errorId = error && htmlFor ? `${htmlFor}-error` : undefined;
  return (
    // data-field-error marca el campo inválido para el scroll suave al enviar.
    <div className={className} data-field-error={error ? "true" : undefined}>
      <Label htmlFor={htmlFor} className="mb-1.5 block">
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden>
            *
          </span>
        )}
      </Label>
      {children}
      {hint && !error && (
        <p id={hintId} className="mt-1 text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
