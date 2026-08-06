"use client";

import * as React from "react";

/**
 * Avisa antes de perder cambios no guardados.
 *
 * Los formularios clínicos son largos (una consulta puede llevar veinte
 * minutos de escritura): cerrar la pestaña o navegar por error sin advertencia
 * significa reescribir todo.
 *
 * Cubre el cierre/recarga de la pestaña (`beforeunload`) y los clics en enlaces
 * internos. La navegación programática del App Router no se puede interceptar,
 * así que los formularios deben confirmar explícitamente antes de llamar a
 * `router.push` (ver `confirmDiscard`).
 */
export function useUnsavedChanges(isDirty: boolean): void {
  React.useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Los navegadores modernos ignoran el texto y muestran su propio mensaje.
      e.returnValue = "";
    };

    const handleClick = (e: MouseEvent) => {
      // Solo clic principal sin modificadores: Ctrl/Cmd+clic abre otra pestaña
      // y no pierde nada.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as HTMLElement | null)?.closest("a");
      if (!link) return;

      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || link.target === "_blank") return;

      if (!confirmDiscard()) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    // En fase de captura, para adelantarnos al router de Next.
    document.addEventListener("click", handleClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
    };
  }, [isDirty]);
}

/** Confirmación estándar antes de descartar cambios sin guardar. */
export function confirmDiscard(): boolean {
  return window.confirm("Hay cambios sin guardar. ¿Querés descartarlos?");
}
