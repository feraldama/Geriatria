"use client";

import * as React from "react";
import { Button } from "./button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Diálogo de confirmación accesible (role="alertdialog", aria-modal). Cierra
 * con Escape, enfoca el botón de cancelar al abrir y aísla el fondo con un
 * scrim. Se usa para acciones destructivas como dar de baja un paciente.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive,
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  // Ids por instancia: dos diálogos montados a la vez no pueden compartirlos.
  const baseId = React.useId();
  const titleId = `${baseId}-title`;
  const descId = `${baseId}-desc`;

  // onCancel suele llegar como arrow inline: guardarla en una ref evita que el
  // efecto se reejecute en cada render del padre y vuelva a mover el foco.
  const onCancelRef = React.useRef(onCancel);
  React.useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  const loadingRef = React.useRef(loading);
  React.useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  React.useEffect(() => {
    if (!open) return;

    // Recordamos el elemento enfocado para restaurarlo al cerrar, y bloqueamos
    // el scroll del fondo mientras el diálogo está abierto.
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loadingRef.current) {
        onCancelRef.current();
        return;
      }
      // Trampa de foco: Tab cicla solo entre los elementos del diálogo.
      if (e.key === "Tab") {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled])",
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
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
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      // Scrim al 50% para aislar el contenido de fondo.
      role="presentation"
      onClick={() => !loading && onCancel()}
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="relative w-full max-w-md animate-fade-in rounded-lg border border-border bg-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="font-heading text-lg font-semibold">
          {title}
        </h2>
        {description && (
          <p id={descId} className="mt-2 text-muted-foreground">
            {description}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <Button ref={cancelRef} variant="outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
