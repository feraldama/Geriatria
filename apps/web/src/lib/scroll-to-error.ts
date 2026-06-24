/**
 * Hace scroll SUAVE al primer campo inválido de un formulario y lo enfoca.
 * Se usa en el submit inválido de los formularios (reemplaza el foco-salto
 * por defecto de react-hook-form, que centra de golpe).
 *
 * Detecta el primer error por orden visual buscando `[data-field-error]`
 * (lo pone el componente Field) o `[aria-invalid="true"]`.
 */
export function scrollToFirstError(container?: HTMLElement | null): void {
  if (typeof window === "undefined") return;
  // Diferimos un tick para que el re-render ya haya marcado los errores.
  setTimeout(() => {
    // Si hay un modal abierto, el formulario activo está dentro: acotamos ahí
    // para no enfocar campos de la página que queda detrás.
    const dialog = document.querySelector<HTMLElement>('[role="dialog"], [role="alertdialog"]');
    const root: ParentNode = container ?? dialog ?? document;
    const el = root.querySelector<HTMLElement>('[data-field-error="true"], [aria-invalid="true"]');
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusable = el.matches("input, select, textarea")
      ? el
      : el.querySelector<HTMLElement>("input, select, textarea, [tabindex]");
    focusable?.focus({ preventScroll: true });
  }, 0);
}
