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

/** Patrón de fecha `dd/mm/aaaa` (validación rápida de formato). */
export const DATE_PATTERN = /^\d{2}\/\d{2}\/\d{4}$/;

/** ¿El string es una fecha `dd/mm/aaaa` válida y real (no 31/02)? */
export function isValidDateString(input: string): boolean {
  if (!DATE_PATTERN.test(input.trim())) return false;
  return parseDate(input) !== null;
}

/** Convierte un string `dd/mm/aaaa` a ISO (UTC) para enviar al backend. */
export function dateStringToISO(input: string): string | null {
  const d = parseDate(input);
  return d ? d.toISOString() : null;
}

/** Patrón de hora `HH:mm` (24h). */
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** ¿El string es una hora `HH:mm` válida (24h)? */
export function isValidTimeString(input: string): boolean {
  return TIME_PATTERN.test(input.trim());
}

/** Formatea solo la hora `HH:mm` (24h) de una fecha. */
export function formatTime(value: Date | string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const date = value instanceof Date ? value : new Date(value);
  if (!isValid(date)) return "";
  return format(date, "HH:mm", { locale: es });
}

/**
 * Combina una fecha `dd/mm/aaaa` y una hora `HH:mm` en un Date (hora local).
 * Devuelve null si alguno es inválido.
 */
export function combineDateTime(dateStr: string, timeStr: string): Date | null {
  if (!isValidTimeString(timeStr)) return null;
  const base = parseDate(dateStr);
  if (!base) return null;
  const parts = timeStr.split(":");
  base.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
  return base;
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
