/**
 * Helper central de formato de fechas.
 *
 * Regla del proyecto: el usuario SIEMPRE ve e ingresa fechas en `dd/mm/aaaa`
 * (y `dd/mm/aaaa HH:mm` con hora, 24h). Internamente se almacenan en UTC/ISO
 * en Postgres. Aquí se centraliza la conversión de presentación para no
 * repetir lógica en toda la app.
 */
import { parse, isValid } from "date-fns";
import { es } from "date-fns/locale";

export const DATE_FORMAT = "dd/MM/yyyy";
export const DATE_TIME_FORMAT = "dd/MM/yyyy HH:mm";

/**
 * Zona horaria de la clínica. TODA la presentación de fechas/horas se hace en
 * esta zona, sin importar dónde esté el navegador o el servidor. Así una
 * consulta creada desde otro país (p. ej. España) muestra siempre la hora
 * de la clínica (Paraguay), igual para todos.
 */
export const CLINIC_TIME_ZONE = "America/Asuncion";

/** Extrae los componentes de fecha/hora de un instante en la zona de la clínica. */
function clinicParts(date: Date): {
  day: string;
  month: string;
  year: string;
  hour: string;
  minute: string;
} {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CLINIC_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  // Algunos motores emiten "24" a medianoche con hour12:false.
  let hour = get("hour");
  if (hour === "24") hour = "00";
  return { day: get("day"), month: get("month"), year: get("year"), hour, minute: get("minute") };
}

/** Formatea una fecha a `dd/mm/aaaa` (hora de la clínica). Devuelve "" si es inválida. */
export function formatDate(value: Date | string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const date = value instanceof Date ? value : new Date(value);
  if (!isValid(date)) return "";
  const { day, month, year } = clinicParts(date);
  return `${day}/${month}/${year}`;
}

/** Formatea una fecha con hora a `dd/mm/aaaa HH:mm` (hora de la clínica). Devuelve "" si es inválida. */
export function formatDateTime(value: Date | string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const date = value instanceof Date ? value : new Date(value);
  if (!isValid(date)) return "";
  const { day, month, year, hour, minute } = clinicParts(date);
  return `${day}/${month}/${year} ${hour}:${minute}`;
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

/** Formatea solo la hora `HH:mm` (24h, hora de la clínica) de una fecha. */
export function formatTime(value: Date | string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const date = value instanceof Date ? value : new Date(value);
  if (!isValid(date)) return "";
  const { hour, minute } = clinicParts(date);
  return `${hour}:${minute}`;
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
