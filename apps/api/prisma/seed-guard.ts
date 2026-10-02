/**
 * Guarda para TODOS los seeds (el inicial y los de datos ficticios).
 *
 * Los seeds borran registros para ser idempotentes. Correrlos por error
 * contra la base de la clínica destruiría datos reales, así que se niegan a
 * ejecutarse en producción.
 */
export function assertNotProduction(): void {
  if (process.env.NODE_ENV === "production" || process.env.ALLOW_DEMO_SEED === "never") {
    throw new Error(
      "Los seeds no se ejecutan en producción: borran registros existentes.",
    );
  }
}
