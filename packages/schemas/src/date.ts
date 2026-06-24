/**
 * Helper central de formato de fechas.
 *
 * Regla del proyecto: el usuario SIEMPRE ve e ingresa fechas en `dd/mm/aaaa`
 * (y `dd/mm/aaaa HH:mm` con hora, 24h). Internamente se almacenan en UTC/ISO
 * en Postgres. Aquí se centraliza la conversión de presentación para no
 * repetir lógica en toda la app.
 */
import { format, parse, isValid } from "date-fns";
import { es } from "date-fns/locale";

export const DATE_FORMAT = "dd/MM/yyyy";
export const DATE_TIME_FORMAT = "dd/MM/yyyy HH:mm";

/** Formatea una fecha a `dd/mm/aaaa`. Devuelve "" si la entrada es inválida. */
export function formatDate(value: Date | string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const date = value instanceof Date ? value : new Date(value);
  if (!isValid(date)) return "";
  return format(date, DATE_FORMAT, { locale: es });
}

/** Formatea una fecha con hora a `dd/mm/aaaa HH:mm`. Devuelve "" si es inválida. */
export function formatDateTime(value: Date | string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const date = value instanceof Date ? value : new Date(value);
  if (!isValid(date)) return "";
  return format(date, DATE_TIME_FORMAT, { locale: es });
}

/**
 * Parsea un string `dd/mm/aaaa` (o `dd/mm/aaaa HH:mm`) a Date.
 * Devuelve null si no se pudo parsear. Útil al recibir entrada del usuario.
 */
export function parseDate(input: string): Date | null {
  if (!input) return null;
  const trimmed = input.trim();
  const pattern = trimmed.includes(":") ? DATE_TIME_FORMAT : DATE_FORMAT;
  const parsed = parse(trimmed, pattern, new Date(), { locale: es });
  return isValid(parsed) ? parsed : null;
}

/** Calcula la edad en años a partir de la fecha de nacimiento. */
export function calculateAge(birthDate: Date | string, reference: Date = new Date()): number {
  const birth = birthDate instanceof Date ? birthDate : new Date(birthDate);
  if (!isValid(birth)) return 0;
  let age = reference.getFullYear() - birth.getFullYear();
  const monthDiff = reference.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}
