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

/**
 * Desfase (en ms) de la zona de la clínica respecto de UTC en un instante dado.
 * Se calcula leyendo el reloj de pared en esa zona y comparándolo con el
 * instante real, así que contempla cualquier cambio de horario de verano.
 */
function clinicOffsetMs(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CLINIC_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const hour = get("hour") === 24 ? 0 : get("hour");
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), hour, get("minute"), get("second"));
  return asUtc - date.getTime();
}

/**
 * Construye el instante real que corresponde a una hora de pared de la clínica.
 *
 * Es la operación inversa a `formatDate`/`formatTime`: "15/03/2026 09:00 en la
 * clínica" es un instante único, sin importar dónde esté el navegador que lo
 * ingresó. Sin esto, un usuario fuera de Paraguay agenda a otra hora real.
 */
export function clinicWallClockToDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const firstOffset = clinicOffsetMs(new Date(guess));
  let result = guess - firstOffset;
  // Segunda pasada: en un cambio de horario, el desfase del instante estimado
  // puede diferir del real.
  const secondOffset = clinicOffsetMs(new Date(result));
  if (secondOffset !== firstOffset) result = guess - secondOffset;
  return new Date(result);
}

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
 * Parsea un string `dd/mm/aaaa` (o `dd/mm/aaaa HH:mm`) al instante que le
 * corresponde en la zona de la clínica. Devuelve null si no se pudo parsear.
 *
 * Se interpreta en hora de la clínica —no la del navegador— para que
 * `formatDate(parseDate(x)) === x` en cualquier equipo: de lo contrario, un
 * usuario en otro huso vería la fecha de nacimiento corrida un día.
 */
export function parseDate(input: string): Date | null {
  if (!input) return null;
  const trimmed = input.trim();
  const pattern = trimmed.includes(":") ? DATE_TIME_FORMAT : DATE_FORMAT;
  // date-fns valida que la fecha exista de verdad (rechaza 31/02).
  const parsed = parse(trimmed, pattern, new Date(), { locale: es });
  if (!isValid(parsed)) return null;
  return clinicWallClockToDate(
    parsed.getFullYear(),
    parsed.getMonth() + 1,
    parsed.getDate(),
    parsed.getHours(),
    parsed.getMinutes(),
  );
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
 * Combina una fecha `dd/mm/aaaa` y una hora `HH:mm` en el instante real que le
 * corresponde en la zona de la clínica. Devuelve null si alguno es inválido.
 */
export function combineDateTime(dateStr: string, timeStr: string): Date | null {
  if (!isValidTimeString(timeStr)) return null;
  // Se reutiliza parseDate en vez de volver a validar el formato: dos criterios
  // distintos de "fecha válida" harían que algo aceptado en un lado se
  // rechazara en el otro.
  const base = parseDate(dateStr);
  if (!base) return null;
  const parts = clinicParts(base);
  const [hour, minute] = timeStr.split(":").map(Number);
  return clinicWallClockToDate(
    Number(parts.year),
    Number(parts.month),
    Number(parts.day),
    hour!,
    minute!,
  );
}

/** Primer instante del día (hora de la clínica) al que pertenece `value`. */
export function clinicStartOfDay(value: Date): Date {
  const { day, month, year } = clinicParts(value);
  return clinicWallClockToDate(Number(year), Number(month), Number(day), 0, 0);
}

/** Primer instante del día siguiente (útil como cota superior exclusiva). */
export function clinicEndOfDay(value: Date): Date {
  return new Date(clinicStartOfDay(value).getTime() + 24 * 60 * 60_000);
}

/**
 * Clave `aaaa-mm-dd` del día de la clínica al que pertenece un instante.
 * Agrupar por esta clave da el mismo resultado en cualquier navegador.
 */
export function clinicDayKey(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!isValid(date)) return "";
  const { day, month, year } = clinicParts(date);
  return `${year}-${month}-${day}`;
}

/** ¿Dos instantes caen el mismo día en la zona de la clínica? */
export function isSameClinicDay(a: Date | string, b: Date | string): boolean {
  const keyA = clinicDayKey(a);
  return keyA !== "" && keyA === clinicDayKey(b);
}

/**
 * Calcula la edad en años. Se resuelve con el calendario de la clínica para
 * que un paciente no "cumpla años" un día antes según dónde esté el navegador.
 */
export function calculateAge(birthDate: Date | string, reference: Date = new Date()): number {
  const birth = birthDate instanceof Date ? birthDate : new Date(birthDate);
  if (!isValid(birth)) return 0;
  const b = clinicParts(birth);
  const r = clinicParts(reference);
  let age = Number(r.year) - Number(b.year);
  const monthDiff = Number(r.month) - Number(b.month);
  if (monthDiff < 0 || (monthDiff === 0 && Number(r.day) < Number(b.day))) {
    age--;
  }
  return age;
}
