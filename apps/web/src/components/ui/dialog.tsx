"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "./button";

interface DialogProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Ancho máximo del panel (clase Tailwind). */
  maxWidth?: string;
  /**
   * Si el clic en el fondo cierra el diálogo. Para formularios con datos sin
   * guardar conviene `false` (evita perder lo cargado por un clic accidental).
   */
  closeOnBackdrop?: boolean;
}

/**
 * Modal accesible y reutilizable: role="dialog", aria-modal, trampa de foco,
 * restauración de foco al cerrar, bloqueo de scroll del fondo y cierre con
 * Escape o clic en el fondo. El contenido del formulario va como children.
 */
export function Dialog({
  open,
  title,
  description,
  onClose,
  children,
  maxWidth = "max-w-2xl",
  closeOnBackdrop = true,
}: DialogProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Enfocamos el primer elemento enfocable del panel.
    const focusFirst = () => {
      const f = panelRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      f?.focus();
    };
    focusFirst();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const nodes = panelRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (!nodes || nodes.length === 0) return;
        const first = nodes[0]!;
        const last = nodes[nodes.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center"
      role="presentation"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={description ? "dialog-desc" : undefined}
        className={`relative my-4 w-full ${maxWidth} animate-fade-in rounded-lg border border-border bg-card shadow-lg`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 id="dialog-title" className="font-heading text-lg font-semibold">
              {title}
            </h2>
            {description && (
              <p id="dialog-desc" className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
            <X className="h-5 w-5" aria-hidden />
          </Button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
