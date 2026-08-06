import * as React from "react";
import { Label } from "./label";

/** Atributos que Field calcula para el control que envuelve. */
export interface FieldAria {
  "aria-describedby"?: string;
  "aria-invalid"?: true | undefined;
  "aria-required"?: true | undefined;
}

interface FieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  /**
   * El control. Como función recibe los atributos ARIA para aplicarlos al
   * input real: es la forma obligatoria cuando el control va dentro de un
   * `<Controller>` de react-hook-form, porque clonar el `Controller` no llega
   * al input que este renderiza.
   */
  children: React.ReactNode | ((aria: FieldAria) => React.ReactNode);
}

/**
 * Envoltorio de campo de formulario: etiqueta visible (no placeholder-only),
 * marca de obligatorio, texto de ayuda y error debajo del campo.
 *
 * El control recibe `aria-describedby`, `aria-invalid` y `aria-required` sin
 * que cada formulario tenga que cablearlos: de lo contrario un lector de
 * pantalla no anuncia ni la ayuda ("dd/mm/aaaa"), ni el error, ni que el campo
 * es obligatorio.
 */
export function Field({ label, htmlFor, error, hint, required, className, children }: FieldProps) {
  // Los ids se derivan de un useId cuando no hay htmlFor, para que el
  // aria-describedby siempre pueda apuntar al texto de ayuda o de error.
  const autoId = React.useId();
  const base = htmlFor ?? autoId;
  const hintId = hint ? `${base}-hint` : undefined;
  const errorId = error ? `${base}-error` : undefined;

  const aria: FieldAria = {
    "aria-describedby": (error ? errorId : hintId) || undefined,
    "aria-invalid": error ? true : undefined,
    "aria-required": required ? true : undefined,
  };

  let control: React.ReactNode;
  if (typeof children === "function") {
    control = children(aria);
  } else if (React.isValidElement<FieldAria>(children)) {
    // Se respeta lo que el formulario ya haya declarado explícitamente.
    control = React.cloneElement(children, {
      "aria-describedby": children.props["aria-describedby"] ?? aria["aria-describedby"],
      "aria-invalid": children.props["aria-invalid"] ?? aria["aria-invalid"],
      "aria-required": children.props["aria-required"] ?? aria["aria-required"],
    });
  } else {
    // Varios hijos o texto suelto: no hay un control único que anotar.
    control = children;
  }

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
      {control}
      {hint && !error && (
        <p id={hintId} className="mt-1 text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        // role="alert" hace que el lector de pantalla lo anuncie al aparecer.
        <p id={errorId} role="alert" className="mt-1 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
